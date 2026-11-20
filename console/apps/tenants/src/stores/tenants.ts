import type {
  CreateKernelTenantInput,
  KernelTenantRecord,
  UpdateKernelTenantPatch,
} from '@operon/kernel';

import { computed, ref } from 'vue';

import { useKernel } from '@operon/kernel';

import { defineStore } from 'pinia';

export type TenantRecord = KernelTenantRecord;

/**
 * Kernel-backed Pinia store for @operon/tenants.
 * Reads and mutates the host shell's reactive tenant context without importing apps/shell.
 */
export const useTenantsStore = defineStore('tenants:store', () => {
  const kernel = useKernel();
  const standaloneFallback = ref<TenantRecord[]>([]);

  const tenants = computed<TenantRecord[]>(() =>
    kernel.tenant.items.length > 0
      ? kernel.tenant.items
      : standaloneFallback.value,
  );

  const activeTenantId = computed(() => kernel.tenant.activeId);

  const activeTenant = computed<null | TenantRecord>(
    () =>
      tenants.value.find((t) => t.id === activeTenantId.value) ||
      tenants.value[0] ||
      null,
  );

  const isLoading = computed(() => kernel.tenant.isLoading);

  async function fetchTenants(force = false) {
    if (kernel.tenant.refresh) {
      return await kernel.tenant.refresh(force);
    }
    return tenants.value;
  }

  function setActiveTenant(id: string) {
    kernel.tenant.switchTenant?.(id);
  }

  async function createTenant(input: CreateKernelTenantInput) {
    if (kernel.tenant.createTenant) {
      return await kernel.tenant.createTenant(input);
    }
    const now = new Date().toISOString();
    const localItem: TenantRecord = {
      avatarUrl: null,
      createdAt: now,
      createdBy: 'local',
      id: `local-${Date.now().toString(36)}`,
      name: input.name,
      plan: input.plan || 'local',
      slug: input.slug,
      status: 'active',
      updatedAt: now,
    };
    standaloneFallback.value = [localItem, ...standaloneFallback.value];
    return localItem;
  }

  async function updateTenant(id: string, patch: UpdateKernelTenantPatch) {
    if (kernel.tenant.updateTenant) {
      return await kernel.tenant.updateTenant(id, patch);
    }
    const existing = standaloneFallback.value.find((t) => t.id === id);
    if (!existing) {
      throw new Error('Tenant not found');
    }
    const updated: TenantRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    standaloneFallback.value = standaloneFallback.value.map((t) =>
      t.id === id ? updated : t,
    );
    return updated;
  }

  async function deleteTenant(id: string) {
    if (kernel.tenant.deleteTenant) {
      await kernel.tenant.deleteTenant(id);
      return;
    }
    standaloneFallback.value = standaloneFallback.value.filter(
      (t) => t.id !== id,
    );
  }

  return {
    activeTenant,
    activeTenantId,
    createTenant,
    deleteTenant,
    fetchTenants,
    isLoading,
    setActiveTenant,
    tenants,
    updateTenant,
  };
});
