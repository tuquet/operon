<script lang="ts" setup>
import type { Device } from '#/api';

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  toast,
} from '@operon-core/shadcn-ui';

import { Cpu, HardDrive, Laptop, Plus, RefreshCw } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listDevices, probeLocalDaemon, revokeDevice } from '#/api';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';
import { paginateArray } from '#/utils/pagination';

import ConnectFleetModal from './components/modals/connect-fleet-modal.vue';

defineOptions({ name: 'AutomationDevices' });

const route = useRoute();
const { isMobile } = usePreferences();

const probingDaemon = ref(false);
const nodes = ref<Device[]>([]);
const loopbackOnline = ref(false);

// Modals
const isConnectModalVisible = ref(false);

function getOsBadgeVariant(os?: string): 'default' | 'outline' | 'secondary' {
  if (!os) return 'outline';
  const lower = os.toLowerCase();
  if (lower.includes('win')) return 'default';
  if (lower.includes('linux')) return 'secondary';
  return 'outline';
}

async function checkDaemonHealth() {
  probingDaemon.value = true;
  try {
    const res = await probeLocalDaemon(8765);
    loopbackOnline.value = res.online;
  } catch {
    loopbackOnline.value = false;
  } finally {
    probingDaemon.value = false;
  }
}

async function handleRevokeNode(node: Device) {
  try {
    await revokeDevice(node.id);
    toast.success(
      $t('page.automation_view.device_revoke_success', { name: node.name }),
    );
    gridApi.reload();
  } catch (error: any) {
    captureError(error, {
      action: 'handleRevokeNode',
      nodeId: node.id,
      view: 'AutomationDevices',
    });
    toast.error(
      error.message || $t('page.automation_view.device_revoke_failed'),
    );
  }
}

function getColumns() {
  return [
    {
      field: 'name',
      title: $t('page.automation_view.col_workstation'),

      slots: { default: 'name-cell' },
    },
    {
      field: 'os_info',
      title: $t('page.automation_view.col_os'),

      slots: { default: 'os-cell' },
    },
    {
      field: 'hardware',
      title: $t('page.automation_view.col_hardware'),

      slots: { default: 'hardware-cell' },
    },
    {
      field: 'driver_type',
      title: $t('page.automation_view.col_driver'),

      cellRender: {
        name: 'CellTag',
        props: {
          capitalize: true,
          variant: 'secondary',
        },
      },
    },
    {
      field: 'status',
      title: $t('common.status'),

      cellRender: {
        name: 'CellStatus',
        props: {
          statusMap: {
            busy: {
              label: $t('page.automation_view.device_status_busy'),
              variant: 'primary',
            },
            disabled: {
              label: $t('common.disabled'),
              variant: 'destructive',
            },
            idle: {
              label: $t('page.automation_view.device_status_idle'),
              variant: 'success',
            },
            maintenance: {
              label: $t('page.automation_view.device_status_maintenance'),
              variant: 'warning',
            },
            offline: {
              label: $t('common.offline'),
              variant: 'muted',
            },
          },
        },
      },
    },
    {
      field: 'active_jobs',
      title: $t('term.jobs'),

      slots: { default: 'jobs-cell' },
    },
    {
      field: 'last_heartbeat_at',
      title: $t('page.fleet_view.col_last_seen'),

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

const [Grid, gridApi] = useVbenVxeGrid<Device>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    resource: 'workers.devices',
    subtitleField: 'hostname',
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
            {
              label: $t('page.automation_view.device_status_busy'),
              value: 'busy',
            },
            { label: $t('common.offline'), value: 'offline' },
            {
              label: $t('page.automation_view.device_status_maintenance'),
              value: 'maintenance',
            },
            { label: $t('common.disabled'), value: 'disabled' },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.automation_view.device_search_placeholder'),
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
          await checkDaemonHealth();
          const tenantId = (route.query.tenant as string) || undefined;
          const data = await listDevices({ tenantId });
          nodes.value = data;

          let filtered = data;
          if (formValues?.status && formValues.status !== 'all') {
            filtered = filtered.filter((n) => n.status === formValues.status);
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (n) =>
                n.name.toLowerCase().includes(kw) ||
                (n.hostname && n.hostname.toLowerCase().includes(kw)) ||
                (n.ip_address && n.ip_address.toLowerCase().includes(kw)),
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
    :title="$t('page.automation.devices')"
    :description="$t('page.automation.devices_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.automation.devices') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ nodes.length }}
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
          class="h-8 gap-1.5 px-2.5"
          @click="isConnectModalVisible = true"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('common.connect') }}</span>
        </Button>
      </div>
    </template>

    <!-- Main Container: Grid at Level 1 -->
    <Grid class="devices-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <div
            class="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground shrink-0"
          >
            <Laptop class="size-4" />
          </div>
          <div class="min-w-0">
            <div class="text-foreground truncate">
              {{ row.name }}
            </div>
            <div class="text-muted-foreground truncate">
              {{ row.hostname }} &bull; {{ row.ip_address }}
            </div>
          </div>
        </div>
      </template>

      <template #os-cell="{ row }">
        <Badge :variant="getOsBadgeVariant(row.os_info)" class="capitalize">
          {{ row.os_info }}
        </Badge>
      </template>

      <template #hardware-cell="{ row }">
        <div class="flex items-center gap-2.5 text-foreground">
          <span class="inline-flex items-center gap-1">
            <Cpu class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="leading-none">
              {{ $t('page.automation_view.cpu_cores_unit', [row.cpu_cores]) }}
            </span>
          </span>
          <span class="inline-flex items-center gap-1">
            <HardDrive class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="leading-none">{{ row.ram_gb }} GB</span>
          </span>
        </div>
      </template>

      <template #jobs-cell="{ row }">
        <span
          class="font-semibold"
          :class="
            row.active_jobs > 0 ? 'text-primary' : 'text-muted-foreground'
          "
        >
          {{ $t('page.automation_view.active_jobs_unit', [row.active_jobs]) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button variant="destructive" size="sm" class="h-7">
                {{ $t('page.automation_view.revoke_btn') }}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {{ $t('page.automation_view.revoke_device_confirm_title') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {{
                    $t('page.automation_view.revoke_device_confirm_desc', {
                      name: row.name,
                    })
                  }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction @click="handleRevokeNode(row)">
                  {{ $t('page.automation_view.revoke_btn') }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
        >
          <Laptop class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
          <p class="text-foreground">
            {{ $t('page.fleet_view.empty_all') }}
          </p>
          <p class="text-muted-foreground max-w-sm mt-1">
            {{ $t('page.fleet_view.empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>

    <!-- Modals -->
    <ConnectFleetModal
      v-model:open="isConnectModalVisible"
      :loopback-online="loopbackOnline"
      :loopback-port="8765"
      :probing="probingDaemon"
      @reprobe="checkDaemonHealth"
    />
  </Page>
</template>
