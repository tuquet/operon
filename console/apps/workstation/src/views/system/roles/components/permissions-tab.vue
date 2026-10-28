<script lang="ts" setup>
import type { SystemPermission } from '#/api';

import { usePreferences } from '@operon/preferences';

import { Button } from '@operon-core/shadcn-ui';

import { Check, Copy, Folder, KeyRound } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { filterSystemPermissions } from '#/api';
import RoleBadge from '#/components/iam/role-badge.vue';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

interface Props {
  allPermissions: SystemPermission[];
  rolesByPermissionMap: Record<string, string[]>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  refresh: [];
}>();

const { isMobile } = usePreferences();
const { copyToClipboard, isCopied } = useClipboard();

function handleCopyKey(text: string) {
  copyToClipboard(text, text);
}

function getModuleOptions() {
  return [
    { label: $t('page.system_view.roles_module_all'), value: 'all' },
    { label: $t('page.system_view.roles_module_core_iam'), value: 'core-iam' },
    { label: $t('page.system_view.roles_module_workers'), value: 'workers' },
    {
      label: $t('page.system_view.roles_module_automation'),
      value: 'automation',
    },
    {
      label: $t('page.system_view.roles_module_subscriptions'),
      value: 'subscriptions',
    },
    { label: $t('page.system_view.roles_module_storage'), value: 'storage' },
    { label: $t('page.system_view.roles_module_webhooks'), value: 'webhooks' },
  ];
}

function getPermColumns() {
  return [
    {
      field: 'id',
      title: $t('page.system_view.perms_col_id'),
      align: 'left' as const,
      slots: { default: 'perm-id-cell' },
    },
    {
      field: 'module',
      title: $t('page.system_view.roles_col_module'),
      align: 'left' as const,
      slots: { default: 'perm-module-cell' },
    },
    {
      field: 'description',
      title: $t('page.system_view.perms_col_desc'),
      align: 'left' as const,
      slots: { default: 'perm-desc-cell' },
    },
    {
      field: 'roles',
      title: $t('page.system_view.roles_col_assigned_roles'),
      align: 'left' as const,
      slots: { default: 'perm-roles-cell' },
    },
  ];
}

const [PermissionsGrid, permissionsGridApi] = useVbenVxeGrid<SystemPermission>({
  separator: false,
  detailSheetOptions: {
    resource: 'public.permissions',
    subtitleField: 'id',
    titleField: 'id',
    onCreated: async () => {
      emit('refresh');
    },
    onSaved: async () => {
      emit('refresh');
    },
  },
  formOptions: {
    commonConfig: {
      componentProps: {
        class: 'w-full',
      },
      hideLabel: isMobile.value,
    },
    schema: [
      {
        component: 'Select',
        fieldName: 'module',
        label: () => $t('page.system_view.roles_filter_module'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.system_view.roles_module_all'),
          options: getModuleOptions(),
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.system_view.roles_search_placeholder'),
          clearable: true,
        }),
      },
    ],
  },
  gridOptions: {
    columns: getPermColumns,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const filtered = filterSystemPermissions(props.allPermissions, {
            module: formValues.module,
            search: formValues.search,
          });
          return paginateArray(filtered, page);
        },
      },
    },
    toolbarConfig: {
      custom: true,
      refresh: { query: async () => emit('refresh') },
    },
  },
});

defineExpose({
  reload: () => permissionsGridApi.reload(),
});
</script>

<template>
  <PermissionsGrid class="permissions-vxe-grid">
    <template #perm-id-cell="{ row }">
      <div class="inline-flex items-center gap-1">
        <Badge variant="secondary">
          {{ row.id }}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:text-foreground"
          :title="$t('common.copy')"
          @click="handleCopyKey(row.id)"
        >
          <Check v-if="isCopied(row.id)" class="size-3 text-success" />
          <Copy v-else class="size-3" />
        </Button>
      </div>
    </template>

    <template #perm-module-cell="{ row }">
      <div class="flex items-center gap-1">
        <Folder class="size-3.5 text-muted-foreground" />
        <span class="capitalize text-foreground">{{ row.module }}</span>
      </div>
    </template>

    <template #perm-desc-cell="{ row }">
      <span class="text-muted-foreground">
        {{ row.description }}
      </span>
    </template>

    <template #perm-roles-cell="{ row }">
      <div class="flex flex-wrap items-center gap-1">
        <template v-if="(rolesByPermissionMap[row.id] ?? []).length > 0">
          <RoleBadge
            v-for="role in rolesByPermissionMap[row.id]"
            :key="role"
            :role="role"
          />
        </template>
        <span v-else class="italic text-muted-foreground">
          {{ $t('page.system_view.roles_unassigned') }}
        </span>
      </div>
    </template>

    <template #empty>
      <div
        class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
      >
        <KeyRound class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
        <p class="text-foreground">
          {{ $t('page.system_view.roles_empty_title') }}
        </p>
        <p class="text-muted-foreground max-w-sm mt-1">
          {{ $t('page.system_view.roles_empty_desc') }}
        </p>
      </div>
    </template>
  </PermissionsGrid>
</template>
