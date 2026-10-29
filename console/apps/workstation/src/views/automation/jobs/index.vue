<script lang="ts" setup>
import type { Job } from '#/api';

import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Eye, Laptop, PlayCircle, RefreshCw } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { calculateProgressPercentage, listJobs } from '#/api';
import {
  buildEnumFilterOptions,
  FILTER_ALL,
  getStatusToneMeta,
  JOB_STATUS,
  JOB_STATUS_META,
} from '#/constants';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'AutomationJobs' });

const route = useRoute();
const router = useRouter();
const { isMobile } = usePreferences();

const allRuns = ref<Job[]>([]);

function handleViewDetail(id: string) {
  router.push(`/automation/runs/${id}`);
}

function getRunStatusBarClass(status: string): string {
  const meta = getStatusToneMeta(status, JOB_STATUS_META);
  if (meta.tone === 'info') return 'bg-primary';
  if (meta.tone === 'success') return 'bg-success';
  if (meta.tone === 'danger') return 'bg-destructive';
  return 'bg-muted-foreground';
}

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('page.jobs_view.col_name'),
      slots: { default: 'name-cell' },
    },
    {
      field: 'device',
      title: $t('page.jobs_view.col_runner'),
      slots: { default: 'device-cell' },
    },
    {
      field: 'progress',
      title: $t('page.jobs_view.col_progress'),
      slots: { default: 'progress-cell' },
    },
    {
      field: 'status',
      title: $t('page.jobs_view.col_status'),
      cellRender: {
        name: 'CellStatus',
        props: {
          statusMap: {
            [JOB_STATUS.CANCELLED]: {
              label: $t(JOB_STATUS_META[JOB_STATUS.CANCELLED].labelKey),
              variant: 'muted',
            },
            [JOB_STATUS.COMPLETED]: {
              label: $t(JOB_STATUS_META[JOB_STATUS.COMPLETED].labelKey),
              variant: 'success',
            },
            [JOB_STATUS.FAILED]: {
              label: $t(JOB_STATUS_META[JOB_STATUS.FAILED].labelKey),
              variant: 'destructive',
            },
            [JOB_STATUS.PENDING]: {
              label: $t(JOB_STATUS_META[JOB_STATUS.PENDING].labelKey),
              variant: 'warning',
            },
            [JOB_STATUS.RUNNING]: {
              label: $t(JOB_STATUS_META[JOB_STATUS.RUNNING].labelKey),
              pulse: true,
              variant: 'primary',
            },
          },
        },
      },
    },
    {
      field: 'created_at',
      title: $t('page.jobs_view.col_created_at'),
      cellRender: { name: 'CellDate' },
    },
    {
      field: 'actions',
      title: $t('page.jobs_view.col_actions'),
      align: 'right' as const,
      showOverflow: false,
      slots: { default: 'actions-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<Job>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    resource: 'automation.jobs',
    subtitleField: 'status',
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
        label: () => $t('page.jobs_view.filter_status'),
        defaultValue: (route.query.status as string) || FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.jobs_view.status_all'),
          options: buildEnumFilterOptions(JOB_STATUS_META, $t, {
            allLabelKey: 'page.jobs_view.status_all',
            order: [
              JOB_STATUS.RUNNING,
              JOB_STATUS.COMPLETED,
              JOB_STATUS.FAILED,
              JOB_STATUS.PENDING,
              JOB_STATUS.CANCELLED,
            ],
          }),
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.jobs_view.filter_search'),
        componentProps: () => ({
          placeholder: $t('page.jobs_view.search_placeholder'),
          clearable: true,
        }),
      },
    ],
    actionWrapperClass:
      'hidden sm:flex sm:col-span-2 lg:col-span-2 items-center justify-end gap-2 pt-0.5 sm:pt-6',
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
          const workflowId = (route.query.workflow as string) || undefined;
          const data = await listJobs({ tenantId, workflowId });
          allRuns.value = data;

          let filtered = data;
          if (formValues?.status && formValues.status !== FILTER_ALL) {
            filtered =
              formValues.status === JOB_STATUS.PENDING
                ? filtered.filter(
                    (r) =>
                      r.status === JOB_STATUS.PENDING ||
                      r.status === JOB_STATUS.QUEUED,
                  )
                : filtered.filter((r) => r.status === formValues.status);
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (r) =>
                r.name.toLowerCase().includes(kw) ||
                (r.workflow && r.workflow.name.toLowerCase().includes(kw)),
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
  () => [route.query.tenant, route.query.workflow],
  () => {
    gridApi.reload();
  },
);
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.automation.jobs')"
    :description="$t('page.automation.jobs_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.automation.jobs') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allRuns.length }}
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
      </div>
    </template>

    <!-- Main Container: Grid at Level 1 -->
    <Grid class="runs-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5 py-1">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          >
            <PlayCircle class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-foreground">
              {{ row.name }}
            </div>
            <div class="truncate text-muted-foreground">
              {{
                row.workflow
                  ? row.workflow.name
                  : $t('page.jobs_view.unassigned_workflow')
              }}
            </div>
          </div>
        </div>
      </template>

      <template #device-cell="{ row }">
        <div
          v-if="row.device"
          class="inline-flex items-center gap-1.5 text-foreground"
        >
          <Laptop class="size-3.5 shrink-0 text-muted-foreground" />
          <span>{{ row.device.name }}</span>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('page.jobs_view.auto_dispatch') }}
        </span>
      </template>

      <template #progress-cell="{ row }">
        <div class="w-full max-w-[170px] space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-foreground">
              {{ row.completed_tasks }} / {{ row.total_tasks }}
            </span>
            <span class="font-semibold text-muted-foreground">
              {{
                calculateProgressPercentage(
                  row.completed_tasks,
                  row.total_tasks,
                )
              }}%
            </span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all"
              :class="getRunStatusBarClass(row.status)"
              :style="{
                width: `${calculateProgressPercentage(row.completed_tasks, row.total_tasks)}%`,
              }"
            ></div>
          </div>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <Button
          variant="outline"
          size="sm"
          class="inline-flex h-7 items-center gap-1 px-2.5"
          :title="$t('common.detail')"
          @click="handleViewDetail(row.id)"
        >
          <Eye class="size-3.5 shrink-0" />
          <span>{{ $t('common.detail') }}</span>
        </Button>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground"
        >
          <PlayCircle
            class="mb-3 size-10 stroke-[1.5] text-muted-foreground/60"
          />
          <p class="text-foreground">
            {{ $t('page.jobs_view.empty_title') }}
          </p>
          <p class="mt-1 max-w-md text-muted-foreground">
            {{ $t('page.jobs_view.empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>
  </Page>
</template>
