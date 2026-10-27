import { describe, expect, it, vi } from 'vitest';

import {
  calculateSystemOverviewSummary,
  getSystemOverview,
  SUBSCRIPTION_STATUS,
  SYSTEM_PLUGIN_STATUS,
} from '../system';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn().mockResolvedValue([]),
}));

describe('system overview aggregation (SPEC-system-dashboard)', () => {
  it('calculates empty defaults safely when input arrays are omitted', () => {
    const summary = calculateSystemOverviewSummary({});
    expect(summary.plugins).toEqual({
      core: 0,
      extension: 0,
      installed: 0,
      total: 0,
    });
    expect(summary.plans).toEqual({ active: 0, paused: 0, total: 0 });
    expect(summary.users).toEqual({
      total: 0,
      unassigned: 0,
      withWorkspaces: 0,
    });
    expect(summary.roles).toEqual({
      custom: 0,
      permissionsTotal: 0,
      system: 0,
      total: 0,
    });
    expect(summary.subscriptions).toEqual({
      active: 0,
      canceled: 0,
      mrrUsd: 0,
      pastDue: 0,
      total: 0,
    });
    expect(summary.auditLogs.total).toBe(0);
    expect(summary.recentAuditLogs).toEqual([]);
    expect(summary.recentUsers).toEqual([]);
  });

  it('aggregates plugins, plans, users, roles, subscriptions, and slices top 5 recent items', () => {
    const summary = calculateSystemOverviewSummary({
      auditLogs: Array.from({ length: 8 }, (_, idx) => ({
        action: `action_${idx}`,
        actor_id: 'u1',
        created_at: '2026-10-14T10:00:00Z',
        entity_id: `e_${idx}`,
        entity_type: 'tenant',
        id: idx + 1,
        ip_address: '127.0.0.1',
        new_values: null,
        old_values: null,
        tenant_id: 't1',
        user_agent: null,
      })),
      permissions: [
        { description: 'Read', id: 'p1', module: 'core-iam' },
        { description: 'Write', id: 'p2', module: 'core-iam' },
      ],
      plans: [
        {
          created_at: '2026-01-01',
          description: null,
          id: 'free',
          is_active: true,
          max_members: 5,
          max_monthly_runs: 100,
          max_storage_mb: 500,
          metadata: {},
          name: 'Free',
          price_monthly_usd: 0,
        },
        {
          created_at: '2026-01-01',
          description: null,
          id: 'pro',
          is_active: true,
          max_members: 25,
          max_monthly_runs: 10_000,
          max_storage_mb: 5000,
          metadata: {},
          name: 'Pro',
          price_monthly_usd: 49,
        },
        {
          created_at: '2026-01-01',
          description: null,
          id: 'legacy',
          is_active: false,
          max_members: 10,
          max_monthly_runs: 1000,
          max_storage_mb: 1000,
          metadata: {},
          name: 'Legacy',
          price_monthly_usd: 19,
        },
      ],
      plugins: [
        {
          description: 'Core IAM',
          id: 'core-iam',
          installed_at: '2026-01-01',
          is_core: true,
          manifest: {},
          name: 'Core IAM',
          schema_name: 'public',
          status: SYSTEM_PLUGIN_STATUS.INSTALLED,
          version: '1.0.0',
        },
        {
          description: 'Commerce',
          id: 'commerce',
          installed_at: '2026-01-01',
          is_core: false,
          manifest: {},
          name: 'Commerce',
          schema_name: 'commerce',
          status: SYSTEM_PLUGIN_STATUS.INSTALLED,
          version: '1.0.0',
        },
      ],
      roles: [
        {
          created_at: '2026-01-01',
          description: 'Owner',
          id: 'r1',
          is_system: true,
          name: 'owner',
          permissions: ['p1', 'p2'],
        },
        {
          created_at: '2026-01-01',
          description: 'Custom',
          id: 'r2',
          is_system: false,
          name: 'ops',
          permissions: ['p1'],
        },
      ],
      subscriptions: [
        {
          cancel_at_period_end: false,
          created_at: '2026-01-01',
          current_period_end: '2026-11-01',
          current_period_start: '2026-10-01',
          id: 's1',
          plan_id: 'pro',
          plan_name: 'Pro',
          price_monthly_usd: 49,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          tenant_id: 't1',
          tenant_name: 'Acme',
          tenant_slug: 'acme',
        },
        {
          cancel_at_period_end: true,
          created_at: '2026-01-01',
          current_period_end: '2026-11-01',
          current_period_start: '2026-10-01',
          id: 's2',
          plan_id: 'pro',
          plan_name: 'Pro',
          price_monthly_usd: 49,
          status: SUBSCRIPTION_STATUS.CANCELED,
          tenant_id: 't2',
          tenant_name: 'Beta',
          tenant_slug: 'beta',
        },
      ],
      users: Array.from({ length: 6 }, (_, idx) => ({
        avatar_url: null,
        created_at: '2026-10-01',
        email: `user${idx}@operon.com`,
        full_name: `User ${idx}`,
        id: `u_${idx}`,
        primary_role: 'member',
        tenant_count: idx < 4 ? 1 : 0,
        updated_at: '2026-10-01',
      })),
    });

    expect(summary.plugins).toEqual({
      core: 1,
      extension: 1,
      installed: 2,
      total: 2,
    });
    expect(summary.plans).toEqual({ active: 2, paused: 1, total: 3 });
    expect(summary.users).toEqual({
      total: 6,
      unassigned: 2,
      withWorkspaces: 4,
    });
    expect(summary.roles).toEqual({
      custom: 1,
      permissionsTotal: 2,
      system: 1,
      total: 2,
    });
    expect(summary.subscriptions).toEqual({
      active: 1,
      canceled: 1,
      mrrUsd: 49,
      pastDue: 0,
      total: 2,
    });
    expect(summary.auditLogs.total).toBe(8);
    expect(summary.recentAuditLogs).toHaveLength(5);
    expect(summary.recentUsers).toHaveLength(5);
  });

  it('fetches system overview via getSystemOverview cleanly', async () => {
    const result = await getSystemOverview();
    expect(result.plugins.total).toBe(0);
    expect(result.subscriptions.mrrUsd).toBe(0);
  });
});
