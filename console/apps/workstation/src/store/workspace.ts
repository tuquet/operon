import type { Tenant } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { toast } from '@operon-core/shadcn-ui';

import { defineStore } from 'pinia';

import {
  createTenant,
  getActiveTenantId,
  listTenants,
  setActiveTenantId,
} from '#/api/core/tenant';
import { $t } from '#/locales';
import { captureError, setBugsinkTag } from '#/utils/bugsink';

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Tenant[]>([]);
  const activeWorkspaceId = ref<string>(getActiveTenantId());
  const isLoading = ref<boolean>(false);

  const activeWorkspace = computed<null | Tenant>(() => {
    if (workspaces.value.length === 0) return null;
    return (
      workspaces.value.find((w) => w.id === activeWorkspaceId.value) ||
      workspaces.value[0] ||
      null
    );
  });

  async function fetchWorkspaces(force = false) {
    if (workspaces.value.length > 0 && !force) {
      return workspaces.value;
    }
    try {
      isLoading.value = true;
      const list = await listTenants();
      workspaces.value = Array.isArray(list) ? list : [];

      // If active workspace is not set or not in current list, pick first
      const currentActiveExists = workspaces.value.some(
        (w) => w.id === activeWorkspaceId.value,
      );
      if (!currentActiveExists && workspaces.value.length > 0) {
        const first = workspaces.value[0];
        if (first?.id) {
          activeWorkspaceId.value = first.id;
          setActiveTenantId(first.id);
        }
      }
      if (activeWorkspaceId.value) {
        setBugsinkTag('workspace_id', activeWorkspaceId.value);
      }
      return workspaces.value;
    } catch (error) {
      captureError(error, { action: 'fetchWorkspaces' });
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  function setWorkspace(id: string, notify = true) {
    if (activeWorkspaceId.value === id) return;
    const target = workspaces.value.find((w) => w.id === id);
    activeWorkspaceId.value = id;
    setActiveTenantId(id);
    setBugsinkTag('workspace_id', id);

    if (notify && target) {
      toast.success($t('page.workspace.switched_to', { name: target.name }));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('opn:workspace-changed', {
          detail: { tenantId: id, tenant: target },
        }),
      );
    }
  }

  async function createWorkspace(data: {
    name: string;
    plan?: string;
    slug: string;
  }) {
    try {
      isLoading.value = true;
      const created = await createTenant(data);
      if (created?.id) {
        workspaces.value = [created, ...workspaces.value];
        setWorkspace(created.id, true);
        toast.success(
          $t('page.workspace.create_success', { name: created.name }),
        );
      }
      return created;
    } catch (error: any) {
      captureError(error, { action: 'createWorkspace', slug: data.slug });
      toast.error(error?.message || $t('page.workspace.create_failed'));
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  function $reset() {
    workspaces.value = [];
    activeWorkspaceId.value = '';
    setBugsinkTag('workspace_id', null);
    isLoading.value = false;
  }

  return {
    $reset,
    activeWorkspace,
    activeWorkspaceId,
    createWorkspace,
    fetchWorkspaces,
    isLoading,
    setWorkspace,
    workspaces,
  };
});
