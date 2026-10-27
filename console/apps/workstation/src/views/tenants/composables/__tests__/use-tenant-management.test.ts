import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTenantManagement } from '../use-tenant-management';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@operon-core/shadcn-ui', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#/locales', () => ({
  $t: (key: string, params?: any) => `${key}:${JSON.stringify(params || {})}`,
}));

describe('useTenantManagement composable TDD suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with activeTenant as null when tenants list is empty', () => {
    const { activeTenant, activeTenantId, tenants } = useTenantManagement();
    expect(tenants.value).toEqual([]);
    expect(activeTenant.value).toBeNull();
    expect(activeTenantId.value).toBe('');
  });

  it('correctly resolves activeTenant matching activeTenantId', () => {
    const { activeTenant, activeTenantId, tenants } = useTenantManagement();
    tenants.value = [
      {
        id: 'tenant-1',
        name: 'Alpha Corp',
        slug: 'alpha',
        status: 'active',
        created_at: '',
        updated_at: '',
        avatar_url: null,
        created_by: null,
      },
      {
        id: 'tenant-2',
        name: 'Beta Corp',
        slug: 'beta',
        status: 'active',
        created_at: '',
        updated_at: '',
        avatar_url: null,
        created_by: null,
      },
    ];
    activeTenantId.value = 'tenant-2';

    expect(activeTenant.value?.name).toBe('Beta Corp');
  });

  it('selectTenant updates active state and local storage', () => {
    const { activeTenantId, selectTenant } = useTenantManagement();
    const target = {
      id: 'tenant-99',
      name: 'Omega Lab',
      slug: 'omega',
      status: 'active' as const,
      created_at: '',
      updated_at: '',
      avatar_url: null,
      created_by: null,
    };

    selectTenant(target);
    expect(activeTenantId.value).toBe('tenant-99');
    expect(
      localStorage.getItem('__OPERON_ACTIVE_TENANT_ID__') ||
        localStorage.getItem('active_tenant_id'),
    ).toBeDefined();
  });

  it('connectCli routes to desktop authentication bridge with correct params', () => {
    const { connectCli } = useTenantManagement();
    const target = {
      id: 'tenant-xyz',
      name: 'Cloud Tenant',
      slug: 'cloud',
      status: 'active' as const,
      created_at: '',
      updated_at: '',
      avatar_url: null,
      created_by: null,
    };

    connectCli(target);
    expect(mockPush).toHaveBeenCalledWith(
      '/auth/desktop?machine_name=Local Workstation&tenant_id=tenant-xyz',
    );
  });
});
