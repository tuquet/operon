<script lang="ts" setup>
import type { GlobalAuditLog } from '#/api';

import { ref } from 'vue';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { RefreshCw, User } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listGlobalAuditLogs } from '#/api';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'SystemAuditLogs' });

const { isMobile } = usePreferences();

const totalLogs = ref(0);

function getColumns() {
  return [
    {
      field: 'created_at',
      title: $t('page.system_view.audit_col_time'),
      minWidth: 170,
      cellRender: { name: 'CellDate' },
    },
    {
      field: 'action',
      title: $t('page.system_view.audit_col_action'),
      minWidth: 160,
      slots: { default: 'action-cell' },
    },
    {
      field: 'entity_type',
      title: $t('page.system_view.audit_col_entity'),
      minWidth: 160,
      slots: { default: 'entity-cell' },
    },
    {
      field: 'tenant_id',
      title: $t('page.system_view.audit_col_tenant_id'),
      minWidth: 150,
      slots: { default: 'tenant-cell' },
    },
    {
      field: 'actor_id',
      title: $t('page.system_view.audit_col_actor'),
      minWidth: 140,
      slots: { default: 'actor-cell' },
    },
    {
      field: 'ip_address',
      title: $t('page.system_view.audit_col_ip'),
      minWidth: 140,
      slots: { default: 'ip-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<GlobalAuditLog>({
  detailSheetOptions: {
    resource: 'public.audit_logs',
    subtitleField: 'entity_type',
    titleField: 'action',
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
        component: 'Input',
        fieldName: 'action',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.system_view.audit_col_action'),
        componentProps: () => ({
          placeholder: $t('page.system_view.audit_action_placeholder'),
          clearable: true,
        }),
      },
      {
        component: 'Input',
        fieldName: 'tenantId',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.system_view.audit_filter_tenant_id'),
        componentProps: () => ({
          placeholder: $t('page.system_view.audit_tenant_placeholder'),
          clearable: true,
        }),
      },
    ],
    actionWrapperClass:
      'hidden sm:flex sm:col-span-2 lg:col-span-2 items-center justify-end gap-2 pt-1 sm:pt-6',
  },
  gridOptions: {
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          const action = formValues?.action
            ? String(formValues.action).trim()
            : undefined;
          const tenantId = formValues?.tenantId
            ? String(formValues.tenantId).trim()
            : undefined;

          const data = await listGlobalAuditLogs({
            action: action || undefined,
            tenantId: tenantId || undefined,
            limit: 100,
          });
          totalLogs.value = data.length;

          return paginateArray(data, page);
        },
      },
    },
    columns: getColumns,
  },
});

function getActionBadgeVariant(
  action: string,
): 'default' | 'destructive' | 'outline' | 'secondary' {
  if (
    action.includes('delete') ||
    action.includes('destroy') ||
    action.includes('remove')
  ) {
    return 'destructive';
  }
  if (
    action.includes('create') ||
    action.includes('insert') ||
    action.includes('add')
  ) {
    return 'default';
  }
  if (action.includes('update') || action.includes('edit')) {
    return 'secondary';
  }
  return 'outline';
}

function refresh() {
  gridApi.reload();
}
</script>

<template>
  <Page
    :title="$t('page.system.auditLogs')"
    :description="$t('page.system.auditLogs_desc')"
    content-class="p-3 sm:p-5"
    header-class="border-b border-border/60 bg-card/60 px-4 py-3 sm:px-6"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.auditLogs') }}
        </h1>
        <Badge variant="secondary" class="shrink-0 text-2xs font-normal">
          {{ totalLogs }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="refresh"
        >
          <RefreshCw class="size-3.5 shrink-0" />
        </Button>
      </div>
    </template>

    <!-- Table View -->
    <div
      class="overflow-hidden rounded-xl border border-border/60 bg-card p-3 sm:p-5 shadow-xs"
    >
      <Grid class="audit-logs-vxe-grid">
        <template #action-cell="{ row }">
          <div class="flex min-w-0 flex-col items-start gap-0.5 py-0.5">
            <Badge :variant="getActionBadgeVariant(row.action)" class="text-xs">
              {{ row.action }}
            </Badge>
          </div>
        </template>

        <template #entity-cell="{ row }">
          <div class="flex items-center gap-1.5 text-xs font-mono">
            <span class="text-foreground">{{ row.entity_type }}</span>
            <span class="text-muted-foreground/70"
              >#{{ row.entity_id.slice(0, 8) }}</span
            >
          </div>
        </template>

        <template #tenant-cell="{ row }">
          <Badge variant="outline">
            {{ row.tenant_id.slice(0, 8) }}...
          </Badge>
        </template>

        <template #actor-cell="{ row }">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">
            <User class="size-3 text-muted-foreground/70" />
            <span class="font-mono">
              {{
                row.actor_id
                  ? row.actor_id.slice(0, 8)
                  : $t('page.system_view.audit_actor_system')
              }}
            </span>
          </div>
        </template>

        <template #ip-cell="{ row }">
          <span class="text-xs text-muted-foreground">
            {{ row.ip_address || '—' }}
          </span>
        </template>
      </Grid>
    </div>
  </Page>
</template>
