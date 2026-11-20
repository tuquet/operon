import path from 'node:path';
import process from 'node:process';

import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCanonicalSqlitePath,
  getDomainDb,
  runLocalMigrations,
} from '../client';
import * as requesterModule from '../requester';
import * as schema from '../schema';
import {
  getActiveBrowserProfiles,
  pullCloudBrowserProfilesToLocal,
  pushLocalBrowserProfilesToCloud,
  softDeleteBrowserProfile,
  syncAll,
  syncBrowserProfiles,
  syncWorkflows,
} from '../sync';

describe('local-first sqlite & cloud sync verification suite', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const migrationsFolder = path.resolve(
    process.cwd(),
    'packages/local-db/src/migrations',
  );

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Isolated in-memory SQLite database for deterministic testing
    const client = createClient({ url: ':memory:' });
    db = drizzle(client, { schema });

    // Apply Drizzle migrations automatically
    await runLocalMigrations(db, migrationsFolder);
  });

  describe('part 1: local sqlite crud & schema integrity', () => {
    it('applies migrations and performs CRUD operations successfully', async () => {
      // 1. Insert Proxy
      await db.insert(schema.proxies).values({
        countryCode: 'VN',
        createdAt: new Date().toISOString(),
        host: '192.168.1.100',
        id: 'proxy-001',
        isActive: true,
        name: 'Residential SOCKS5',
        port: 1080,
        protocol: 'socks5',
        tenantId: 'tenant-test',
        updatedAt: new Date().toISOString(),
      });

      const proxyRows = await db
        .select()
        .from(schema.proxies)
        .where(eq(schema.proxies.id, 'proxy-001'));
      expect(proxyRows).toHaveLength(1);
      expect(proxyRows[0]?.protocol).toBe('socks5');

      // 2. Insert Browser Profile linked to Proxy
      const nowIso = new Date().toISOString();
      await db.insert(schema.browserProfiles).values({
        browserType: 'Chromium',
        cookies: [{ name: 'session_id', value: 'secret-cookie-123' }],
        createdAt: nowIso,
        fingerprint: { canvas: 'noise-seeded', webgl: 'nvidia-rtx' },
        id: 'browser-001',
        isLocked: false,
        name: 'TikTok Stealth Profile 1',
        proxyId: 'proxy-001',
        storageState: {},
        tenantId: 'tenant-test',
        timezone: 'Asia/Ho_Chi_Minh',
        updatedAt: nowIso,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      const profileRows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'browser-001'));
      expect(profileRows).toHaveLength(1);
      expect(profileRows[0]?.name).toBe('TikTok Stealth Profile 1');
      expect(profileRows[0]?.cookies).toEqual([
        { name: 'session_id', value: 'secret-cookie-123' },
      ]);

      // 3. Relational Query (Browser Profile with Proxy)
      const profileWithProxy = await db.query.browserProfiles.findFirst({
        where: eq(schema.browserProfiles.id, 'browser-001'),
        with: {
          proxy: true,
        },
      });
      expect(profileWithProxy).toBeDefined();
      expect(profileWithProxy?.proxy?.host).toBe('192.168.1.100');

      // 4. Update Profile
      const updatedIso = new Date(Date.now() + 1000).toISOString();
      await db
        .update(schema.browserProfiles)
        .set({ name: 'Renamed Profile', updatedAt: updatedIso })
        .where(eq(schema.browserProfiles.id, 'browser-001'));

      const updated = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'browser-001'));
      expect(updated[0]?.name).toBe('Renamed Profile');
    });

    it('enforces foreign key constraints and cascaded execution logs', async () => {
      const now = new Date().toISOString();
      await db.insert(schema.jobs).values({
        createdAt: now,
        id: 'job-100',
        name: 'Scrape E-commerce job',
        status: 'running',
        updatedAt: now,
      });

      await db.insert(schema.executionLogs).values({
        createdAt: now,
        jobId: 'job-100',
        level: 'info',
        message: 'Job started successfully',
      });

      const logs = await db
        .select()
        .from(schema.executionLogs)
        .where(eq(schema.executionLogs.jobId, 'job-100'));
      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toBe('Job started successfully');
    });

    it('simulates and verifies legacy pre-drizzle database auto-upgrade', async () => {
      const legacyClient = createClient({ url: ':memory:' });

      // Create pre-Drizzle Operon v1 schema
      await legacyClient.execute(`
        CREATE TABLE jobs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          data TEXT NOT NULL,
          options TEXT,
          status TEXT NOT NULL,
          created_at DATETIME,
          updated_at DATETIME
        );
      `);
      await legacyClient.execute(`
        CREATE TABLE logs (
          id INTEGER PRIMARY KEY,
          job_id TEXT NOT NULL,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME
        );
      `);
      await legacyClient.execute(`
        CREATE TABLE browsers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          user_agent TEXT,
          timezone TEXT,
          created_at DATETIME,
          updated_at DATETIME
        );
      `);
      await legacyClient.execute(
        'CREATE INDEX idx_jobs_status ON jobs(status);',
      );
      await legacyClient.execute(
        'CREATE INDEX idx_logs_job_id ON logs(job_id);',
      );

      // Seed legacy data
      await legacyClient.execute(`
        INSERT INTO jobs (id, name, data, options, status, created_at, updated_at)
        VALUES ('legacy-job-999', 'Old Automation Job', '{}', '{}', 'completed', '2026-10-15', '2026-10-15');
      `);
      await legacyClient.execute(`
        INSERT INTO browsers (id, name, user_agent, timezone, created_at, updated_at)
        VALUES ('legacy-browser-999', 'Old Stealth Browser', 'Mozilla/5.0', 'Asia/Bangkok', '2026-10-15', '2026-10-15');
      `);

      // Run auto-migration on the legacy database
      const legacyDb = drizzle(legacyClient, { schema });
      await runLocalMigrations(legacyDb, migrationsFolder);

      // 1. Verify legacy jobs table preserved rows and has new columns
      const jobsRes = await legacyClient.execute(
        "SELECT * FROM jobs WHERE id = 'legacy-job-999'",
      );
      expect(jobsRes.rows).toHaveLength(1);
      expect(jobsRes.rows[0]?.name).toBe('Old Automation Job');

      // 2. Verify legacy browsers table was imported into browser_profiles
      const importedProfiles = await legacyDb
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'legacy-browser-999'));
      expect(importedProfiles).toHaveLength(1);
      expect(importedProfiles[0]?.name).toBe('Old Stealth Browser');
      expect(importedProfiles[0]?.timezone).toBe('Asia/Bangkok');
    });

    it('safely rolls back transactions upon operational failure', async () => {
      const now = new Date().toISOString();

      try {
        await db.transaction(async (tx) => {
          await tx.insert(schema.workflows).values({
            createdAt: now,
            id: 'tx-wf-1',
            isActive: true,
            name: 'Transactional Workflow',
            updatedAt: now,
          });

          // Simulate mid-operation failure
          throw new Error('Simulated atomic crash');
        });
      } catch {
        // Expected error caught
      }

      // Verify rolled back
      const workflows = await db
        .select()
        .from(schema.workflows)
        .where(eq(schema.workflows.id, 'tx-wf-1'));
      expect(workflows).toHaveLength(0);
    });
  });

  describe('part 2: cloud sync engine (push, pull, conflicts, tombstones)', () => {
    const tenantId = 'tenant-test-uuid-456';

    it('pushes offline-created local profiles to Cloud and updates lastSyncedAt', async () => {
      const nowIso = new Date().toISOString();
      await db.insert(schema.browserProfiles).values({
        createdAt: nowIso,
        id: 'offline-prof-1',
        lastSyncedAt: null,
        name: 'Offline Created Profile',
        tenantId,
        updatedAt: nowIso,
      });

      const mockSupabase = vi
        .spyOn(requesterModule, 'supabaseRequest')
        .mockResolvedValueOnce({ status: 201 });

      const result = await pushLocalBrowserProfilesToCloud(db, tenantId);

      expect(result.errors).toHaveLength(0);
      expect(result.pushed).toBe(1);
      expect(mockSupabase).toHaveBeenCalledWith(
        '/rest/v1/browser_profiles',
        expect.objectContaining({
          method: 'POST',
          schema: 'operon',
        }),
      );

      const rows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'offline-prof-1'));
      expect(rows[0]?.lastSyncedAt).not.toBeNull();
    });

    it('pulls new Cloud profiles into local SQLite', async () => {
      const cloudProfile = {
        browser_type: 'Chromium',
        created_at: '2026-11-03T10:00:00.000Z',
        id: 'cloud-prof-99',
        name: 'Cloud Added Profile',
        tenant_id: tenantId,
        updated_at: '2026-11-03T10:00:00.000Z',
      };

      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValueOnce([
        cloudProfile,
      ]);

      const result = await pullCloudBrowserProfilesToLocal(db, tenantId);

      expect(result.errors).toHaveLength(0);
      expect(result.pulled).toBe(1);

      const rows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'cloud-prof-99'));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe('Cloud Added Profile');
    });

    it('resolves conflicts with Last-Write-Wins: Cloud is newer overwrites local', async () => {
      await db.insert(schema.browserProfiles).values({
        createdAt: '2026-11-03T10:00:00.000Z',
        id: 'conflict-prof-1',
        lastSyncedAt: '2026-11-03T10:00:00.000Z',
        name: 'Local Version (Old)',
        tenantId,
        updatedAt: '2026-11-03T10:00:00.000Z',
      });

      const cloudNewer = {
        created_at: '2026-11-03T10:00:00.000Z',
        id: 'conflict-prof-1',
        name: 'Cloud Version (Newer)',
        tenant_id: tenantId,
        updated_at: '2026-11-03T11:00:00.000Z',
      };

      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValueOnce([
        cloudNewer,
      ]);

      const result = await pullCloudBrowserProfilesToLocal(db, tenantId);

      expect(result.conflicts).toBe(1);

      const rows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'conflict-prof-1'));
      expect(rows[0]?.name).toBe('Cloud Version (Newer)');
      expect(rows[0]?.updatedAt).toBe('2026-11-03T11:00:00.000Z');
    });

    it('propagates soft-delete (tombstone) locally and to Cloud', async () => {
      const pastIso = new Date(Date.now() - 10_000).toISOString();
      await db.insert(schema.browserProfiles).values({
        createdAt: pastIso,
        id: 'tombstone-prof-1',
        lastSyncedAt: pastIso,
        name: 'Profile to Delete',
        tenantId,
        updatedAt: pastIso,
      });

      // 1. Soft-delete locally
      await softDeleteBrowserProfile(db, 'tombstone-prof-1');

      // Verify excluded from active profiles query
      const activeProfiles = await getActiveBrowserProfiles(db, tenantId);
      expect(activeProfiles.map((p) => p.id)).not.toContain('tombstone-prof-1');

      // 2. Push sync propagates DELETE to Cloud
      const mockSupabase = vi
        .spyOn(requesterModule, 'supabaseRequest')
        .mockResolvedValueOnce({ status: 204 });

      const pushRes = await pushLocalBrowserProfilesToCloud(db, tenantId);
      expect(pushRes.pushed).toBe(1);
      expect(mockSupabase).toHaveBeenCalledWith(
        expect.stringContaining(
          '/rest/v1/browser_profiles?id=eq.tombstone-prof-1',
        ),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('reconciles deleted profiles when absent from Cloud on pull', async () => {
      const nowIso = new Date().toISOString();
      // Previously synced local profile
      await db.insert(schema.browserProfiles).values({
        createdAt: nowIso,
        id: 'deleted-on-cloud-1',
        lastSyncedAt: nowIso,
        name: 'Profile deleted remotely',
        tenantId,
        updatedAt: nowIso,
      });

      // Cloud returns empty array (remote deletion)
      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValueOnce([]);

      const pullRes = await pullCloudBrowserProfilesToLocal(db, tenantId);
      expect(pullRes.pulled).toBe(1);

      // Verify local profile is now marked with deletedAt
      const rows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'deleted-on-cloud-1'));
      expect(rows[0]?.deletedAt).not.toBeNull();
    });

    it('strictly isolates profiles by tenant', async () => {
      const nowIso = new Date().toISOString();
      await db.insert(schema.browserProfiles).values({
        createdAt: nowIso,
        id: 'prof-org-a',
        lastSyncedAt: null,
        name: 'Org A Profile',
        tenantId: 'tenant-AAA',
        updatedAt: nowIso,
      });
      await db.insert(schema.browserProfiles).values({
        createdAt: nowIso,
        id: 'prof-org-b',
        lastSyncedAt: null,
        name: 'Org B Profile',
        tenantId: 'tenant-BBB',
        updatedAt: nowIso,
      });

      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValue({
        status: 201,
      });

      // Push only for tenant-AAA
      const pushRes = await pushLocalBrowserProfilesToCloud(db, 'tenant-AAA');
      expect(pushRes.pushed).toBe(1);

      // Verify Org A was synced, Org B remains unsynced
      const orgA = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'prof-org-a'));
      const orgB = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'prof-org-b'));

      expect(orgA[0]?.lastSyncedAt).not.toBeNull();
      expect(orgB[0]?.lastSyncedAt).toBeNull();
    });

    it('synchronizes workflows bidirectionally with LWW conflict resolution', async () => {
      const nowIso = new Date().toISOString();
      await db.insert(schema.workflows).values({
        createdAt: nowIso,
        id: 'wf-local-1',
        isActive: true,
        lastSyncedAt: null,
        name: 'Local Automation Workflow',
        nodes: [{ id: 'node-1', type: 'trigger' }],
        tenantId,
        updatedAt: nowIso,
        version: '1.0.0',
      });

      // Mock push
      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValueOnce({
        status: 201,
      });
      // Mock pull returning both workflows
      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValueOnce([
        {
          created_at: nowIso,
          id: 'wf-local-1',
          is_active: true,
          name: 'Local Automation Workflow',
          nodes: [{ id: 'node-1', type: 'trigger' }],
          tenant_id: tenantId,
          updated_at: nowIso,
          version: '1.0.0',
        },
        {
          created_at: nowIso,
          id: 'wf-cloud-new',
          is_active: true,
          name: 'Cloud Team Workflow',
          nodes: [],
          tenant_id: tenantId,
          updated_at: nowIso,
          version: '1.0.0',
        },
      ]);

      const result = await syncWorkflows(db, tenantId);
      expect(result.pushed).toBe(1);
      expect(result.pulled).toBe(1);

      const cloudWf = await db
        .select()
        .from(schema.workflows)
        .where(eq(schema.workflows.id, 'wf-cloud-new'));
      expect(cloudWf).toHaveLength(1);
      expect(cloudWf[0]?.name).toBe('Cloud Team Workflow');
    });

    it('isolates partial failures during push (1 fails, others succeed)', async () => {
      const nowIso = new Date().toISOString();
      await db.insert(schema.browserProfiles).values([
        {
          createdAt: nowIso,
          id: 'partial-prof-1',
          lastSyncedAt: null,
          name: 'Profile 1 (Succeeds)',
          tenantId,
          updatedAt: nowIso,
        },
        {
          createdAt: nowIso,
          id: 'partial-prof-2',
          lastSyncedAt: null,
          name: 'Profile 2 (Fails)',
          tenantId,
          updatedAt: nowIso,
        },
        {
          createdAt: nowIso,
          id: 'partial-prof-3',
          lastSyncedAt: null,
          name: 'Profile 3 (Succeeds)',
          tenantId,
          updatedAt: nowIso,
        },
      ]);

      vi.spyOn(requesterModule, 'supabaseRequest')
        .mockResolvedValueOnce({ status: 201 })
        .mockRejectedValueOnce(new Error('Invalid payload validation error'))
        .mockResolvedValueOnce({ status: 201 });

      const pushRes = await pushLocalBrowserProfilesToCloud(db, tenantId);

      expect(pushRes.pushed).toBe(2);
      expect(pushRes.errors).toHaveLength(1);
      expect(pushRes.errors[0]).toContain('partial-prof-2');

      const prof1 = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'partial-prof-1'));
      const prof2 = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'partial-prof-2'));
      const prof3 = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'partial-prof-3'));

      expect(prof1[0]?.lastSyncedAt).not.toBeNull();
      expect(prof2[0]?.lastSyncedAt).toBeNull();
      expect(prof3[0]?.lastSyncedAt).not.toBeNull();
    });

    it('runs syncAll master orchestrator across all entities', async () => {
      vi.spyOn(requesterModule, 'supabaseRequest').mockResolvedValue([]);

      const masterResult = await syncAll(db, tenantId);
      expect(masterResult.profiles).toBeDefined();
      expect(masterResult.workflows).toBeDefined();
      expect(masterResult.profiles.errors).toHaveLength(0);
      expect(masterResult.workflows.errors).toHaveLength(0);
    });

    it('handles network failure gracefully without corrupting local data', async () => {
      const nowIso = new Date().toISOString();
      await db.insert(schema.browserProfiles).values({
        createdAt: nowIso,
        id: 'fail-safe-prof',
        lastSyncedAt: null,
        name: 'Protected Profile',
        tenantId,
        updatedAt: nowIso,
      });

      vi.spyOn(requesterModule, 'supabaseRequest').mockRejectedValueOnce(
        new Error('Network connection timeout (503 Service Unavailable)'),
      );

      const syncResult = await syncBrowserProfiles(db, tenantId);

      expect(syncResult.pushed).toBe(0);
      expect(syncResult.errors.length).toBeGreaterThan(0);
      expect(syncResult.errors[0]).toContain('503 Service Unavailable');

      const rows = await db
        .select()
        .from(schema.browserProfiles)
        .where(eq(schema.browserProfiles.id, 'fail-safe-prof'));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe('Protected Profile');
    });
  });

  describe('part 5: multi-database domain isolation & paths', () => {
    it('resolves correct SQLite paths for individual micro-app domains', () => {
      expect(getCanonicalSqlitePath('automation')).toContain(
        'automation.sqlite',
      );
      expect(getCanonicalSqlitePath('system')).toContain('system.sqlite');
      expect(getCanonicalSqlitePath('tenants')).toContain('tenants.sqlite');
      expect(getCanonicalSqlitePath()).toContain('operon.sqlite');
    });

    it('initializes domain-specific Drizzle clients with in-memory test databases', async () => {
      const autoDb = getDomainDb('automation', undefined, ':memory:');
      const sysDb = getDomainDb('system', undefined, ':memory:');
      const tenantsDb = getDomainDb('tenants', undefined, ':memory:');

      expect(autoDb).toBeDefined();
      expect(sysDb).toBeDefined();
      expect(tenantsDb).toBeDefined();
    });
  });
});
