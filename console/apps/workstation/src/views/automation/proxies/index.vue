<script lang="ts" setup>
import type { ProxyServer } from '#/api';

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Activity, Copy, Network, Plus, RefreshCw } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listProxies } from '#/api';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'AutomationProxies' });

const route = useRoute();
const { copyToClipboard } = useClipboard();
const { isMobile } = usePreferences();

const allProxies = ref<ProxyServer[]>([]);

function getLatencyBadgeClass(latency: null | number) {
  if (latency === null || latency === undefined) return 'text-muted-foreground';
  if (latency < 300) return 'text-success font-semibold';
  if (latency < 800) return 'text-warning font-semibold';
  return 'text-destructive font-semibold';
}

function getColumns() {
  return [
    {
      field: 'host',
      title: $t('page.automation_view.col_proxy_address'),
      slots: { default: 'proxy-cell' },
    },
    {
      field: 'country_code',
      title: $t('page.automation_view.col_location_type'),
      slots: { default: 'location-cell' },
    },
    {
      field: 'latency_ms',
      title: $t('page.automation_view.col_latency'),
      slots: { default: 'latency-cell' },
    },
    {
      field: 'error_count',
      title: $t('common.error'),
      slots: { default: 'error-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),
      cellRender: {
        name: 'CellStatus',
        props: {
          statusMap: {
            active: {
              label: $t('common.active'),
              variant: 'success',
            },
            disabled: {
              label: $t('common.disabled'),
              variant: 'muted',
            },
            failing: {
              label: $t('page.automation_view.proxy_status_failing'),
              variant: 'destructive',
            },
            testing: {
              label: $t('page.automation_view.proxy_status_testing'),
              pulse: true,
              variant: 'warning',
            },
          },
        },
      },
    },
    {
      field: 'last_checked_at',
      title: $t('page.automation_view.col_last_checked'),
      cellRender: { name: 'CellDate' },
    },
    {
      field: 'actions',
      title: $t('common.actions'),
      align: 'right' as const,
      showOverflow: false,
      slots: { default: 'actions-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<ProxyServer>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    resource: 'workers.proxies',
    subtitleField: 'country_code',
    titleField: 'host',
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
        label: () => $t('common.status'),
        defaultValue: (route.query.status as string) || 'all',
        componentProps: () => ({
          placeholder: $t('common.all'),
          options: [
            { label: $t('common.all'), value: 'all' },
            { label: $t('common.active'), value: 'active' },
            {
              label: $t('page.automation_view.proxy_status_failing'),
              value: 'failing',
            },
            {
              label: $t('page.automation_view.proxy_status_testing'),
              value: 'testing',
            },
            { label: $t('common.disabled'), value: 'disabled' },
          ],
        }),
      },
      {
        component: 'Select',
        fieldName: 'type',
        label: () => $t('common.type'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.automation_view.proxy_type_all'),
          options: [
            { label: $t('page.automation_view.proxy_type_all'), value: 'all' },
            {
              label: $t('page.automation_view.proxy_type_residential'),
              value: 'residential',
            },
            {
              label: $t('page.automation_view.proxy_type_datacenter'),
              value: 'datacenter',
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
          placeholder: $t('page.automation_view.proxy_search_placeholder'),
          clearable: true,
        }),
      },
    ],
  },
  gridOptions: {
    pagerConfig: {
      autoHidden: true,
    },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          const tenantId = (route.query.tenant as string) || undefined;
          const data = await listProxies({ tenantId });
          allProxies.value = data;

          let filtered = data;
          if (formValues?.status && formValues.status !== 'all') {
            filtered = filtered.filter((p) => p.status === formValues.status);
          }

          if (formValues?.type && formValues.type !== 'all') {
            if (formValues.type === 'residential') {
              filtered = filtered.filter((p) => p.is_residential);
            } else if (formValues.type === 'datacenter') {
              filtered = filtered.filter((p) => !p.is_residential);
            }
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (p) =>
                p.host.toLowerCase().includes(kw) ||
                String(p.port).includes(kw) ||
                (p.country_code && p.country_code.toLowerCase().includes(kw)) ||
                (p.city && p.city.toLowerCase().includes(kw)),
            );
          }

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});

watch(
  () => route.query.tenant,
  () => {
    gridApi.reload();
  },
);
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.automation.proxies')"
    :description="$t('page.automation.proxies_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.automation.proxies') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allProxies.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2.5"
          :title="$t('common.refresh')"
          @click="() => gridApi.reload()"
        >
          <RefreshCw class="size-3.5" />
          <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
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

    <!-- Main Container: Grid at Level 1 -->
    <Grid class="proxies-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #proxy-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <div
            class="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground shrink-0"
          >
            <Network class="size-4" />
          </div>
          <div class="min-w-0 text-foreground truncate">
            {{ row.protocol }}://{{ row.host }}:{{ row.port }}
          </div>
        </div>
      </template>

      <template #location-cell="{ row }">
        <div class="flex items-center gap-2">
          <span
            v-if="row.country_code"
            class="font-semibold text-foreground uppercase"
          >
            {{ row.country_code }}
          </span>
          <span v-if="row.city" class="text-muted-foreground truncate">
            · {{ row.city }}
          </span>
          <Badge
            :variant="row.is_residential ? 'secondary' : 'outline'"
            class="shrink-0"
          >
            {{
              row.is_residential
                ? $t('page.automation_view.proxy_type_residential')
                : $t('page.automation_view.proxy_type_datacenter')
            }}
          </Badge>
        </div>
      </template>

      <template #latency-cell="{ row }">
        <div class="flex items-center gap-1.5">
          <Activity class="size-3.5 shrink-0 text-muted-foreground" />
          <span :class="getLatencyBadgeClass(row.latency_ms)">
            {{
              row.latency_ms !== null && row.latency_ms !== undefined
                ? `${row.latency_ms} ms`
                : '—'
            }}
          </span>
        </div>
      </template>

      <template #error-cell="{ row }">
        <span
          :class="
            row.error_count > 0
              ? 'text-destructive font-semibold'
              : 'text-muted-foreground'
          "
        >
          {{ $t('page.automation_view.proxy_errors_count', [row.error_count]) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            class="h-7 gap-1 px-2"
            :title="$t('common.copy')"
            @click="
              copyToClipboard(
                `${row.protocol}://${row.host}:${row.port}`,
                'Proxy URL',
              )
            "
          >
            <Copy class="size-3 shrink-0" />
            <span>{{ $t('common.copy') }}</span>
          </Button>
        </div>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
        >
          <Network class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
          <p class="text-foreground">
            {{ $t('page.fleet_view.proxies_empty') }}
          </p>
          <p class="text-muted-foreground max-w-sm mt-1">
            {{ $t('page.fleet_view.proxies_empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>
  </Page>
</template>
