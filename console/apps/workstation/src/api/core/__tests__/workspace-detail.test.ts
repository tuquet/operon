import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  computeWorkspaceQuota,
  hashToken,
  mapRawMembersToWorkspaceMembers,
} from '../workspace-detail';

describe('hashToken', () => {
  it('should compute valid sha256 hex string for given token', async () => {
    const raw = 'test-token-12345';
    const hash = await hashToken(raw);
    expect(hash).toBeTypeOf('string');
    expect(hash).toHaveLength(64); // SHA-256 is 32 bytes = 64 hex chars
    // Stable hash check
    const hash2 = await hashToken(raw);
    expect(hash2).toBe(hash);
  });
});

describe('mapRawMembersToWorkspaceMembers', () => {
  it('should handle empty input gracefully', () => {
    expect(mapRawMembersToWorkspaceMembers([])).toEqual([]);
    expect(mapRawMembersToWorkspaceMembers(null as any)).toEqual([]);
  });

  it('should correctly map tenant members and resolve system roles', () => {
    const rawRows = [
      {
        id: 'member-1',
        user_id: 'user-owner',
        status: 'active',
        joined_at: '2026-10-01T00:00:00Z',
        profiles: {
          id: 'user-owner',
          full_name: 'Nguyen Dinh Tu',
          email: 'admin@operon.com',
          avatar_url: 'https://avatar.com/1.png',
        },
        member_roles: [
          {
            role_id: '00000000-0000-0000-0000-000000000001',
            roles: {
              id: '00000000-0000-0000-0000-000000000001',
              name: 'owner',
              display_name: 'Owner',
            },
          },
        ],
      },
      {
        id: 'member-2',
        user_id: 'user-dev',
        status: 'active',
        joined_at: '2026-10-05T00:00:00Z',
        profiles: {
          id: 'user-dev',
          full_name: null,
          email: 'dev@operon.com',
          avatar_url: null,
        },
        member_roles: [
          {
            role_id: '00000000-0000-0000-0000-000000000003',
            roles: {
              id: '00000000-0000-0000-0000-000000000003',
              name: 'member',
              display_name: 'Member',
            },
          },
        ],
      },
    ];

    const result = mapRawMembersToWorkspaceMembers(rawRows, 'user-owner');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'member-1',
      user_id: 'user-owner',
      status: 'active',
      joined_at: '2026-10-01T00:00:00Z',
      full_name: 'Nguyen Dinh Tu',
      email: 'admin@operon.com',
      avatar_url: 'https://avatar.com/1.png',
      role: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'owner',
        display_name: 'Owner',
      },
    });

    expect(result[1]?.role.name).toBe('member');
    expect(result[1]?.full_name).toBe('dev@operon.com'); // Fallback to email when full_name is null
  });

  it('should fallback to owner role if user is tenant owner and has no explicit member_roles row', () => {
    const rawRows = [
      {
        id: 'member-owner-fallback',
        user_id: 'user-creator',
        status: 'active',
        joined_at: '2026-10-01T00:00:00Z',
        profiles: {
          id: 'user-creator',
          email: 'creator@operon.com',
        },
        member_roles: [],
      },
    ];

    const result = mapRawMembersToWorkspaceMembers(rawRows, 'user-creator');
    expect(result).toHaveLength(1);
    expect(result[0]?.role.name).toBe('owner');
  });
});

describe('computeWorkspaceQuota', () => {
  it('should compute quota from active subscription', () => {
    const quota = computeWorkspaceQuota({
      activeDevicesCount: 5,
      membersCount: 3,
      subscription: {
        id: 'sub-1',
        tenant_id: 'tenant-1',
        plan_id: 'pro',
        status: 'active',
        current_period_start: '2026-10-01T00:00:00Z',
        current_period_end: '2026-11-01T00:00:00Z',
        cancel_at_period_end: false,
        plan: {
          id: 'pro',
          name: 'Pro Standard',
          description: 'Team plan',
          max_members: 10,
          max_storage_mb: 10_240,
          max_monthly_runs: 50_000,
          price_monthly_usd: 29,
        },
      },
      usageMeters: [
        { metric_name: 'storage_mb', current_value: 120 },
        { metric_name: 'monthly_runs', current_value: 450 },
      ],
    });

    expect(quota).toEqual({
      plan_name: 'Pro Standard',
      max_members: 10,
      max_devices: 25,
      max_storage_mb: 10_240,
      max_monthly_runs: 50_000,
      used_members: 3,
      used_devices: 5,
      used_storage_mb: 120,
      used_monthly_runs: 450,
    });
  });

  it('should fallback to default free plan when subscription is missing', () => {
    const quota = computeWorkspaceQuota({
      activeDevicesCount: 1,
      membersCount: 1,
      defaultFreePlan: {
        id: 'free',
        name: 'Free Starter',
        description: 'Free tier',
        max_members: 2,
        max_storage_mb: 500,
        max_monthly_runs: 1000,
        price_monthly_usd: 0,
      },
    });

    expect(quota.plan_name).toBe('Free Starter');
    expect(quota.max_members).toBe(2);
    expect(quota.max_storage_mb).toBe(500);
    expect(quota.max_devices).toBe(3);
    expect(quota.used_devices).toBe(1);
    expect(quota.used_members).toBe(1);
  });
});

describe('workspace Detail Responsive & Typography Contract', () => {
  const tenantsDir = existsSync(
    resolve(process.cwd(), 'apps/workstation/src/views/tenants'),
  )
    ? resolve(process.cwd(), 'apps/workstation/src/views/tenants')
    : resolve(process.cwd(), 'src/views/tenants');

  it('uses a responsive Description Grid in workspace-overview-tab.vue without VxeFormItem span="12"', () => {
    const content = readFileSync(
      resolve(tenantsDir, 'components/workspace-overview-tab.vue'),
      'utf8',
    );
    expect(content).not.toContain('VxeFormItem');
    expect(content).not.toContain('span="12"');
    expect(content).toContain('grid-cols-1');
    expect(content).toContain('sm:grid-cols-2');
    expect(content).toContain('lg:grid-cols-3');
  });

  it('makes TabsList horizontally scrollable on mobile in detail.vue and aligns WorkspaceHero with Built-in Theme', () => {
    const detailContent = readFileSync(
      resolve(tenantsDir, 'detail.vue'),
      'utf8',
    );
    expect(detailContent).toContain('overflow-x-auto');
    expect(detailContent).toContain('whitespace-nowrap');

    const heroContent = readFileSync(
      resolve(tenantsDir, 'components/workspace-hero.vue'),
      'utf8',
    );
    expect(heroContent).not.toContain('from-sky-600');
    expect(heroContent).toContain('bg-primary/10');
    expect(heroContent).toContain('text-primary');
  });

  it('eliminates arbitrary text-[11px] pixel classes across workspace views', () => {
    const files = [
      'detail.vue',
      'components/workspace-hero.vue',
      'components/workspace-overview-tab.vue',
      'components/workspace-members-tab.vue',
      'components/workspace-usage-tab.vue',
      'components/workspace-audit-tab.vue',
    ];
    for (const file of files) {
      const content = readFileSync(resolve(tenantsDir, file), 'utf8');
      expect(content).not.toContain('text-[11px]');
    }
  });
});
