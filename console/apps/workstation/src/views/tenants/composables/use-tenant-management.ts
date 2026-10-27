import type { Tenant } from '#/api';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { toast } from '@operon-core/shadcn-ui';

import { getActiveTenantId, setActiveTenantId } from '#/api';
import { $t } from '#/locales';

/**
 * Composable managing workspace/tenant active state and navigation.
 * Adheres to Single Responsibility Principle (SRP).
 */
export function useTenantManagement() {
  const router = useRouter();
  const tenants = ref<Tenant[]>([]);
  const activeTenantId = ref(getActiveTenantId());

  const activeTenant = computed(() => {
    return (
      tenants.value.find((t) => t.id === activeTenantId.value) ||
      tenants.value[0] ||
      null
    );
  });

  function selectTenant(record: Tenant) {
    activeTenantId.value = record.id;
    setActiveTenantId(record.id);
    toast.success($t('page.workspace.switched_to', { name: record.name }));
  }

  function connectCli(record?: Tenant) {
    const targetId = record?.id || activeTenantId.value;
    router.push(
      `/auth/desktop?machine_name=Local Workstation&tenant_id=${encodeURIComponent(targetId)}`,
    );
  }

  function setActiveTenant(id: string) {
    activeTenantId.value = id;
    setActiveTenantId(id);
  }

  return {
    activeTenant,
    activeTenantId,
    connectCli,
    selectTenant,
    setActiveTenant,
    tenants,
  };
}
