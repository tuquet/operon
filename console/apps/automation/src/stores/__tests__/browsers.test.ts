import { nextTick, reactive } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrowsersStore } from '../browsers';

const mockFetch = vi.fn();
const mockTenantState = reactive({
  activeId: 'local-default',
  activeName: 'Local Tenant',
  activeSlug: 'local',
  isLoading: false,
  items: [],
});

vi.mock('@operon/kernel', () => ({
  useKernel: () => ({
    api: {
      daemonPort: 8765,
      localDaemonFetch: mockFetch,
    },
    events: {
      navigate: vi.fn(),
      notify: vi.fn(),
      openLoginModal: vi.fn(),
    },
    tenant: mockTenantState,
  }),
}));

const sampleBrowsers = [
  {
    createdAt: '2026-01-01T00:00:00Z',
    extensions: ['automation'],
    fingerprintConfig: {
      deviceMemoryGb: 16,
      hardwareConcurrency: 8,
      osPlatform: 'windows',
      seed: 101,
    },
    groupName: 'marketing',
    id: 'prf_1',
    isDefault: true,
    isOnline: false,
    name: 'Marketing Profile',
    proxy: 'socks5://127.0.0.1:1080',
    startupFlags: [],
    tags: ['sea'],
    tenantId: 'local-default',
    timezone: 'UTC',
    updatedAt: '2026-01-01T00:00:00Z',
    userAgent: null,
  },
  {
    createdAt: '2026-01-02T00:00:00Z',
    extensions: ['automation'],
    fingerprintConfig: {
      deviceMemoryGb: 8,
      hardwareConcurrency: 4,
      osPlatform: 'macos',
      seed: 202,
    },
    groupName: 'qa',
    id: 'prf_2',
    isDefault: false,
    isOnline: true,
    name: 'QA Running',
    proxy: null,
    startupFlags: [],
    tags: ['vip'],
    tenantId: 'local-default',
    timezone: 'UTC',
    updatedAt: '2026-01-02T00:00:00Z',
    userAgent: null,
  },
];

describe('useBrowsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockTenantState.activeId = 'local-default';
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(sampleBrowsers);
  });

  it('fetches tenant-scoped browsers and computes stats & filters', async () => {
    const store = useBrowsersStore();
    await store.fetchBrowsers();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/browsers?tenantId=local-default&scope=tenant',
    );
    expect(store.stats).toEqual({
      direct: 1,
      proxied: 1,
      running: 1,
      selected: 0,
      total: 2,
    });

    store.statusFilter = 'online';
    expect(store.filteredItems.map((b) => b.id)).toEqual(['prf_2']);

    store.statusFilter = 'all';
    store.platformFilter = 'windows';
    expect(store.filteredItems.map((b) => b.id)).toEqual(['prf_1']);
  });

  it('reacts to kernel.tenant.activeId switches and clears selection', async () => {
    const store = useBrowsersStore();
    await store.fetchBrowsers();
    store.toggleSelected('prf_1');
    store.detailTarget = sampleBrowsers[0] ?? null;
    expect(store.selectedIds).toEqual(['prf_1']);

    mockTenantState.activeId = 'tenant-alpha';
    await nextTick();

    expect(store.selectedIds).toEqual([]);
    expect(store.detailTarget).toBeNull();
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/v1/browsers?tenantId=tenant-alpha&scope=tenant',
    );
  });

  it('creates, patches, and deletes browser profiles against daemon API', async () => {
    const store = useBrowsersStore();
    await store.fetchBrowsers();

    await store.createProfile({ name: 'New Profile' });
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/browsers', {
      body: JSON.stringify({ name: 'New Profile', tenantId: 'local-default' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const patchedRecord = { ...sampleBrowsers[0], name: 'Renamed' };
    mockFetch.mockResolvedValueOnce(patchedRecord);
    const updated = await store.patchProfile('prf_1', { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');

    mockFetch.mockResolvedValueOnce({ message: 'deleted', success: true });
    await store.removeProfile('prf_1', true);
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/v1/browsers/prf_1?force=true',
      { method: 'DELETE' },
    );
    expect(store.items.some((b) => b.id === 'prf_1')).toBe(false);
  });
});
