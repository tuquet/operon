import type { Tenant, TenantStatus } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { TENANT_STATUS } from '@operon/constants';
import { useAccessStore } from '@operon/stores';

import { toast } from '@operon-core/shadcn-ui';

import { defineStore } from 'pinia';

import {
  createTenant as createCloudTenant,
  deleteTenant as deleteCloudTenant,
  getActiveTenantId,
  listTenants,
  setActiveTenantId,
  updateTenant as updateCloudTenant,
} from '#/api/core/tenant';
import { $t } from '#/locales';
import { captureError, setBugsinkTag } from '#/utils/bugsink';

export const LOCAL_DEFAULT_TENANT_ID = 'local-default';
const LOCAL_TENANTS_KEY = 'operon:local-tenants';

export interface TenantPatchInput {
  name?: string;
  plan?: string;
  slug?: string;
  status?: TenantStatus;
}

function createDefaultLocalTenant(): Tenant {
  const now = new Date().toISOString();
  return {
    avatar_url: null,
    created_at: now,
    created_by: 'local',
    id: LOCAL_DEFAULT_TENANT_ID,
    metadata: { plan: 'local' },
    name: $t('page.tenant.local_tenant'),
    slug: 'local',
    status: TENANT_STATUS.ACTIVE,
    updated_at: now,
  };
}

function loadLocalTenants(): Tenant[] {
  try {
    const raw = localStorage.getItem(LOCAL_TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Tenant[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to default local tenant
  }
  const initial = [createDefaultLocalTenant()];
  saveLocalTenants(initial);
  return initial;
}

function saveLocalTenants(list: Tenant[]) {
  try {
    localStorage.setItem(LOCAL_TENANTS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/[\s_]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

async function syncDaemonTenant(targetId: string) {
  if (typeof fetch === 'undefined') return;
  try {
    await fetch('http://127.0.0.1:8765/api/v1/system/tenants/switch', {
      body: JSON.stringify({ target: targetId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  } catch {
    // Daemon may be offline in web preview; non-blocking
  }
}

export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<Tenant[]>([]);
  const activeTenantId = ref<string>(getActiveTenantId());
  const isLoading = ref<boolean>(false);

  const activeTenant = computed<null | Tenant>(() => {
    if (tenants.value.length === 0) return null;
    return (
      tenants.value.find((t) => t.id === activeTenantId.value) ||
      tenants.value[0] ||
      null
    );
  });

  function ensureValidActiveTenant() {
    const currentActiveExists = tenants.value.some(
      (t) =>
        t.id === activeTenantId.value && t.status === TENANT_STATUS.ACTIVE,
    );
    if (!currentActiveExists && tenants.value.length > 0) {
      const fallback =
        tenants.value.find((t) => t.status === TENANT_STATUS.ACTIVE) ||
        tenants.value[0];
      if (fallback?.id) {
        activeTenantId.value = fallback.id;
        setActiveTenantId(fallback.id);
      }
    }
    if (activeTenantId.value) {
      setBugsinkTag('tenant_id', activeTenantId.value);
    }
  }

  async function fetchTenants(force = false) {
    const accessStore = useAccessStore();
    if (!accessStore.accessToken) {
      tenants.value = loadLocalTenants();
      ensureValidActiveTenant();
      return tenants.value;
    }

    if (tenants.value.length > 0 && !force) {
      return tenants.value;
    }
    try {
      isLoading.value = true;
      const list = await listTenants();
      tenants.value = Array.isArray(list) ? list : [];
      ensureValidActiveTenant();
      return tenants.value;
    } catch (error) {
      captureError(error, { action: 'fetchTenants' });
      if (tenants.value.length === 0) {
        tenants.value = loadLocalTenants();
      }
      ensureValidActiveTenant();
      return tenants.value;
    } finally {
      isLoading.value = false;
    }
  }

  function setTenant(id: string, notify = true) {
    if (activeTenantId.value === id) return;
    const target = tenants.value.find((t) => t.id === id);
    if (target && target.status !== TENANT_STATUS.ACTIVE) {
      toast.error($t('page.tenant.inactive_switch_blocked'));
      return;
    }

    activeTenantId.value = id;
    setActiveTenantId(id);
    setBugsinkTag('tenant_id', id);

    if (notify && target) {
      toast.success($t('page.tenant.switched_to', { name: target.name }));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('opn:tenant-changed', {
          detail: { tenant: target, tenantId: id },
        }),
      );
    }

    void syncDaemonTenant(id);
  }

  async function createTenant(data: {
    name: string;
    plan?: string;
    slug: string;
  }) {
    const trimmedName = data.name.trim();
    const cleanSlug = normalizeSlug(data.slug || trimmedName);
    if (trimmedName.length < 2 || cleanSlug.length < 2) {
      throw new Error($t('page.tenant.invalid_slug'));
    }

    const duplicateSlug = tenants.value.some(
      (t) => t.slug.toLowerCase() === cleanSlug.toLowerCase(),
    );
    if (duplicateSlug) {
      throw new Error($t('page.tenant.duplicate_slug'));
    }

    const accessStore = useAccessStore();
    if (!accessStore.accessToken) {
      const now = new Date().toISOString();
      const localTenant: Tenant = {
        avatar_url: null,
        created_at: now,
        created_by: 'local',
        id: `local-${crypto.randomUUID().slice(0, 8)}`,
        metadata: { plan: data.plan || 'local' },
        name: trimmedName,
        slug: cleanSlug,
        status: TENANT_STATUS.ACTIVE,
        updated_at: now,
      };
      const current = loadLocalTenants();
      const next = [localTenant, ...current];
      saveLocalTenants(next);
      tenants.value = next;
      setTenant(localTenant.id, false);
      toast.success(
        $t('page.tenant.create_success', { name: localTenant.name }),
      );
      return localTenant;
    }

    try {
      isLoading.value = true;
      const created = await createCloudTenant({
        name: trimmedName,
        plan: data.plan,
        slug: cleanSlug,
      });
      if (created?.id) {
        tenants.value = [created, ...tenants.value];
        setTenant(created.id, true);
        toast.success($t('page.tenant.create_success', { name: created.name }));
      }
      return created;
    } catch (error: any) {
      captureError(error, { action: 'createTenant', slug: cleanSlug });
      toast.error(error?.message || $t('page.tenant.create_failed'));
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTenant(id: string, patch: TenantPatchInput) {
    const existing = tenants.value.find((t) => t.id === id);
    if (!existing) {
      throw new Error($t('page.tenant.not_found'));
    }

    const nextName = patch.name === undefined ? existing.name : patch.name.trim();
    const nextSlug =
      patch.slug === undefined ? existing.slug : normalizeSlug(patch.slug);
    if (nextName.length < 2 || nextSlug.length < 2) {
      throw new Error($t('page.tenant.invalid_slug'));
    }

    const duplicateSlug = tenants.value.some(
      (t) => t.id !== id && t.slug.toLowerCase() === nextSlug.toLowerCase(),
    );
    if (duplicateSlug) {
      throw new Error($t('page.tenant.duplicate_slug'));
    }

    const accessStore = useAccessStore();
    if (!accessStore.accessToken || id.startsWith('local-')) {
      const now = new Date().toISOString();
      const updated: Tenant = {
        ...existing,
        metadata: {
          ...existing.metadata,
          ...(patch.plan ? { plan: patch.plan } : {}),
        },
        name: nextName,
        slug: nextSlug,
        status: patch.status ?? existing.status,
        updated_at: now,
      };
      const next = tenants.value.map((t) => (t.id === id ? updated : t));
      saveLocalTenants(next);
      tenants.value = next;
      if (
        id === activeTenantId.value &&
        updated.status !== TENANT_STATUS.ACTIVE
      ) {
        ensureValidActiveTenant();
      }
      toast.success($t('page.tenant.update_success', { name: updated.name }));
      return updated;
    }

    try {
      isLoading.value = true;
      const updated = await updateCloudTenant(id, {
        metadata: existing.metadata,
        name: nextName,
        plan: patch.plan,
        slug: nextSlug,
        status: patch.status,
      });
      tenants.value = tenants.value.map((t) => (t.id === id ? updated : t));
      if (
        id === activeTenantId.value &&
        updated.status !== TENANT_STATUS.ACTIVE
      ) {
        ensureValidActiveTenant();
      }
      toast.success($t('page.tenant.update_success', { name: updated.name }));
      return updated;
    } catch (error: any) {
      captureError(error, { action: 'updateTenant', id });
      toast.error(error?.message || $t('page.tenant.update_failed'));
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTenant(id: string) {
    if (id === LOCAL_DEFAULT_TENANT_ID) {
      const err = new Error($t('page.tenant.cannot_delete_default'));
      toast.error(err.message);
      throw err;
    }

    const existing = tenants.value.find((t) => t.id === id);
    if (!existing) {
      throw new Error($t('page.tenant.not_found'));
    }

    if (tenants.value.length <= 1) {
      const err = new Error($t('page.tenant.cannot_delete_last'));
      toast.error(err.message);
      throw err;
    }

    // Check daemon for active or owned browser profiles under this tenant
    let ownedBrowserIds: string[] = [];
    let runningCount = 0;
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(
          `http://127.0.0.1:8765/api/v1/browsers?tenantId=${encodeURIComponent(id)}&scope=tenant`,
        );
        if (res.ok) {
          const rows = (await res.json()) as Array<{
            id: string;
            isOnline?: boolean;
          }>;
          if (Array.isArray(rows)) {
            runningCount = rows.filter((b) => b.isOnline).length;
            ownedBrowserIds = rows.map((b) => b.id).filter(Boolean);
          }
        }
      } catch {
        // Daemon may be offline in web-only mode; ignore unreachable probe
      }
    }

    if (runningCount > 0) {
      const err = new Error(
        $t('page.tenant.running_browsers_block', {
          count: runningCount,
        }),
      );
      toast.error(err.message);
      throw err;
    }

    const accessStore = useAccessStore();
    if (accessStore.accessToken && !id.startsWith('local-')) {
      try {
        isLoading.value = true;
        await deleteCloudTenant(id);
      } catch (error: any) {
        captureError(error, { action: 'deleteTenant', id });
        toast.error(error?.message || $t('page.tenant.delete_failed'));
        throw error;
      } finally {
        isLoading.value = false;
      }
    }

    const next = tenants.value.filter((t) => t.id !== id);
    if (!accessStore.accessToken || id.startsWith('local-')) {
      saveLocalTenants(next);
    }
    tenants.value = next;

    if (activeTenantId.value === id) {
      const fallback =
        next.find((t) => t.status === TENANT_STATUS.ACTIVE) || next[0];
      if (fallback) {
        setTenant(fallback.id, false);
      }
    }

    if (ownedBrowserIds.length > 0 && typeof fetch !== 'undefined') {
      try {
        await fetch('http://127.0.0.1:8765/api/v1/browsers/batch/delete', {
          body: JSON.stringify({ force: false, ids: ownedBrowserIds }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
      } catch {
        // Non-blocking if daemon went offline mid-request
      }
    }

    toast.success($t('page.tenant.delete_success', { name: existing.name }));
  }

  function $reset() {
    tenants.value = [];
    activeTenantId.value = '';
    setBugsinkTag('tenant_id', null);
    isLoading.value = false;
  }

  return {
    $reset,
    activeTenant,
    activeTenantId,
    createTenant,
    deleteTenant,
    fetchTenants,
    isLoading,
    setTenant,
    tenants,
    updateTenant,
  };
});
