import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceStore } from '../workspace';

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
  getActiveTenantId: vi.fn().mockReturnValue('tenant-1'),
  listTenants: vi.fn().mockResolvedValue([
    { id: 'tenant-1', name: 'Tenant One', slug: 't1', status: 'active' },
    { id: 'tenant-2', name: 'Tenant Two', slug: 't2', status: 'active' },
  ]),
  setActiveTenantId: vi.fn(),
}));

describe('useWorkspaceStore Pinia store TDD suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with activeWorkspaceId from storage', () => {
    const store = useWorkspaceStore();
    expect(store.activeWorkspaceId).toBe('tenant-1');
    expect(store.workspaces).toEqual([]);
    expect(store.activeWorkspace).toBeNull();
  });

  it('fetchWorkspaces populates store and resolves activeWorkspace correctly', async () => {
    const store = useWorkspaceStore();
    await store.fetchWorkspaces();

    expect(store.workspaces.length).toBe(2);
    expect(store.activeWorkspace?.name).toBe('Tenant One');
  });

  it('setWorkspace updates active workspace and dispatches custom event', () => {
    const store = useWorkspaceStore();
    store.workspaces = [
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
    store.setWorkspace('tenant-2', true);

    expect(store.activeWorkspaceId).toBe('tenant-2');
    expect(store.activeWorkspace?.name).toBe('Tenant Two');
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
