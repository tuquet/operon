<script lang="ts" setup>
import type { SystemPlugin } from '#/api';

import { ref } from 'vue';

import { Page } from '@operon/common-ui';
import {
  FILTER_ALL,
  SYSTEM_PLUGIN_CATEGORY,
  SYSTEM_PLUGIN_STATUS,
} from '@operon/constants';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import {
  CreditCard,
  Database,
  HardDrive,
  Plus,
  RefreshCw,
  ShieldCheck,
  Webhook,
  Workflow,
  Zap,
} from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listSystemPlugins } from '#/api';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'SystemPlugins' });

const { isMobile } = usePreferences();

const allPlugins = ref<SystemPlugin[]>([]);

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('term.plugin'),
      slots: { default: 'plugin-cell' },
    },
    {
      field: 'is_core',
      title: $t('page.system_view.plugins_col_type'),
      slots: { default: 'type-cell' },
    },
    {
      field: 'version',
      title: $t('page.system_view.plugins_col_version_schema'),
      slots: { default: 'version-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'installed_at',
      title: $t('page.system_view.plugins_col_installed_at'),
      align: 'right' as const,
      cellRender: { name: 'CellDate' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<SystemPlugin>({
  detailSheetOptions: {
    resource: 'public.system_plugins',
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
        fieldName: 'is_core',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.system_view.plugins_filter_type'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.system_view.plugins_type_all'),
          options: [
            {
              label: $t('page.system_view.plugins_type_all'),
              value: FILTER_ALL,
            },
            {
              label: $t('page.system_view.plugins_type_core'),
              value: SYSTEM_PLUGIN_CATEGORY.CORE,
            },
            {
              label: $t('page.system_view.plugins_type_extension'),
              value: SYSTEM_PLUGIN_CATEGORY.EXTENSION,
            },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'keyword',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.system_view.plugins_search_placeholder'),
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
          const data = await listSystemPlugins();
          allPlugins.value = data;

          let filtered = data;
          if (formValues?.is_core === SYSTEM_PLUGIN_CATEGORY.CORE) {
            filtered = filtered.filter((p) => p.is_core);
          } else if (formValues?.is_core === SYSTEM_PLUGIN_CATEGORY.EXTENSION) {
            filtered = filtered.filter((p) => !p.is_core);
          }

          if (formValues?.keyword) {
            const kw = formValues.keyword.toLowerCase().trim();
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

function getPluginIcon(pluginId: string) {
  switch (pluginId?.toLowerCase()) {
    case 'automation': {
      return Workflow;
    }
    case 'core-iam': {
      return ShieldCheck;
    }
    case 'workers': {
      return Zap;
    }
    case 'storage': {
      return HardDrive;
    }
    case 'subscriptions': {
      return CreditCard;
    }
    case 'webhooks': {
      return Webhook;
    }
    default: {
      return Database;
    }
  }
}

function refresh() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.system.plugins')"
    :description="$t('page.system.plugins_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.plugins') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allPlugins.length }}
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
          @click="refresh"
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
    <Grid class="plugins-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #plugin-cell="{ row }">
        <div class="flex items-center gap-2.5 py-1">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          >
            <component :is="getPluginIcon(row.id)" class="size-4" />
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

      <template #type-cell="{ row }">
        <Badge :variant="row.is_core ? 'default' : 'secondary'">
          {{
            row.is_core
              ? $t('page.system_view.plugins_type_core')
              : $t('page.system_view.plugins_type_extension')
          }}
        </Badge>
      </template>

      <template #version-cell="{ row }">
        <div class="flex items-center gap-2">
          <Badge variant="outline"> v{{ row.version }} </Badge>
          <span v-if="row.schema_name" class="text-muted-foreground">
            {{
              $t('page.system_view.plugins_schema_prefix', [row.schema_name])
            }}
          </span>
        </div>
      </template>

      <template #status-cell="{ row }">
        <Badge variant="outline">
          <span
            class="mr-1.5 size-1.5 rounded-full"
            :class="{
              'bg-success': row.status === SYSTEM_PLUGIN_STATUS.INSTALLED,
              'bg-muted-foreground':
                row.status === SYSTEM_PLUGIN_STATUS.DISABLED,
              'bg-warning': row.status === SYSTEM_PLUGIN_STATUS.PENDING,
            }"
          ></span>
          {{
            row.status === SYSTEM_PLUGIN_STATUS.INSTALLED
              ? $t('page.system_view.plugins_status_installed')
              : row.status === SYSTEM_PLUGIN_STATUS.DISABLED
                ? $t('page.system_view.status_paused')
                : $t('common.pending')
          }}
        </Badge>
      </template>
    </Grid>
  </Page>
</template>
