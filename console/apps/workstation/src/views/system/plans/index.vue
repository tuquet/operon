<script lang="ts" setup>
import type { BillingPlan } from '#/api';

import { ref } from 'vue';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import {
  Cpu,
  CreditCard,
  HardDrive,
  Plus,
  RefreshCw,
  Users,
} from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listBillingPlans } from '#/api';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'SystemPlans' });

const { isMobile } = usePreferences();

const plansCount = ref(0);

function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${Number((mb / 1024).toFixed(1))} GB`;
  }
  return `${mb} MB`;
}

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('page.system_view.plans_col_name'),
      slots: { default: 'name-cell' },
    },
    {
      field: 'price_monthly_usd',
      title: $t('page.system_view.plans_col_price'),
      slots: { default: 'price-cell' },
    },
    {
      field: 'max_members',
      title: $t('page.system_view.plans_col_max_members'),
      slots: { default: 'members-cell' },
    },
    {
      field: 'max_storage_mb',
      title: $t('page.system_view.plans_col_storage'),
      slots: { default: 'storage-cell' },
    },
    {
      field: 'max_monthly_runs',
      title: $t('page.system_view.plans_col_monthly_runs'),
      slots: { default: 'runs-cell' },
    },
    {
      field: 'is_active',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'created_at',
      title: $t('common.createdAt'),
      align: 'right' as const,
      cellRender: { name: 'CellDate' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<BillingPlan>({
  detailSheetOptions: {
    resource: 'billing.plans',
    subtitleField: 'id',
    titleField: 'name',
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
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.system_view.status_all'),
          options: [
            { label: $t('page.system_view.status_all'), value: 'all' },
            {
              label: $t('page.system_view.plans_status_active'),
              value: 'active',
            },
            { label: $t('page.system_view.status_paused'), value: 'paused' },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.system_view.plans_search_placeholder'),
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
          const data = await listBillingPlans();
          plansCount.value = data.length;

          let filtered = data;
          if (formValues?.status === 'active') {
            filtered = filtered.filter((p) => p.is_active);
          } else if (formValues?.status === 'paused') {
            filtered = filtered.filter((p) => !p.is_active);
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (p) =>
                p.name.toLowerCase().includes(kw) ||
                p.id.toLowerCase().includes(kw),
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
    :title="$t('page.system.plans')"
    :description="$t('page.system.plans_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.plans') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ plansCount }}
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
          @click="gridApi.reload()"
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

    <!-- Main Container: Table Grid at Level 1 -->
    <Grid class="plans-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5 py-1">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          >
            <CreditCard class="size-4" />
          </div>
          <div class="min-w-0 text-left">
            <div class="truncate text-foreground">
              {{ row.name }}
            </div>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <span class="truncate">{{ row.id }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #price-cell="{ row }">
        <div v-if="row.price_monthly_usd === 0">
          <Badge variant="secondary">
            {{ $t('page.system_view.plans_free') }}
          </Badge>
        </div>
        <div v-else class="font-semibold text-foreground">
          ${{ row.price_monthly_usd }}
          <span class="text-muted-foreground">{{
            $t('page.system_view.per_month_suffix')
          }}</span>
        </div>
      </template>

      <template #members-cell="{ row }">
        <div class="inline-flex items-center gap-1.5 text-foreground">
          <Users class="size-3.5 text-muted-foreground shrink-0" />
          <span>{{
            $t('page.system_view.plans_members_unit', [row.max_members])
          }}</span>
        </div>
      </template>

      <template #storage-cell="{ row }">
        <div class="inline-flex items-center gap-1.5 text-foreground">
          <HardDrive class="size-3.5 text-muted-foreground shrink-0" />
          <span>{{ formatStorage(row.max_storage_mb) }}</span>
        </div>
      </template>

      <template #runs-cell="{ row }">
        <div class="inline-flex items-center gap-1.5 text-foreground">
          <Cpu class="size-3.5 text-muted-foreground shrink-0" />
          <span>{{
            $t('page.system_view.plans_runs_unit', [
              row.max_monthly_runs.toLocaleString(),
            ])
          }}</span>
        </div>
      </template>

      <template #status-cell="{ row }">
        <Badge variant="outline">
          <span
            class="mr-1.5 size-1.5 rounded-full"
            :class="row.is_active ? 'bg-success' : 'bg-muted-foreground'"
          ></span>
          {{
            row.is_active
              ? $t('page.system_view.plans_badge_active')
              : $t('page.system_view.status_paused')
          }}
        </Badge>
      </template>
    </Grid>
  </Page>
</template>
