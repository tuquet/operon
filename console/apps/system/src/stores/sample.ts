import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Sample Pinia store for @operon/system.
 * Note the namespaced store ID: 'system:sample' to avoid collisions in Shell.
 */
export const useSystemSampleStore = defineStore('system:sample', () => {
  const activeTab = ref<'audit' | 'overview' | 'plugins' | 'roles' | 'users'>(
    'overview',
  );
  const selectedRole = ref<string>('superadmin');

  function setTab(tab: 'audit' | 'overview' | 'plugins' | 'roles' | 'users') {
    activeTab.value = tab;
  }

  function setRole(role: string) {
    selectedRole.value = role;
  }

  return {
    activeTab,
    selectedRole,
    setRole,
    setTab,
  };
});
