import type { OperonDb } from './client';
import type { BrowserProfile, Workflow } from './schema/automation';

import { SUPABASE_SCHEMA } from '@operon/constants';

import { and, eq, gt, isNull, or } from 'drizzle-orm';

import { supabaseRequest } from './requester';
import { browserProfiles, proxies, workflows } from './schema/automation';

export * from './requester';

export interface SyncResult {
  conflicts: number;
  errors: string[];
  pushed: number;
  pulled: number;
}

export interface CloudBrowserProfile {
  cookies?: Record<string, unknown>[];
  created_at: string;
  deleted_at?: null | string;
  fingerprint?: Record<string, unknown>;
  id: string;
  is_locked?: boolean;
  name: string;
  proxy_id?: null | string;
  release_id?: null | string;
  storage_state?: Record<string, unknown>;
  template_id?: null | string;
  tenant_id: string;
  updated_at: string;
}

export interface CloudWorkflow {
  created_at: string;
  deleted_at?: null | string;
  description?: null | string;
  edges?: Record<string, unknown>[];
  id: string;
  is_active: boolean;
  name: string;
  nodes?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
  tenant_id: string;
  updated_at: string;
  version: string;
}

interface SyncableRow {
  createdAt: string;
  deletedAt: null | string;
  id: string;
  lastSyncedAt: null | string;
  tenantId: null | string;
  updatedAt: string;
}

interface CloudSyncableRow {
  created_at: string;
  deleted_at?: null | string;
  id: string;
  tenant_id: string;
  updated_at: string;
}

interface SyncableTable {
  deletedAt: any;
  id: any;
  lastSyncedAt: any;
  tenantId: any;
  updatedAt: any;
}

/**
 * Strategy contract for bidirectional offline-first entity synchronization (OCP).
 * New offline-first tables plug into the shared sync engine via an adapter descriptor.
 */
export interface EntitySyncAdapter<
  TLocal extends SyncableRow,
  TCloud extends CloudSyncableRow,
> {
  entityName: string;
  pluralLabel: string;
  restResource: string;
  schema: string;
  table: SyncableTable;
  toCloudPayload: (local: TLocal, tenantId: string) => TCloud;
  toLocalInsert: (cloud: TCloud, syncedAt: string) => Record<string, unknown>;
  toLocalUpdate: (cloud: TCloud, syncedAt: string) => Record<string, unknown>;
}

/**
 * Shared soft-delete helper for any local table with `id`, `deletedAt`, and `updatedAt`.
 */
async function softDeleteEntity(
  db: OperonDb,
  table: { deletedAt: any; id: any; updatedAt: any },
  id: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db
    .update(table as any)
    .set({ deletedAt: nowIso, updatedAt: nowIso })
    .where(eq(table.id, id));
}

/**
 * Generic push engine: pushes dirty local rows (created, updated, or soft-deleted) to Supabase Cloud.
 */
export async function pushDirtyEntitiesToCloud<
  TLocal extends SyncableRow,
  TCloud extends CloudSyncableRow,
>(
  db: OperonDb,
  tenantId: string,
  adapter: EntitySyncAdapter<TLocal, TCloud>,
): Promise<{ errors: string[]; pushed: number }> {
  const errors: string[] = [];
  let pushed = 0;
  const { entityName, pluralLabel, restResource, schema, table } = adapter;

  try {
    const dirtyRows = (await db
      .select()
      .from(table as any)
      .where(
        and(
          or(eq(table.tenantId, tenantId), isNull(table.tenantId)),
          or(
            isNull(table.lastSyncedAt),
            gt(table.updatedAt, table.lastSyncedAt),
          ),
        ),
      )) as TLocal[];

    for (const local of dirtyRows) {
      try {
        const nowIso = new Date().toISOString();

        if (local.deletedAt) {
          await supabaseRequest(
            `/rest/v1/${restResource}?id=eq.${encodeURIComponent(local.id)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
            {
              method: 'DELETE',
              schema,
            },
          );
        } else {
          const payload = adapter.toCloudPayload(local, tenantId);
          await supabaseRequest(`/rest/v1/${restResource}`, {
            body: JSON.stringify(payload),
            headers: {
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            method: 'POST',
            schema,
          });
        }

        await db
          .update(table as any)
          .set({ lastSyncedAt: nowIso, tenantId })
          .where(eq(table.id, local.id));

        pushed++;
      } catch (error: any) {
        errors.push(
          `Failed to push ${entityName} ${local.id}: ${error?.message || error}`,
        );
      }
    }
  } catch (error: any) {
    errors.push(
      `Failed to query dirty ${pluralLabel}: ${error?.message || error}`,
    );
  }

  return { errors, pushed };
}

/**
 * Generic pull engine: fetches cloud rows, resolves timestamp conflicts, and tombstones local deletions.
 */
export async function pullCloudEntitiesToLocal<
  TLocal extends SyncableRow,
  TCloud extends CloudSyncableRow,
>(
  db: OperonDb,
  tenantId: string,
  adapter: EntitySyncAdapter<TLocal, TCloud>,
): Promise<{ conflicts: number; errors: string[]; pulled: number }> {
  const errors: string[] = [];
  let pulled = 0;
  let conflicts = 0;
  const { entityName, pluralLabel, restResource, schema, table } = adapter;

  try {
    const cloudRows = await supabaseRequest<TCloud[]>(
      `/rest/v1/${restResource}?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*`,
      { schema },
    );

    if (!Array.isArray(cloudRows)) {
      return { conflicts, errors, pulled };
    }

    const cloudIds = new Set(cloudRows.map((row) => row.id));

    for (const cloud of cloudRows) {
      try {
        const localMatches = (await db
          .select()
          .from(table as any)
          .where(eq(table.id, cloud.id))) as TLocal[];
        const local = localMatches[0];
        const syncedAt = new Date().toISOString();

        if (local) {
          const cloudTime = new Date(cloud.updated_at).getTime();
          const localTime = new Date(local.updatedAt).getTime();

          if (cloudTime > localTime) {
            await db
              .update(table as any)
              .set(adapter.toLocalUpdate(cloud, syncedAt))
              .where(eq(table.id, local.id));
            pulled++;
            conflicts++;
          }
        } else {
          await db
            .insert(table as any)
            .values(adapter.toLocalInsert(cloud, syncedAt));
          pulled++;
        }
      } catch (error: any) {
        errors.push(
          `Failed to reconcile ${entityName} ${cloud.id}: ${error?.message || error}`,
        );
      }
    }

    const syncedLocals = (await db
      .select()
      .from(table as any)
      .where(
        and(eq(table.tenantId, tenantId), isNull(table.deletedAt)),
      )) as TLocal[];

    for (const local of syncedLocals) {
      if (local.lastSyncedAt && !cloudIds.has(local.id)) {
        const nowIso = new Date().toISOString();
        await db
          .update(table as any)
          .set({ deletedAt: nowIso, lastSyncedAt: nowIso })
          .where(eq(table.id, local.id));
        pulled++;
      }
    }
  } catch (error: any) {
    errors.push(
      `Failed to pull cloud ${pluralLabel}: ${error?.message || error}`,
    );
  }

  return { conflicts, errors, pulled };
}

export async function syncEntity<
  TLocal extends SyncableRow,
  TCloud extends CloudSyncableRow,
>(
  db: OperonDb,
  tenantId: string,
  adapter: EntitySyncAdapter<TLocal, TCloud>,
): Promise<SyncResult> {
  const pushRes = await pushDirtyEntitiesToCloud(db, tenantId, adapter);
  const pullRes = await pullCloudEntitiesToLocal(db, tenantId, adapter);

  return {
    conflicts: pullRes.conflicts,
    errors: [...pushRes.errors, ...pullRes.errors],
    pushed: pushRes.pushed,
    pulled: pullRes.pulled,
  };
}

const browserProfileSyncAdapter: EntitySyncAdapter<
  BrowserProfile,
  CloudBrowserProfile
> = {
  entityName: 'profile',
  pluralLabel: 'profiles',
  restResource: 'browser_profiles',
  schema: SUPABASE_SCHEMA.OPERON,
  table: browserProfiles,
  toCloudPayload: (local, tenantId) => ({
    cookies: (local.cookies as Record<string, unknown>[]) || [],
    created_at: local.createdAt,
    deleted_at: null,
    fingerprint: (local.fingerprint as Record<string, unknown>) || {},
    id: local.id,
    is_locked: local.isLocked,
    name: local.name,
    proxy_id: local.proxyId,
    release_id: local.releaseId,
    storage_state: (local.storageState as Record<string, unknown>) || {},
    template_id: local.templateId,
    tenant_id: tenantId,
    updated_at: local.updatedAt,
  }),
  toLocalInsert: (cloud, syncedAt) => ({
    browserType: 'Chromium',
    cookies: cloud.cookies || [],
    createdAt: cloud.created_at,
    deletedAt: cloud.deleted_at || null,
    fingerprint: cloud.fingerprint || {},
    id: cloud.id,
    isLocked: cloud.is_locked ?? false,
    lastSyncedAt: syncedAt,
    name: cloud.name,
    proxyId: cloud.proxy_id || null,
    releaseId: cloud.release_id || null,
    storageState: cloud.storage_state || {},
    templateId: cloud.template_id || null,
    tenantId: cloud.tenant_id,
    updatedAt: cloud.updated_at,
  }),
  toLocalUpdate: (cloud, syncedAt) => ({
    cookies: cloud.cookies || [],
    deletedAt: cloud.deleted_at || null,
    fingerprint: cloud.fingerprint || {},
    isLocked: cloud.is_locked ?? false,
    lastSyncedAt: syncedAt,
    name: cloud.name,
    proxyId: cloud.proxy_id || null,
    releaseId: cloud.release_id || null,
    storageState: cloud.storage_state || {},
    templateId: cloud.template_id || null,
    tenantId: cloud.tenant_id,
    updatedAt: cloud.updated_at,
  }),
};

const workflowSyncAdapter: EntitySyncAdapter<Workflow, CloudWorkflow> = {
  entityName: 'workflow',
  pluralLabel: 'workflows',
  restResource: 'workflows',
  schema: SUPABASE_SCHEMA.OPERON,
  table: workflows,
  toCloudPayload: (local, tenantId) => ({
    created_at: local.createdAt,
    deleted_at: null,
    description: local.description,
    edges: (local.edges as Record<string, unknown>[]) || [],
    id: local.id,
    is_active: local.isActive,
    name: local.name,
    nodes: (local.nodes as Record<string, unknown>[]) || [],
    settings: (local.settings as Record<string, unknown>) || {},
    tenant_id: tenantId,
    updated_at: local.updatedAt,
    version: local.version,
  }),
  toLocalInsert: (cloud, syncedAt) => ({
    createdAt: cloud.created_at,
    deletedAt: cloud.deleted_at || null,
    description: cloud.description || null,
    edges: cloud.edges || [],
    id: cloud.id,
    isActive: cloud.is_active,
    lastSyncedAt: syncedAt,
    name: cloud.name,
    nodes: cloud.nodes || [],
    settings: cloud.settings || {},
    tenantId: cloud.tenant_id,
    updatedAt: cloud.updated_at,
    version: cloud.version,
  }),
  toLocalUpdate: (cloud, syncedAt) => ({
    deletedAt: cloud.deleted_at || null,
    description: cloud.description || null,
    edges: cloud.edges || [],
    isActive: cloud.is_active,
    lastSyncedAt: syncedAt,
    name: cloud.name,
    nodes: cloud.nodes || [],
    settings: cloud.settings || {},
    tenantId: cloud.tenant_id,
    updatedAt: cloud.updated_at,
    version: cloud.version,
  }),
};

/** Soft-deletes a local browser profile by stamping deleted_at. */
export const softDeleteBrowserProfile = (db: OperonDb, id: string) =>
  softDeleteEntity(db, browserProfiles, id);

/** Soft-deletes a local workflow. */
export const softDeleteWorkflow = (db: OperonDb, id: string) =>
  softDeleteEntity(db, workflows, id);

/** Soft-deletes a local proxy. */
export const softDeleteProxy = (db: OperonDb, id: string) =>
  softDeleteEntity(db, proxies, id);

/** Queries active (non-deleted) browser profiles for a tenant. */
export async function getActiveBrowserProfiles(
  db: OperonDb,
  tenantId?: string,
): Promise<BrowserProfile[]> {
  const conditions = [isNull(browserProfiles.deletedAt)];
  if (tenantId) {
    conditions.push(eq(browserProfiles.tenantId, tenantId));
  }
  return db
    .select()
    .from(browserProfiles)
    .where(and(...conditions));
}

export const pushLocalBrowserProfilesToCloud = (
  db: OperonDb,
  tenantId: string,
) => pushDirtyEntitiesToCloud(db, tenantId, browserProfileSyncAdapter);

export const pullCloudBrowserProfilesToLocal = (
  db: OperonDb,
  tenantId: string,
) => pullCloudEntitiesToLocal(db, tenantId, browserProfileSyncAdapter);

export const syncBrowserProfiles = (db: OperonDb, tenantId: string) =>
  syncEntity(db, tenantId, browserProfileSyncAdapter);

export const pushLocalWorkflowsToCloud = (db: OperonDb, tenantId: string) =>
  pushDirtyEntitiesToCloud(db, tenantId, workflowSyncAdapter);

export const pullCloudWorkflowsToLocal = (db: OperonDb, tenantId: string) =>
  pullCloudEntitiesToLocal(db, tenantId, workflowSyncAdapter);

export const syncWorkflows = (db: OperonDb, tenantId: string) =>
  syncEntity(db, tenantId, workflowSyncAdapter);

/** Master synchronizer: runs sync across all supported offline-first entities. */
export async function syncAll(
  db: OperonDb,
  tenantId: string,
): Promise<{
  profiles: SyncResult;
  workflows: SyncResult;
}> {
  const [profiles, workflowResults] = await Promise.all([
    syncBrowserProfiles(db, tenantId),
    syncWorkflows(db, tenantId),
  ]);

  return {
    profiles,
    workflows: workflowResults,
  };
}
