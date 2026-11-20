import { useAccessStore } from '@operon/stores';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTenantStore } from '../tenant';

vi.mock('@operon-core/shadcn-ui', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#/locales', () => ({
  $t: (key: string, params?: any) => `${key}:${JSON.stringify(params || {})}`,
}));

vi.mock('#/utils/bugsink', () => ({
  captureError: vi.fn(),
  setBugsinkTag: vi.fn(),
}));

vi.mock('#/api/core/tenant', () => ({
  createTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getActiveTenantId: vi.fn().mockReturnValue('tenant-1'),
  listTenants: vi.fn().mockResolvedValue([
    { id: 'tenant-1', name: 'Tenant One', slug: 't1', status: 'active' },
    { id: 'tenant-2', name: 'Tenant Two', slug: 't2', status: 'active' },
  ]),
  setActiveTenantId: vi.fn(),
  updateTenant: vi.fn(),
}));

describe('useTenantStore Pinia store TDD suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const accessStore = useAccessStore();
    accessStore.setAccessToken('mock-access-token');
    vi.clearAllMocks();
  });

  it('initializes with activeTenantId from storage', () => {
    const store = useTenantStore();
    expect(store.activeTenantId).toBe('tenant-1');
    expect(store.tenants).toEqual([]);
    expect(store.activeTenant).toBeNull();
  });

  it('fetchTenants populates store and resolves activeTenant correctly', async () => {
    const store = useTenantStore();
    await store.fetchTenants();

    expect(store.tenants.length).toBe(2);
    expect(store.activeTenant?.name).toBe('Tenant One');
  });

  it('fetchTenants returns local tenant and skips listTenants when unauthenticated', async () => {
    const accessStore = useAccessStore();
    accessStore.setAccessToken(null);
    const store = useTenantStore();
    const result = await store.fetchTenants();
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(store.tenants[0]?.id).toBe('local-default');
    expect(store.activeTenant?.id).toBe('local-default');
  });

  it('setTenant updates active tenant and dispatches custom event', () => {
    const store = useTenantStore();
    store.tenants = [
      {
        id: 'tenant-1',
        name: 'Tenant One',
        slug: 't1',
        status: 'active',
        created_at: '',
        updated_at: '',
        avatar_url: null,
        created_by: null,
      },
      {
        id: 'tenant-2',
        name: 'Tenant Two',
        slug: 't2',
        status: 'active',
        created_at: '',
        updated_at: '',
        avatar_url: null,
        created_by: null,
      },
    ];

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    store.setTenant('tenant-2', true);

    expect(store.activeTenantId).toBe('tenant-2');
    expect(store.activeTenant?.name).toBe('Tenant Two');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('supports local tenant create, update, delete, and protects local-default', async () => {
    const accessStore = useAccessStore();
    accessStore.setAccessToken(null);
    const store = useTenantStore();
    await store.fetchTenants();

    const created = await store.createTenant({
      name: 'QA Lab',
      slug: 'qa-lab',
    });
    expect(created.slug).toBe('qa-lab');
    expect(store.activeTenantId).toBe(created.id);

    await expect(
      store.createTenant({ name: 'Duplicate', slug: 'qa-lab' }),
    ).rejects.toThrow('page.tenant.duplicate_slug');

    const renamed = await store.updateTenant(created.id, {
      name: 'QA Studio',
    });
    expect(renamed.name).toBe('QA Studio');

    await expect(store.deleteTenant('local-default')).rejects.toThrow(
      'page.tenant.cannot_delete_default',
    );

    await store.deleteTenant(created.id);
    expect(store.activeTenantId).toBe('local-default');
  });

  it('blocks tenant deletion when daemon reports running browsers and cascades offline cleanup', async () => {
    const accessStore = useAccessStore();
    accessStore.setAccessToken(null);
    const store = useTenantStore();
    await store.fetchTenants();
    const created = await store.createTenant({
      name: 'Temp Tenant',
      slug: 'temp-tenant',
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce({
      json: async () => [{ id: 'prf_running', isOnline: true }],
      ok: true,
    } as Response);

    await expect(store.deleteTenant(created.id)).rejects.toThrow(
      'page.tenant.running_browsers_block',
    );

    fetchMock.mockResolvedValueOnce({
      json: async () => [{ id: 'prf_offline', isOnline: false }],
      ok: true,
    } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    await store.deleteTenant(created.id);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/api/v1/browsers/batch/delete',
      expect.objectContaining({
        body: JSON.stringify({ force: false, ids: ['prf_offline'] }),
        method: 'POST',
      }),
    );
    fetchMock.mockRestore();
  });
});
