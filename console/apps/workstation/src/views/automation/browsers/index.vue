<script lang="ts" setup>
import type { BrowserProfile } from '#/api';

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button } from '@operon-core/shadcn-ui';

import {
  Copy,
  Globe,
  Lock,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Square,
  Unlock,
} from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  listBrowserReleases,
  listBrowsers,
  listProxies,
  startBrowserProfile,
  stopBrowserProfile,
  unbindBrowser,
} from '#/api';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'AutomationBrowsers' });

const route = useRoute();
const { copyToClipboard } = useClipboard();
const { isMobile } = usePreferences();

const allBrowsers = ref<BrowserProfile[]>([]);
const isUnbinding = ref<Record<string, boolean>>({});
const isToggling = ref<Record<string, boolean>>({});

async function handleToggleRun(row: BrowserProfile) {
  if (!row.id || isToggling.value[row.id]) return;
  isToggling.value[row.id] = true;
  try {
    await (row.status === 'running'
      ? stopBrowserProfile(row.id)
      : startBrowserProfile(row.id));
    await gridApi.reload();
  } finally {
    isToggling.value[row.id] = false;
  }
}

async function handleUnbind(row: BrowserProfile) {
  if (!row.id || isUnbinding.value[row.id]) return;
  isUnbinding.value[row.id] = true;
  try {
    const ok = await unbindBrowser(row.id);
    if (ok) {
      await gridApi.reload();
    }
  } finally {
    isUnbinding.value[row.id] = false;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('page.automation_view.col_browser_profile'),

      slots: { default: 'name-cell' },
    },
    {
      field: 'locked_by_device',
      title: $t('page.automation_view.col_locked_by'),

      slots: { default: 'lock-cell' },
    },
    {
      field: 'proxy',
      title: $t('page.automation_view.col_proxy_routing'),

      slots: { default: 'proxy-cell' },
    },
    {
      field: 'storage_size_bytes',
      title: $t('page.automation_view.col_storage_cookies'),

      slots: { default: 'storage-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),

      cellRender: {
        name: 'CellStatus',
        props: {
          statusMap: {
            error: {
              label: $t('common.error'),
              variant: 'destructive',
            },
            idle: {
              label: $t('page.automation_view.device_status_idle'),
              variant: 'success',
            },
            running: {
              label: $t('common.running'),
              pulse: true,
              variant: 'primary',
            },
            syncing: {
              label: $t('page.automation_view.browser_status_syncing'),
              pulse: true,
              variant: 'warning',
            },
          },
        },
      },
    },
    {
      field: 'created_at',
      title: $t('common.createdAt'),

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

const [Grid, gridApi] = useVbenVxeGrid<BrowserProfile>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    dynamicFieldOptions: async ({ formData }) => {
      const tenantId = (route.query.tenant_id as string) || undefined;
      const [proxies, releases] = await Promise.all([
        listProxies({ tenantId }),
        listBrowserReleases({
          osPlatform: formData.os_platform || undefined,
        }),
      ]);

      const proxyOptions = [
        { label: 'None (Direct Egress)', value: '__none__' },
        ...proxies.map((p) => ({
          label: `${p.protocol.toUpperCase()}://${p.host}:${p.port}${p.country_code ? ` [${p.country_code}]` : ''}`,
          value: p.id,
        })),
      ];

      const versionOptions =
        releases.length > 0
          ? releases.map((r) => ({
              label: `${r.version} (${r.channel.toUpperCase()}${r.is_recommended ? ' - Verified' : ''})`,
              value: r.version,
            }))
          : [
              {
                label: '148.0.7778.215 (Golden LTS - Verified)',
                value: '148.0.7778.215',
              },
            ];

      return {
        engine_version: versionOptions,
        proxy_id: proxyOptions,
      };
    },
    resource: 'workers.browsers',
    subtitleField: 'engine_version',
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
        defaultValue: (route.query.status as string) || 'all',
        componentProps: () => ({
          placeholder: $t('common.all'),
          options: [
            { label: $t('common.all'), value: 'all' },
            {
              label: $t('page.automation_view.device_status_idle'),
              value: 'idle',
            },
            { label: $t('common.running'), value: 'running' },
            {
              label: $t('page.automation_view.browser_status_syncing'),
              value: 'syncing',
            },
            { label: $t('common.error'), value: 'error' },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.automation_view.browser_search_placeholder'),
          clearable: true,
        }),
      },
    ],
    actionWrapperClass:
      'hidden sm:flex sm:col-span-2 lg:col-span-2 items-center justify-end gap-2 pt-1 sm:pt-6',
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
          const data = await listBrowsers({ tenantId });
          allBrowsers.value = data;

          let filtered = data;
          if (formValues?.status && formValues.status !== 'all') {
            filtered = filtered.filter((b) => b.status === formValues.status);
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (b) =>
                b.name.toLowerCase().includes(kw) ||
                (b.os_platform && b.os_platform.toLowerCase().includes(kw)) ||
                (b.engine_version &&
                  b.engine_version.toLowerCase().includes(kw)),
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
    :title="$t('page.automation.browsers')"
    :description="$t('page.automation.browsers_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.automation.browsers') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allBrowsers.length }}
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
    <Grid class="browsers-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <div
            class="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground shrink-0"
          >
            <Globe class="size-4" />
          </div>
          <div class="min-w-0">
            <div class="text-foreground truncate">
              {{ row.name }}
            </div>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <Badge variant="outline" class="capitalize py-0 px-1">
                {{ row.os_platform }}
              </Badge>
              <Badge variant="secondary" class="py-0 px-1">
                {{ row.engine_version }}
              </Badge>
            </div>
          </div>
        </div>
      </template>

      <template #lock-cell="{ row }">
        <div
          v-if="row.locked_by_device"
          class="inline-flex items-center gap-1.5 text-primary truncate"
        >
          <Lock class="size-3 text-primary shrink-0" />
          <span class="truncate">{{ row.locked_by_device.name }}</span>
        </div>
        <div
          v-else
          class="inline-flex items-center gap-1.5 text-muted-foreground"
        >
          <Unlock class="size-3 shrink-0" />
          <span>{{ $t('page.automation_view.browser_unlocked') }}</span>
        </div>
      </template>

      <template #proxy-cell="{ row }">
        <div
          v-if="row.proxy"
          class="inline-flex items-center gap-1.5 text-foreground truncate"
        >
          <Shield class="size-3 text-success shrink-0" />
          <span class="truncate"
            >{{ row.proxy.protocol }}://{{ row.proxy.host }}:{{
              row.proxy.port
            }}</span
          >
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('page.automation_view.proxy_direct') }}
        </span>
      </template>

      <template #storage-cell="{ row }">
        <div class="flex items-center gap-2 text-foreground">
          <span>{{ formatBytes(row.storage_size_bytes) }}</span>
          <span class="text-muted-foreground">&bull;</span>
          <span class="text-muted-foreground">
            {{
              $t('page.automation_view.cookies_count_unit', [row.cookies_count])
            }}
          </span>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1">
          <Button
            :variant="row.status === 'running' ? 'destructive' : 'default'"
            size="sm"
            class="h-7 gap-1 px-2"
            :class="{
              'bg-success hover:bg-success/90 text-success-foreground':
                row.status !== 'running',
            }"
            :disabled="isToggling[row.id] || row.status === 'syncing'"
            :title="
              row.status === 'running' ? 'Stop Browser' : 'Launch Browser'
            "
            @click="handleToggleRun(row)"
          >
            <Square
              v-if="row.status === 'running'"
              class="size-3 fill-current shrink-0"
            />
            <Play v-else class="size-3 fill-current shrink-0" />
            <span>{{ row.status === 'running' ? 'Stop' : 'Run' }}</span>
          </Button>
          <Button
            v-if="
              row.locked_by_device ||
              row.status === 'running' ||
              row.status === 'error'
            "
            variant="ghost"
            size="sm"
            class="h-7 gap-1 px-1.5 text-warning hover:text-warning"
            :disabled="isUnbinding[row.id]"
            :title="$t('page.automation_view.browser_unlocked')"
            :aria-label="$t('page.automation_view.browser_unlocked')"
            @click="handleUnbind(row)"
          >
            <Unlock class="size-3 shrink-0" />
            <span class="hidden md:inline">{{
              $t('page.automation_view.browser_unlocked')
            }}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 gap-1 px-2"
            :title="$t('common.edit')"
            :aria-label="$t('common.edit')"
            @click="() => gridApi.openDetailSheet(row)"
          >
            <Pencil class="size-3 shrink-0" />
            <span class="hidden sm:inline">{{ $t('common.edit') }}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 gap-1 px-2"
            :title="$t('common.copy')"
            :aria-label="$t('common.copy')"
            @click="copyToClipboard(row.id, 'Browser ID')"
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
          <Globe class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
          <p class="text-foreground">
            {{ $t('page.fleet_view.browsers_empty') }}
          </p>
          <p class="text-muted-foreground max-w-sm mt-1">
            {{ $t('page.fleet_view.browsers_empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>
  </Page>
</template>
