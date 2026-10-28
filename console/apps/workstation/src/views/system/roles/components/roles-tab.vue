<script lang="ts" setup>
import type { SystemRole } from '#/api';
import type { EffectiveAccess } from '#/api/core/access';

import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Lock, Plus, ShieldCheck } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { filterSystemRoles } from '#/api';
import RoleBadge from '#/components/iam/role-badge.vue';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

interface Props {
  allRoles: SystemRole[];
  effectiveAccess?: EffectiveAccess | null;
}

const props = withDefaults(defineProps<Props>(), {
  effectiveAccess: null,
});

const emit = defineEmits<{
  refresh: [];
}>();

const { isMobile } = usePreferences();

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

function getRoleColumns() {
  return [
    {
      field: 'name',
      title: $t('term.role'),
      align: 'left' as const,
      slots: { default: 'role-name-cell' },
    },
    {
      field: 'description',
      title: $t('page.system_view.roles_col_policy_desc'),
      align: 'left' as const,
      slots: { default: 'role-desc-cell' },
    },
    {
      field: 'is_system',
      title: $t('page.system_view.plugins_col_type'),
      align: 'left' as const,
      slots: { default: 'role-type-cell' },
    },
    {
      field: 'permissions',
      title: $t('page.system_view.roles_col_assigned_perms'),
      align: 'left' as const,
      slots: { default: 'role-perms-cell' },
    },
    {
      field: 'created_at',
      title: $t('common.createdAt'),
      align: 'left' as const,
      cellRender: { name: 'CellDate' },
    },
  ];
}

const [RolesGrid, rolesGridApi] = useVbenVxeGrid<SystemRole>({
  separator: false,
  detailSheetOptions: {
    resource: 'public.roles',
    subtitleField: 'id',
    titleField: 'name',
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
        fieldName: 'role_type',
        label: () => $t('page.system_view.plugins_filter_type'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.system_view.plugins_type_all'),
          options: [
            { label: $t('page.system_view.plugins_type_all'), value: 'all' },
            {
              label: $t('page.system_view.roles_type_system'),
              value: 'system',
            },
            {
              label: $t('page.system_view.roles_type_custom'),
              value: 'custom',
            },
          ],
        }),
      },
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
    columns: getRoleColumns,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const filtered = filterSystemRoles(props.allRoles, {
            module: formValues.module,
            role_type: formValues.role_type,
            search: formValues.search,
          });
          return paginateArray(filtered, page);
        },
      },
    },
    toolbarConfig: {
      custom: true,
      refresh: { query: async () => emit('refresh') },
      slots: { tools: 'roles-toolbar-tools' },
    },
  },
});

defineExpose({
  reload: () => rolesGridApi.reload(),
});
</script>

<template>
  <RolesGrid class="roles-vxe-grid">
    <template #roles-toolbar-tools>
      <Button
        v-if="effectiveAccess?.isSuperadmin"
        size="sm"
        class="h-8 gap-1"
        @click="rolesGridApi.openCreateSheet({ is_system: false })"
      >
        <Plus class="size-3.5" />
        {{ $t('page.system_view.roles_create_btn') }}
      </Button>
    </template>

    <template #role-name-cell="{ row }">
      <div class="inline-flex items-center gap-1.5 py-1">
        <RoleBadge :role="row.name" />
        <Badge variant="outline">
          {{ row.name }}
        </Badge>
      </div>
    </template>

    <template #role-desc-cell="{ row }">
      <span class="text-muted-foreground">
        {{ row.description || $t('page.system_view.roles_default_desc') }}
      </span>
    </template>

    <template #role-type-cell="{ row }">
      <Badge :variant="row.is_system ? 'default' : 'outline'" class="gap-1">
        <Lock v-if="row.is_system" class="size-3 shrink-0" />
        <span>{{
          row.is_system
            ? $t('page.system_view.roles_type_system')
            : $t('page.system_view.roles_badge_custom')
        }}</span>
      </Badge>
    </template>

    <template #role-perms-cell="{ row }">
      <div class="flex items-center gap-1.5 min-w-0">
        <Badge variant="outline" class="shrink-0 font-semibold">
          {{
            $t('page.system_view.roles_perms_count', [row.permissions.length])
          }}
        </Badge>
        <Badge
          v-for="perm in row.permissions.slice(0, 2)"
          :key="perm"
          variant="secondary"
          class="inline-block max-w-36 truncate"
          :title="perm"
        >
          {{ perm }}
        </Badge>
        <Badge
          v-if="row.permissions.length > 2"
          variant="secondary"
          class="inline-flex shrink-0"
        >
          {{
            $t('page.system_view.roles_more_perms', [
              row.permissions.length - 2,
            ])
          }}
        </Badge>
      </div>
    </template>

    <template #empty>
      <div
        class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
      >
        <ShieldCheck
          class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3"
        />
        <p class="text-foreground">
          {{ $t('page.system_view.roles_empty_title') }}
        </p>
        <p class="text-muted-foreground max-w-sm mt-1">
          {{ $t('page.system_view.roles_empty_desc') }}
        </p>
      </div>
    </template>
  </RolesGrid>
</template>
