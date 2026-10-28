<script lang="ts" setup>
import type { PlatformSubscription } from '#/api';

import { ref } from 'vue';

import { Page } from '@operon/common-ui';
import { FILTER_ALL, SUBSCRIPTION_STATUS } from '@operon/constants';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Plus, RefreshCw } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listPlatformSubscriptions } from '#/api';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'SystemSubscriptions' });

const { isMobile } = usePreferences();

const allSubscriptions = ref<PlatformSubscription[]>([]);

function getStatusBadge(status: string): {
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
} {
  switch (status) {
    case SUBSCRIPTION_STATUS.ACTIVE: {
      return { label: $t('common.active'), variant: 'default' };
    }
    case SUBSCRIPTION_STATUS.CANCELED: {
      return { label: $t('common.cancelled'), variant: 'outline' };
    }
    case SUBSCRIPTION_STATUS.PAST_DUE: {
      return {
        label: $t('page.system_view.subs_status_past_due'),
        variant: 'destructive',
      };
    }
    case SUBSCRIPTION_STATUS.TRIALING: {
      return {
        label: $t('page.system_view.subs_status_trialing'),
        variant: 'secondary',
      };
    }
    default: {
      return { label: status, variant: 'outline' };
    }
  }
}

function getColumns() {
  return [
    {
      field: 'tenant_name',
      title: $t('term.workspace'),
      slots: { default: 'workspace-cell' },
    },
    {
      field: 'plan_name',
      title: $t('term.plan'),
      slots: { default: 'plan-cell' },
    },
    {
      field: 'price_monthly_usd',
      title: $t('page.system_view.subs_col_unit_price'),
      slots: { default: 'price-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'current_period_end',
      title: $t('page.system_view.subs_col_next_billing'),
      cellRender: { name: 'CellDate' },
    },
    {
      field: 'cancel_at_period_end',
      title: $t('page.system_view.subs_col_auto_renew'),
      align: 'right' as const,
      slots: { default: 'renewal-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<PlatformSubscription>({
  detailSheetOptions: {
    resource: 'billing.subscriptions',
    subtitleField: 'plan_name',
    titleField: 'tenant_name',
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
        fieldName: 'status',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.status'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.system_view.status_all'),
          options: [
            { label: $t('page.system_view.status_all'), value: FILTER_ALL },
            {
              label: $t('common.active'),
              value: SUBSCRIPTION_STATUS.ACTIVE,
            },
            {
              label: $t('common.cancelled'),
              value: SUBSCRIPTION_STATUS.CANCELED,
            },
            {
              label: $t('page.system_view.subs_status_trialing'),
              value: SUBSCRIPTION_STATUS.TRIALING,
            },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.system_view.subs_search_placeholder'),
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
          const data = await listPlatformSubscriptions();
          allSubscriptions.value = data;

          const filterStatus = formValues?.status;
          let filtered =
            filterStatus && filterStatus !== FILTER_ALL
              ? data.filter((s) => s.status === filterStatus)
              : data;

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (s) =>
                s.tenant_name.toLowerCase().includes(kw) ||
                (s.tenant_slug && s.tenant_slug.toLowerCase().includes(kw)) ||
                s.tenant_id.toLowerCase().includes(kw),
            );
          }

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.system.subscriptions')"
    :description="$t('page.system.subscriptions_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.subscriptions') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allSubscriptions.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="() => gridApi.reload()"
        >
          <RefreshCw class="size-3.5 shrink-0" />
        </Button>
        <Button
          size="sm"
          class="h-8 gap-1.5 px-2.5 sm:px-3"
          @click="() => gridApi.openCreateSheet()"
        >
          <Plus class="size-3.5 shrink-0" />
          <span>{{ $t('common.createRecord') }}</span>
        </Button>
      </div>
    </template>

    <!-- Table Container with Integrated Form & Pager: Grid at Level 1 -->
    <Grid class="subscriptions-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #workspace-cell="{ row }">
        <div class="flex min-w-0 flex-col py-1 text-left">
          <span class="truncate text-foreground">
            {{ row.tenant_name }}
          </span>
          <div class="flex items-center gap-1.5 text-muted-foreground">
            <span class="truncate">
              /{{ row.tenant_slug || row.tenant_id.slice(0, 8) }}
            </span>
          </div>
        </div>
      </template>

      <template #plan-cell="{ row }">
        <Badge variant="outline" class="font-semibold">
          {{ row.plan_name }}
        </Badge>
      </template>

      <template #price-cell="{ row }">
        <span class="text-foreground">
          ${{ row.price_monthly_usd
          }}{{ $t('page.system_view.per_month_suffix') }}
        </span>
      </template>

      <template #status-cell="{ row }">
        <Badge :variant="getStatusBadge(row.status).variant">
          {{ getStatusBadge(row.status).label }}
        </Badge>
      </template>

      <template #renewal-cell="{ row }">
        <Badge :variant="row.cancel_at_period_end ? 'outline' : 'secondary'">
          {{
            row.cancel_at_period_end
              ? $t('page.system_view.subs_cancel_period_end')
              : $t('page.system_view.subs_auto_renew')
          }}
        </Badge>
      </template>
    </Grid>
  </Page>
</template>
