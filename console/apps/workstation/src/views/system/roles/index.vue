<script lang="ts" setup>
import type { SystemPermission, SystemRole } from '#/api';
import type { EffectiveAccess } from '#/api/core/access';

import { computed, onMounted, ref, watch } from 'vue';

import { Page } from '@operon/common-ui';

import {
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
} from '@operon-core/shadcn-ui';

import { RefreshCw } from '@lucide/vue';

import {
  listSystemPermissions,
  listSystemRoles,
  sortRoleNamesByPriority,
} from '#/api';
import { getEffectiveAccess } from '#/api/core/access';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

import PermissionsTab from './components/permissions-tab.vue';
import RolesTab from './components/roles-tab.vue';

defineOptions({ name: 'SystemRoles' });

const activeTab = ref<'permissions' | 'roles'>('roles');
const allRoles = ref<SystemRole[]>([]);
const allPermissions = ref<SystemPermission[]>([]);
const effectiveAccess = ref<EffectiveAccess | null>(null);
const catalogLoaded = ref(false);
const loadingCatalog = ref(false);

const rolesTabRef = ref<InstanceType<typeof RolesTab> | null>(null);
const permsTabRef = ref<InstanceType<typeof PermissionsTab> | null>(null);

let loadPromise: null | Promise<void> = null;

async function ensureCatalogLoaded(force = false): Promise<void> {
  if (catalogLoaded.value && !force) {
    return;
  }
  if (loadPromise && !force) {
    return loadPromise;
  }

  loadingCatalog.value = true;
  loadPromise = (async () => {
    try {
      const [rolesData, permsData, accessData] = await Promise.all([
        listSystemRoles(),
        listSystemPermissions(),
        getEffectiveAccess().catch(() => null),
      ]);
      allRoles.value = rolesData;
      allPermissions.value = permsData;
      effectiveAccess.value = accessData;
      catalogLoaded.value = true;
    } catch (error: any) {
      captureError(error, {
        action: 'ensureCatalogLoaded',
        view: 'SystemRoles',
      });
      toast.error(error.message || $t('page.system_view.roles_load_error'));
    } finally {
      loadingCatalog.value = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

const rolesByPermissionMap = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {};
  for (const role of allRoles.value) {
    for (const permId of role.permissions) {
      if (!map[permId]) {
        map[permId] = [];
      }
      map[permId].push(role.name);
    }
  }
  for (const permId of Object.keys(map)) {
    map[permId] = sortRoleNamesByPriority(map[permId] ?? []);
  }
  return map;
});

async function reloadCurrentTab() {
  await ensureCatalogLoaded(true);
  if (activeTab.value === 'roles') {
    rolesTabRef.value?.reload();
  } else {
    permsTabRef.value?.reload();
  }
}

watch(activeTab, () => {
  if (activeTab.value === 'roles') {
    rolesTabRef.value?.reload();
  } else {
    permsTabRef.value?.reload();
  }
});

onMounted(() => {
  ensureCatalogLoaded();
});
</script>

<template>
  <Page
    :title="$t('page.system.roles')"
    :description="$t('page.system_view.roles_page_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.roles') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ activeTab === 'roles' ? allRoles.length : allPermissions.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 items-center gap-2">
        <Tabs v-model="activeTab" class="w-auto">
          <TabsList class="h-8 p-0.5">
            <TabsTrigger value="roles" class="h-7 px-3">
              {{ $t('term.roles') }}
              <Badge variant="secondary" class="ml-1.5 px-1 py-0 text-3xs">
                {{ allRoles.length }}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="permissions" class="h-7 px-3">
              {{ $t('term.permissions') }}
              <Badge variant="secondary" class="ml-1.5 px-1 py-0 text-3xs">
                {{ allPermissions.length }}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          :disabled="loadingCatalog"
          @click="reloadCurrentTab"
        >
          <RefreshCw
            class="size-3.5 shrink-0"
            :class="{ 'animate-spin': loadingCatalog }"
          />
        </Button>
      </div>
    </template>

    <!-- Content Card -->
    <div
      class="overflow-hidden rounded-xl border border-border/60 bg-card p-3 sm:p-5 shadow-xs"
    >
      <RolesTab
        v-if="activeTab === 'roles'"
        ref="rolesTabRef"
        :all-roles="allRoles"
        :effective-access="effectiveAccess"
        @refresh="reloadCurrentTab"
      />

      <PermissionsTab
        v-else
        ref="permsTabRef"
        :all-permissions="allPermissions"
        :roles-by-permission-map="rolesByPermissionMap"
        @refresh="reloadCurrentTab"
      />
    </div>
  </Page>
</template>
