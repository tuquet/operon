import type {
  BrowserProfileRecord,
  CloneBrowserInput,
  CreateBrowserInput,
  PatchBrowserPatch,
  ProbeProxyResult,
  StartSessionInput,
} from '../api/browsers';

import { computed, ref, watch } from 'vue';

import { useKernel } from '@operon/kernel';

import { defineStore } from 'pinia';

import { createBrowserApi } from '../api/browsers';

export type ScopeMode = 'all' | 'tenant';

export const useBrowsersStore = defineStore('automation:browsers', () => {
  const kernel = useKernel();
  const api = createBrowserApi(kernel.api);

  const items = ref<BrowserProfileRecord[]>([]);
  const loading = ref(false);
  const error = ref<null | string>(null);
  const detailTarget = ref<BrowserProfileRecord | null>(null);
  const detailLoading = ref(false);

  const scopeMode = ref<ScopeMode>('tenant');
  const searchQuery = ref('');
  const statusFilter = ref<'all' | 'offline' | 'online'>('all');
  const proxyFilter = ref<'all' | 'direct' | 'proxied'>('all');
  const platformFilter = ref<'all' | 'linux' | 'macos' | 'windows'>('all');

  const selectedIds = ref<string[]>([]);
  const mutatingIds = ref<string[]>([]);

  let eventSource: EventSource | null = null;
  let refreshTimer: null | ReturnType<typeof setTimeout> = null;

  const activeTenantId = computed(() => kernel.tenant.activeId || 'local-default');

  const filteredItems = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return items.value.filter((item) => {
      if (statusFilter.value === 'online' && !item.isOnline) return false;
      if (statusFilter.value === 'offline' && item.isOnline) return false;

      const hasProxy = Boolean(item.proxy?.trim());
      if (proxyFilter.value === 'proxied' && !hasProxy) return false;
      if (proxyFilter.value === 'direct' && hasProxy) return false;

      const os = (item.fingerprintConfig?.osPlatform || 'windows').toLowerCase();
      if (platformFilter.value !== 'all' && os !== platformFilter.value) {
        return false;
      }

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.groupName || '').toLowerCase().includes(q) ||
        (item.proxy || '').toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  });

  const stats = computed(() => {
    const total = items.value.length;
    const running = items.value.filter((b) => b.isOnline).length;
    const proxied = items.value.filter((b) => Boolean(b.proxy?.trim())).length;
    const direct = total - proxied;
    return {
      direct,
      proxied,
      running,
      selected: selectedIds.value.length,
      total,
    };
  });

  const selectedProfiles = computed(() => {
    const idSet = new Set(selectedIds.value);
    return items.value.filter((b) => idSet.has(b.id));
  });

  const allFilteredSelected = computed(() => {
    if (filteredItems.value.length === 0) return false;
    const idSet = new Set(selectedIds.value);
    return filteredItems.value.every((b) => idSet.has(b.id));
  });

  function setMutating(id: string, active: boolean) {
    if (active) {
      if (!mutatingIds.value.includes(id)) {
        mutatingIds.value = [...mutatingIds.value, id];
      }
    } else {
      mutatingIds.value = mutatingIds.value.filter((item) => item !== id);
    }
  }

  function isMutating(id: string): boolean {
    return mutatingIds.value.includes(id);
  }

  function toggleSelected(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((item) => item !== id);
    } else {
      selectedIds.value = [...selectedIds.value, id];
    }
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected.value) {
      const visible = new Set(filteredItems.value.map((b) => b.id));
      selectedIds.value = selectedIds.value.filter((id) => !visible.has(id));
    } else {
      const merged = new Set(selectedIds.value);
      for (const b of filteredItems.value) {
        merged.add(b.id);
      }
      selectedIds.value = [...merged];
    }
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  async function fetchBrowsers(silent = false) {
    if (!silent) {
      loading.value = true;
    }
    error.value = null;
    try {
      const list = await api.list({
        scope: scopeMode.value,
        tenantId:
          scopeMode.value === 'tenant' ? activeTenantId.value : undefined,
      });
      items.value = Array.isArray(list) ? list : [];

      const validIds = new Set(items.value.map((b) => b.id));
      selectedIds.value = selectedIds.value.filter((id) => validIds.has(id));

      if (detailTarget.value) {
        const refreshed = items.value.find(
          (b) => b.id === detailTarget.value?.id,
        );
        if (refreshed) {
          detailTarget.value = { ...detailTarget.value, ...refreshed };
        }
      }
      return items.value;
    } catch (err: any) {
      error.value = err?.message || 'Failed to load browser profiles';
      return items.value;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  async function inspectBrowser(id: string) {
    detailLoading.value = true;
    try {
      const detail = await api.detail(id);
      detailTarget.value = detail;
      return detail;
    } finally {
      detailLoading.value = false;
    }
  }

  async function createProfile(input: CreateBrowserInput) {
    const res = await api.create({
      ...input,
      tenantId: input.tenantId || activeTenantId.value,
    });
    await fetchBrowsers(true);
    return res;
  }

  async function patchProfile(id: string, patch: PatchBrowserPatch) {
    setMutating(id, true);
    try {
      const updated = await api.patch(id, patch);
      items.value = items.value.map((b) => (b.id === id ? updated : b));
      if (detailTarget.value?.id === id) {
        detailTarget.value = updated;
      }
      return updated;
    } finally {
      setMutating(id, false);
    }
  }

  async function removeProfile(id: string, force = false) {
    setMutating(id, true);
    try {
      await api.remove(id, force);
      items.value = items.value.filter((b) => b.id !== id);
      selectedIds.value = selectedIds.value.filter((item) => item !== id);
      if (detailTarget.value?.id === id) {
        detailTarget.value = null;
      }
    } finally {
      setMutating(id, false);
    }
  }

  async function unbindProfile(id: string) {
    setMutating(id, true);
    try {
      const res = await api.unbind(id);
      await fetchBrowsers(true);
      return res;
    } finally {
      setMutating(id, false);
    }
  }

  async function launchProfile(id: string, opts: StartSessionInput = {}) {
    setMutating(id, true);
    try {
      const res = await api.startSession(id, opts);
      await fetchBrowsers(true);
      return res;
    } finally {
      setMutating(id, false);
    }
  }

  async function stopProfile(id: string, force = false) {
    setMutating(id, true);
    try {
      const res = await api.stopSession(id, force);
      await fetchBrowsers(true);
      return res;
    } finally {
      setMutating(id, false);
    }
  }

  async function makeDefaultProfile(id: string) {
    setMutating(id, true);
    try {
      await api.setDefault(id);
      await fetchBrowsers(true);
    } finally {
      setMutating(id, false);
    }
  }

  async function cloneProfile(id: string, input: CloneBrowserInput = {}) {
    setMutating(id, true);
    try {
      const cloned = await api.clone(id, input);
      await fetchBrowsers(true);
      return cloned;
    } finally {
      setMutating(id, false);
    }
  }

  async function moveProfileToTenant(id: string, targetTenantId: string) {
    setMutating(id, true);
    try {
      const moved = await api.move(id, { targetTenantId });
      await fetchBrowsers(true);
      if (detailTarget.value?.id === id) {
        detailTarget.value =
          scopeMode.value === 'tenant' && targetTenantId !== activeTenantId.value
            ? null
            : moved;
      }
      return moved;
    } finally {
      setMutating(id, false);
    }
  }

  async function probeProxy(proxy: string): Promise<ProbeProxyResult> {
    return await api.probeProxy({ proxy, timeoutSecs: 5 });
  }

  async function updateExtensions(
    id: string,
    extensions: string[],
    allowRemoveAutomation = false,
  ) {
    setMutating(id, true);
    try {
      const updated = await api.updateExtensions(
        id,
        extensions,
        allowRemoveAutomation,
      );
      items.value = items.value.map((b) => (b.id === id ? updated : b));
      if (detailTarget.value?.id === id) {
        detailTarget.value = updated;
      }
      return updated;
    } finally {
      setMutating(id, false);
    }
  }

  async function batchLaunchSelected() {
    const offline = selectedProfiles.value.filter((b) => !b.isOnline);
    let started = 0;
    for (const profile of offline) {
      try {
        await launchProfile(profile.id);
        started += 1;
      } catch {
        // continue remaining rows
      }
    }
    return { started, total: offline.length };
  }

  async function batchStopSelected() {
    const running = selectedProfiles.value.filter((b) => b.isOnline);
    let stopped = 0;
    for (const profile of running) {
      try {
        await stopProfile(profile.id);
        stopped += 1;
      } catch {
        // continue remaining rows
      }
    }
    return { stopped, total: running.length };
  }

  async function batchRemoveSelected(force = false) {
    const ids = [...selectedIds.value];
    if (ids.length === 0) {
      return { deleted: [], errors: [], skipped: [] };
    }
    const res = await api.batchDelete(ids, force);
    await fetchBrowsers(true);
    return res;
  }

  async function importCsv(csvString: string) {
    const res = await api.importCsv(csvString, activeTenantId.value);
    if (res.imported > 0) {
      await fetchBrowsers(true);
    }
    return res;
  }

  async function autoDetect() {
    const list = await api.autoDetect();
    await fetchBrowsers(true);
    return list;
  }

  function scheduleSilentRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      void fetchBrowsers(true);
    }, 150);
  }

  function subscribeEvents() {
    if (typeof EventSource === 'undefined' || eventSource) return;
    try {
      eventSource = new EventSource(
        `http://127.0.0.1:${kernel.api.daemonPort}/api/v1/events`,
      );
      eventSource.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (
            data?.type === 'browser_changed' ||
            data?.type === 'browser_online' ||
            data?.type === 'browser_offline' ||
            data?.type === 'settings_updated' ||
            data?.type === 'tenant_switched'
          ) {
            scheduleSilentRefresh();
          }
        } catch {
          // ignore keepalive / non-JSON frames
        }
      };
    } catch {
      // ignore SSE connection errors while offline
    }
  }

  function unsubscribeEvents() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  watch(activeTenantId, () => {
    clearSelection();
    detailTarget.value = null;
    if (scopeMode.value === 'tenant') {
      void fetchBrowsers();
    }
  });

  watch(scopeMode, () => {
    clearSelection();
    void fetchBrowsers();
  });

  return {
    activeTenantId,
    allFilteredSelected,
    autoDetect,
    batchLaunchSelected,
    batchRemoveSelected,
    batchStopSelected,
    clearSelection,
    cloneProfile,
    createProfile,
    detailLoading,
    detailTarget,
    error,
    fetchBrowsers,
    filteredItems,
    importCsv,
    inspectBrowser,
    isMutating,
    items,
    launchProfile,
    loading,
    makeDefaultProfile,
    moveProfileToTenant,
    mutatingIds,
    patchProfile,
    platformFilter,
    probeProxy,
    proxyFilter,
    removeProfile,
    scopeMode,
    searchQuery,
    selectedIds,
    selectedProfiles,
    stats,
    statusFilter,
    stopProfile,
    subscribeEvents,
    toggleSelectAllFiltered,
    toggleSelected,
    unbindProfile,
    unsubscribeEvents,
    updateExtensions,
  };
});
