import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabaseRequest } from '../supabase-client';
import {
  filterPlatformUsers,
  filterSystemPermissions,
  filterSystemRoles,
  groupPermissionsByModule,
  isCorePlugin,
  listBillingPlans,
  listGlobalAuditLogs,
  listPlatformSubscriptions,
  listPlatformUsers,
  listSystemPermissions,
  listSystemPlugins,
  listSystemRoles,
  mapRawBillingPlan,
  mapRawGlobalAuditLog,
  mapRawPlatformSubscription,
  mapRawPlatformUser,
  mapRawPlugin,
  mapRawSystemRole,
} from '../system';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn(),
}));

describe('system core api & helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCorePlugin', () => {
    it('should return true for all 6 core kernel plugins', () => {
      expect(isCorePlugin('core-iam')).toBe(true);
      expect(isCorePlugin('workers')).toBe(true);
      expect(isCorePlugin('automation')).toBe(true);
      expect(isCorePlugin('storage')).toBe(true);
      expect(isCorePlugin('subscriptions')).toBe(true);
      expect(isCorePlugin('webhooks')).toBe(true);
    });

    it('should return false for custom or empty plugin IDs', () => {
      expect(isCorePlugin('custom-ai')).toBe(false);
      expect(isCorePlugin('')).toBe(false);
    });
  });

  describe('mapRawPlugin', () => {
    it('should map valid raw plugin row and identify core plugin', () => {
      const raw = {
        description: 'Multi-Tenant IAM Kernel',
        id: 'core-iam',
        installed_at: '2026-10-11T00:00:00Z',
        manifest: { author: 'operon' },
        name: 'Core IAM',
        schema_name: 'public',
        status: 'installed',
        version: '1.0.0',
      };

      const result = mapRawPlugin(raw);

      expect(result).toEqual({
        dependencies: [],
        description: 'Multi-Tenant IAM Kernel',
        id: 'core-iam',
        installed_at: '2026-10-11T00:00:00Z',
        is_core: true,
        is_system: true,
        manifest: { author: 'operon' },
        metadata: {},
        name: 'Core IAM',
        schema_name: 'public',
        status: 'installed',
        version: '1.0.0',
      });
    });

    it('should provide safe defaults for incomplete rows', () => {
      const raw = { id: 'dynamic-extra' };
      const result = mapRawPlugin(raw);

      expect(result.id).toBe('dynamic-extra');
      expect(result.is_core).toBe(false);
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('installed');
      expect(result.name).toBe('dynamic-extra');
    });
  });

  describe('mapRawBillingPlan', () => {
    it('should parse plan fields with string prices into clean numeric structure', () => {
      const raw = {
        created_at: '2026-10-01T00:00:00Z',
        description: 'Starter Plan',
        id: 'starter',
        is_active: true,
        max_members: 10,
        max_monthly_runs: 5000,
        max_storage_mb: 2048,
        name: 'Starter Tier',
        price_monthly_usd: '19.99',
      };

      const result = mapRawBillingPlan(raw);

      expect(result).toEqual({
        created_at: '2026-10-01T00:00:00Z',
        description: 'Starter Plan',
        id: 'starter',
        is_active: true,
        max_members: 10,
        max_monthly_runs: 5000,
        max_storage_mb: 2048,
        metadata: {},
        name: 'Starter Tier',
        price_monthly_usd: 19.99,
      });
    });
  });

  describe('superadmin mappers', () => {
    it('should map raw profile with tenant count', () => {
      const raw = {
        avatar_url: 'https://example.com/a.jpg',
        created_at: '2026-10-01T00:00:00Z',
        email: 'user@operon.com',
        full_name: 'Test User',
        id: 'u-99',
        tenant_members: [{ count: 4 }],
      };
      const result = mapRawPlatformUser(raw);
      expect(result.id).toBe('u-99');
      expect(result.full_name).toBe('Test User');
      expect(result.tenant_count).toBe(4);
      expect(result.avatar_url).toBe('https://example.com/a.jpg');
    });

    it('should map raw audit log with safe defaults', () => {
      const raw = {
        action: 'auth:login',
        entity_id: 'u-1',
        id: 42,
        tenant_id: 't-1',
      };
      const result = mapRawGlobalAuditLog(raw);
      expect(result.id).toBe(42);
      expect(result.action).toBe('auth:login');
      expect(result.entity_type).toBe('system');
      expect(result.actor_id).toBeNull();
    });

    it('should map raw platform subscription with plan and tenant join', () => {
      const raw = {
        cancel_at_period_end: false,
        id: 'sub-1',
        plan_id: 'enterprise',
        plans: { name: 'Enterprise VIP', price_monthly_usd: '199' },
        status: 'active',
        tenant_id: 't-1',
        tenants: { name: 'Alpha Org', slug: 'alpha' },
      };
      const result = mapRawPlatformSubscription(raw);
      expect(result.plan_name).toBe('Enterprise VIP');
      expect(result.price_monthly_usd).toBe(199);
      expect(result.tenant_name).toBe('Alpha Org');
      expect(result.tenant_slug).toBe('alpha');
    });

    it('should map raw system role with permissions list', () => {
      const raw = {
        description: 'Standard member',
        id: 'r-mem',
        name: 'member',
        role_permissions: [{ permission_id: 'workers:devices:read' }],
      };
      const result = mapRawSystemRole(raw);
      expect(result.name).toBe('member');
      expect(result.permissions).toEqual(['workers:devices:read']);
    });
  });

  describe('api functions for system catalog', () => {
    it('should query listSystemPlugins from public.system_plugins', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          id: 'core-iam',
          name: 'Core IAM',
          status: 'installed',
        },
      ]);

      const plugins = await listSystemPlugins();

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/system_plugins?select='),
      );
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.is_core).toBe(true);
    });

    it('should query listBillingPlans with schema billing', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          id: 'free',
          max_members: 3,
          name: 'Free Tier',
          price_monthly_usd: 0,
        },
      ]);

      const plans = await listBillingPlans();

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/plans?select='),
        { schema: 'billing' },
      );
      expect(plans).toHaveLength(1);
      expect(plans[0]?.name).toBe('Free Tier');
    });

    it('should query listPlatformUsers from public.profiles with tenant count', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          avatar_url: 'https://example.com/avatar.png',
          created_at: '2026-10-10T00:00:00Z',
          email: 'admin@operon.com',
          full_name: 'Admin User',
          id: 'u-1',
          tenant_members: [{ count: 3 }],
        },
      ]);

      const users = await listPlatformUsers({ search: 'Admin' });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/profiles?select='),
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.full_name).toBe('Admin User');
      expect(users[0]?.tenant_count).toBe(3);
    });

    it('should fallback to tenant_members(count) when rich relational query fails in listPlatformUsers', async () => {
      vi.mocked(supabaseRequest)
        .mockRejectedValueOnce(new Error('PGRST200: relation not found'))
        .mockResolvedValueOnce([
          {
            created_at: '2026-10-10T00:00:00Z',
            email: 'fallback@operon.com',
            full_name: 'Fallback User',
            id: 'u-fallback',
            tenant_members: [{ count: 2 }],
          },
        ]);

      const users = await listPlatformUsers();

      expect(supabaseRequest).toHaveBeenCalledTimes(2);
      expect(supabaseRequest).toHaveBeenLastCalledWith(
        expect.stringContaining('select=*,tenant_members(count)'),
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe('u-fallback');
      expect(users[0]?.tenant_count).toBe(2);
    });

    it('should query listGlobalAuditLogs from public.audit_logs', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          action: 'member:invited',
          actor_id: 'u-1',
          created_at: '2026-10-11T00:00:00Z',
          entity_id: 'm-1',
          entity_type: 'tenant_member',
          id: 101,
          tenant_id: 't-1',
        },
      ]);

      const logs = await listGlobalAuditLogs({
        action: 'invited',
        tenantId: 't-1',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/audit_logs?select='),
      );
      expect(logs).toHaveLength(1);
      expect(logs[0]?.action).toBe('member:invited');
      expect(logs[0]?.id).toBe(101);
    });

    it('should query listPlatformSubscriptions with schema billing and join', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          cancel_at_period_end: false,
          created_at: '2026-10-12T00:00:00Z',
          id: 'sub-1',
          plan_id: 'pro',
          plans: { name: 'Pro Plan', price_monthly_usd: 49 },
          status: 'active',
          tenant_id: 't-1',
          tenants: { name: 'Acme Corp', slug: 'acme' },
        },
      ]);

      const subs = await listPlatformSubscriptions();

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/subscriptions?select='),
        { schema: 'billing' },
      );
      expect(subs).toHaveLength(1);
      expect(subs[0]?.tenant_name).toBe('Acme Corp');
      expect(subs[0]?.plan_name).toBe('Pro Plan');
      expect(subs[0]?.price_monthly_usd).toBe(49);
    });

    it('should query listSystemRoles and map role_permissions', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          description: 'Tenant Owner',
          id: 'role-owner',
          is_system: true,
          name: 'owner',
          role_permissions: [
            { permission_id: 'tenants:manage' },
            { permission_id: 'workers:devices:manage' },
          ],
        },
      ]);

      const roles = await listSystemRoles();

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/roles?select='),
      );
      expect(roles).toHaveLength(1);
      expect(roles[0]?.name).toBe('owner');
      expect(roles[0]?.permissions).toEqual([
        'tenants:manage',
        'workers:devices:manage',
      ]);
    });

    it('should query listSystemPermissions and group permissions by module', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          description: 'Read devices',
          id: 'workers:devices:read',
          module: 'workers',
        },
        {
          description: 'Manage devices',
          id: 'workers:devices:manage',
          module: 'workers',
        },
        {
          description: 'Read workflows',
          id: 'automation:workflows:read',
          module: 'automation',
        },
      ]);

      const perms = await listSystemPermissions();

      expect(perms).toHaveLength(3);
      const grouped = groupPermissionsByModule(perms);
      expect(Object.keys(grouped)).toEqual(['workers', 'automation']);
      expect(grouped.workers).toHaveLength(2);
      expect(grouped.automation).toHaveLength(1);
    });
  });

  describe('enterprise IAM directory & RBAC filter helpers', () => {
    it('should map raw profile with detailed tenant_members and resolve primary_role', () => {
      const raw = {
        avatar_url: null,
        created_at: '2026-10-05T00:00:00Z',
        email: 'architect@operon.com',
        full_name: 'Cloud Architect',
        id: 'uuid-arch-01',
        tenant_members: [
          {
            id: 'tm-1',
            member_roles: [{ roles: { name: 'member' } }],
            status: 'active',
            tenant_id: 't-alpha',
            tenants: { id: 't-alpha', name: 'Alpha Lab', slug: 'alpha-lab' },
          },
          {
            id: 'tm-2',
            member_roles: [{ roles: { name: 'owner' } }],
            status: 'active',
            tenant_id: 't-beta',
            tenants: { id: 't-beta', name: 'Beta Corp', slug: 'beta-corp' },
          },
        ],
      };

      const result = mapRawPlatformUser(raw);
      expect(result.tenant_count).toBe(2);
      expect(result.primary_role).toBe('owner');
      expect(result.workspaces).toHaveLength(2);
      expect(result.workspaces?.[0]?.tenant_name).toBe('Alpha Lab');
      expect(result.workspaces?.[1]?.role_name).toBe('owner');
    });

    it('should filter platform users by tenant_filter, role_filter, and multi-field search (name, email, UUID, workspace)', () => {
      const users = [
        mapRawPlatformUser({
          email: 'founder@operon.com',
          full_name: 'Alice Founder',
          id: '11111111-aaaa-bbbb-cccc-000000000001',
          tenant_members: [
            {
              member_roles: [{ roles: { name: 'owner' } }],
              status: 'active',
              tenant_id: 't-1',
              tenants: { id: 't-1', name: 'HQ', slug: 'hq' },
            },
            {
              member_roles: [{ roles: { name: 'member' } }],
              status: 'active',
              tenant_id: 't-2',
              tenants: { id: 't-2', name: 'Labs', slug: 'labs' },
            },
          ],
        }),
        mapRawPlatformUser({
          email: 'ops@operon.com',
          full_name: 'Bob Operator',
          id: '22222222-dddd-eeee-ffff-000000000002',
          tenant_members: [],
        }),
      ];

      expect(
        filterPlatformUsers(users, { tenant_filter: 'has_tenants' }),
      ).toHaveLength(1);
      expect(
        filterPlatformUsers(users, { tenant_filter: 'no_tenants' }),
      ).toHaveLength(1);
      expect(filterPlatformUsers(users, { role_filter: 'owner' })).toHaveLength(
        1,
      );
      // Secondary workspace role match (primary_role is 'owner', second workspace role is 'member')
      expect(
        filterPlatformUsers(users, { role_filter: 'member' }),
      ).toHaveLength(1);
      expect(filterPlatformUsers(users, { role_filter: 'admin' })).toHaveLength(
        0,
      );

      // Search by UUID fragment
      expect(
        filterPlatformUsers(users, { search: '22222222-dddd' }),
      ).toHaveLength(1);
      // Search by Email
      expect(
        filterPlatformUsers(users, { search: 'founder@operon.com' }),
      ).toHaveLength(1);
      // Search by Workspace slug/name
      expect(filterPlatformUsers(users, { search: 'hq' })).toHaveLength(1);
    });

    it('should filter system roles by role_type, module, and keyword', () => {
      const permsCatalog = [
        {
          description: 'Manage tenants',
          id: 'tenants:manage',
          module: 'core-iam',
        },
        {
          description: 'Manage devices',
          id: 'workers:devices:manage',
          module: 'workers',
        },
      ];
      const roles = [
        {
          created_at: '2026-10-01T00:00:00Z',
          description: 'Full access owner',
          id: 'r-owner',
          is_system: true,
          name: 'owner',
          permissions: ['tenants:manage', 'workers:devices:manage'],
        },
        {
          created_at: '2026-10-02T00:00:00Z',
          description: 'Custom worker operator',
          id: 'r-custom',
          is_system: false,
          name: 'worker_ops',
          permissions: ['workers:devices:manage'],
        },
      ];

      expect(
        filterSystemRoles(roles, { role_type: 'system' }, permsCatalog),
      ).toHaveLength(1);
      expect(
        filterSystemRoles(roles, { role_type: 'custom' }, permsCatalog),
      ).toHaveLength(1);
      expect(
        filterSystemRoles(roles, { module: 'core-iam' }, permsCatalog),
      ).toHaveLength(1);
      expect(
        filterSystemRoles(roles, { search: 'worker_ops' }, permsCatalog),
      ).toHaveLength(1);
    });

    it('should filter system permissions by module, owning role, and keyword', () => {
      const perms = [
        {
          description: 'Manage tenants',
          id: 'tenants:manage',
          module: 'core-iam',
        },
        {
          description: 'Read devices',
          id: 'workers:devices:read',
          module: 'workers',
        },
      ];
      const roles = [
        {
          created_at: '2026-10-01T00:00:00Z',
          description: 'Owner',
          id: 'r-owner',
          is_system: true,
          name: 'owner',
          permissions: ['tenants:manage', 'workers:devices:read'],
        },
        {
          created_at: '2026-10-01T00:00:00Z',
          description: 'Viewer',
          id: 'r-viewer',
          is_system: true,
          name: 'viewer',
          permissions: ['workers:devices:read'],
        },
      ];

      expect(
        filterSystemPermissions(perms, { module: 'core-iam' }, roles),
      ).toHaveLength(1);
      expect(
        filterSystemPermissions(perms, { role: 'viewer' }, roles),
      ).toHaveLength(1);
      expect(
        filterSystemPermissions(perms, { search: 'devices:read' }, roles),
      ).toHaveLength(1);
    });
  });
});
