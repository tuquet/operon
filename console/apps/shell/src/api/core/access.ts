import { $t } from '@operon/locales';
import { useAccessStore } from '@operon/stores';

import { decodeJwtPayload, supabaseRequest } from './supabase-client';

export interface TenantMembershipQueryResult {
  tenant_id: string;
  member_roles?: Array<{
    roles?: null | {
      role_permissions?: Array<{
        permission_id: string;
      }>;
    };
  }>;
}

export interface FlattenedAccess {
  permissions: string[];
  tenantPermissions: Record<string, string[]>;
}

export interface EffectiveAccess {
  isSuperadmin: boolean;
  permissions: string[];
  tenantPermissions: Record<string, string[]>;
}

/**
 * Safely parses the platform role from a JWT token's app_metadata claim.
 * Returns null if token is empty, invalid, or platform_role is not set.
 */
export function readPlatformRole(token?: null | string): null | string {
  const payload = decodeJwtPayload(token);
  return payload?.app_metadata?.platform_role || null;
}

/**
 * Safely extracts user id (sub claim) from JWT token.
 */
export function readUserIdFromToken(token?: null | string): null | string {
  const payload = decodeJwtPayload(token);
  return payload?.sub || null;
}

/**
 * Pure helper function to flatten multi-tenant membership rows from PostgREST
 * into a deduplicated union array of permissions and a per-tenant mapping.
 */
export function flattenMemberships(
  rows: TenantMembershipQueryResult[],
): FlattenedAccess {
  const allPermissions = new Set<string>();
  const tenantPermissions: Record<string, string[]> = {};

  if (!Array.isArray(rows)) {
    return { permissions: [], tenantPermissions: {} };
  }

  for (const row of rows) {
    if (!row?.tenant_id) continue;
    const tenantPermSet = new Set<string>();

    if (Array.isArray(row.member_roles)) {
      for (const mr of row.member_roles) {
        const perms = mr?.roles?.role_permissions;
        if (Array.isArray(perms)) {
          for (const p of perms) {
            if (p?.permission_id) {
              allPermissions.add(p.permission_id);
              tenantPermSet.add(p.permission_id);
            }
          }
        }
      }
    }

    tenantPermissions[row.tenant_id] = [...tenantPermSet].toSorted();
  }

  return {
    permissions: [...allPermissions].toSorted(),
    tenantPermissions,
  };
}

let effectiveAccessPromise: null | Promise<EffectiveAccess> = null;
let cachedToken: null | string = null;

/**
 * Resets the cached effective access promise (called on logout).
 */
export function clearAccessCache(): void {
  effectiveAccessPromise = null;
  cachedToken = null;
}

/**
 * Retrieves the effective access permissions for the authenticated session.
 * Utilizes single-flight Promise caching to avoid duplicate queries.
 */
export async function getEffectiveAccess(): Promise<EffectiveAccess> {
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;

  if (!token) {
    throw new Error($t('authentication.missingAccessToken'));
  }

  // Reuse in-flight or cached promise if token hasn't changed
  if (effectiveAccessPromise && cachedToken === token) {
    return await effectiveAccessPromise;
  }

  cachedToken = token;
  effectiveAccessPromise = (async () => {
    const platformRole = readPlatformRole(token);
    const isSuperadmin = platformRole === 'superadmin';

    if (isSuperadmin) {
      // Platform superadmin: query all permissions from public.permissions
      const allPermRows = await supabaseRequest<Array<{ id: string }>>(
        '/rest/v1/permissions?select=id',
      );
      cachedToken = accessStore.accessToken || token;
      const permissions = (allPermRows || [])
        .map((r) => r.id)
        .filter(Boolean)
        .toSorted();

      return {
        isSuperadmin: true,
        permissions,
        tenantPermissions: {},
      };
    }

    // Standard User: derive permissions from active tenant memberships
    const userId = readUserIdFromToken(token);
    if (!userId) {
      throw new Error($t('authentication.invalidTokenSub'));
    }

    const membershipRows = await supabaseRequest<TenantMembershipQueryResult[]>(
      `/rest/v1/tenant_members?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=tenant_id,member_roles(roles(role_permissions(permission_id)))`,
    );
    cachedToken = accessStore.accessToken || token;

    const flattened = flattenMemberships(membershipRows || []);
    return {
      isSuperadmin: false,
      permissions: flattened.permissions,
      tenantPermissions: flattened.tenantPermissions,
    };
  })().catch((error) => {
    // Clear cache on error so subsequent calls can retry
    clearAccessCache();
    throw error;
  });

  return await effectiveAccessPromise;
}

/**
 * Retrieves the list of currently installed system plugin IDs.
 * Note: public.system_plugins requires an authenticated session.
 * For unauthenticated sessions (e.g. login screen or cold boot), returns an empty array immediately.
 */
export async function listInstalledPlugins(): Promise<string[]> {
  const accessStore = useAccessStore();
  if (!accessStore.accessToken) {
    return [];
  }
  try {
    const plugins = await supabaseRequest<Array<{ id: string }>>(
      '/rest/v1/system_plugins?status=eq.installed&select=id',
      { suppressErrorCapture: true },
    );
    return (plugins || []).map((p) => p.id);
  } catch (error) {
    console.warn(
      '[Access] Failed to query installed plugins from Supabase:',
      error,
    );
    return [];
  }
}

export const accessApi = {
  clearAccessCache,
  getEffectiveAccess,
  listInstalledPlugins,
};
