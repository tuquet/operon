<script lang="ts" setup>
import type { Workflow } from '#/api';

import { ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { GitBranch, Plus, RefreshCw } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listWorkflows } from '#/api';
import {
  buildEnumFilterOptions,
  FILTER_ALL,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_META,
} from '#/constants';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'AutomationWorkflows' });

const route = useRoute();
const { isMobile } = usePreferences();

const allWorkflows = ref<Workflow[]>([]);

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('page.workflows_view.col_name'),

      slots: { default: 'name-cell' },
    },
    {
      field: 'version',
      title: $t('page.workflows_view.col_version'),

      cellRender: {
        name: 'CellTag',
        props: {
          prefix: 'v',
          variant: 'outline',
        },
      },
    },
    {
      field: 'status',
      title: $t('page.workflows_view.col_status'),

      cellRender: {
        name: 'CellStatus',
        props: {
          statusMap: {
            [WORKFLOW_STATUS.ARCHIVED]: {
              label: $t(
                WORKFLOW_STATUS_META[WORKFLOW_STATUS.ARCHIVED].labelKey,
              ),
              variant: 'muted',
            },
            [WORKFLOW_STATUS.DRAFT]: {
              label: $t(WORKFLOW_STATUS_META[WORKFLOW_STATUS.DRAFT].labelKey),
              variant: 'warning',
            },
            [WORKFLOW_STATUS.PUBLISHED]: {
              label: $t(
                WORKFLOW_STATUS_META[WORKFLOW_STATUS.PUBLISHED].labelKey,
              ),
              variant: 'success',
            },
          },
        },
      },
    },
    {
      field: 'created_at',
      title: $t('page.workflows_view.col_created_at'),

      cellRender: { name: 'CellDate' },
    },
    {
      field: 'updated_at',
      title: $t('page.workflows_view.col_updated_at'),

      cellRender: { name: 'CellDate' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<Workflow>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    resource: 'automation.workflows',
    subtitleField: 'version',
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
        label: () => $t('page.workflows_view.filter_status'),
        defaultValue: (route.query.status as string) || FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.workflows_view.status_all'),
          options: buildEnumFilterOptions(WORKFLOW_STATUS_META, $t, {
            allLabelKey: 'page.workflows_view.status_all',
            order: [
              WORKFLOW_STATUS.PUBLISHED,
              WORKFLOW_STATUS.DRAFT,
              WORKFLOW_STATUS.ARCHIVED,
            ],
          }),
        }),
      },
      {
        component: 'Input',
        fieldName: 'keyword',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.workflows_view.filter_search'),
        componentProps: () => ({
          placeholder: $t('page.workflows_view.search_placeholder'),
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
          const data = await listWorkflows({ tenantId });
          allWorkflows.value = data;

          let filtered = data;
          if (formValues?.status && formValues.status !== FILTER_ALL) {
            filtered = filtered.filter((w) => w.status === formValues.status);
          }

          if (formValues?.keyword) {
            const kw = String(formValues.keyword).toLowerCase().trim();
            filtered = filtered.filter(
              (w) =>
                w.name.toLowerCase().includes(kw) ||
                (w.description && w.description.toLowerCase().includes(kw)),
            );
          }

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});

function refresh() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.automation.workflows')"
    :description="$t('page.automation.workflows_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.automation.workflows') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allWorkflows.length }}
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
          @click="refresh"
        >
          <RefreshCw class="size-3.5 shrink-0" />
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

    <!-- Table Grid: Grid at Level 1 -->
    <Grid class="workflow-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5 py-1">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          >
            <GitBranch class="size-4" />
          </div>
          <div class="min-w-0 flex-1 text-left">
            <div class="truncate text-foreground">
              {{ row.name }}
            </div>
            <div class="line-clamp-1 max-w-md text-muted-foreground">
              {{ row.description || $t('page.workflows_view.no_description') }}
            </div>
          </div>
        </div>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground"
        >
          <GitBranch
            class="mb-3 size-10 stroke-[1.5] text-muted-foreground/60"
          />
          <p class="text-foreground">
            {{ $t('page.workflows_view.empty_title') }}
          </p>
          <p class="mt-1 max-w-md text-muted-foreground">
            {{ $t('page.workflows_view.empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>
  </Page>
</template>
