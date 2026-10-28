<script lang="ts" setup>
import type { AutomationOverviewSummary } from '#/api';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@operon/common-ui';

import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  toast,
} from '@operon-core/shadcn-ui';

import {
  ArrowRight,
  Cpu,
  FileText,
  GitBranch,
  Globe,
  Laptop,
  Network,
  PlayCircle,
  Plus,
  RefreshCw,
  Terminal,
} from '@lucide/vue';

import { calculateProgressPercentage, getAutomationOverview } from '#/api';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

import ConnectFleetModal from '../devices/components/modals/connect-fleet-modal.vue';

defineOptions({ name: 'AutomationOverview' });

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const isConnectModalVisible = ref(false);

const overview = ref<AutomationOverviewSummary>({
  browsers: { error: 0, idle: 0, running: 0, total: 0 },
  fleet: {
    active_jobs: 0,
    loopback_online: false,
    loopback_port: 8765,
    online_nodes: 0,
    total_nodes: 0,
  },
  proxies: { active: 0, avgLatencyMs: 0, failing: 0, total: 0 },
  recentDevices: [],
  recentRuns: [],
  runs: { completed: 0, failed: 0, running: 0, total: 0 },
  workflows: { archived: 0, draft: 0, published: 0, total: 0 },
});

const moduleCards = computed(() => [
  {
    icon: GitBranch,
    key: 'workflows',
    path: '/automation/workflows',
    subtext: $t('page.automation_view.overview_published_draft', [
      overview.value.workflows.published,
      overview.value.workflows.draft,
    ]),
    title: $t('page.automation.workflows'),
    total: overview.value.workflows.total,
  },
  {
    icon: PlayCircle,
    key: 'runs',
    path: '/automation/jobs',
    subtext: $t('page.automation_view.overview_running_completed', [
      overview.value.runs.running,
      overview.value.runs.completed,
    ]),
    title: $t('page.automation.runs'),
    total: overview.value.runs.total,
  },
  {
    icon: Laptop,
    key: 'devices',
    path: '/automation/devices',
    subtext: $t('page.automation_view.overview_online_total', [
      overview.value.fleet.online_nodes,
      overview.value.fleet.active_jobs,
    ]),
    title: $t('page.automation.devices'),
    total: overview.value.fleet.total_nodes,
  },
  {
    icon: Globe,
    key: 'browsers',
    path: '/automation/browsers',
    subtext: $t('page.automation_view.overview_browsers_running', [
      overview.value.browsers.running,
      overview.value.browsers.idle,
    ]),
    title: $t('page.automation.browsers'),
    total: overview.value.browsers.total,
  },
  {
    icon: Network,
    key: 'proxies',
    path: '/automation/proxies',
    subtext: $t('page.automation_view.overview_proxies_active', [
      overview.value.proxies.active,
      overview.value.proxies.avgLatencyMs,
    ]),
    title: $t('page.automation.proxies'),
    total: overview.value.proxies.total,
  },
]);

async function loadOverview() {
  loading.value = true;
  try {
    const tenantId = (route.query.tenant as string) || undefined;
    overview.value = await getAutomationOverview({ tenantId });
  } catch (error: any) {
    captureError(error, { action: 'loadOverview', view: 'AutomationOverview' });
    toast.error(
      error?.message || $t('page.automation_view.overview_load_failed'),
    );
  } finally {
    loading.value = false;
  }
}

function navigateTo(path: string) {
  const tenant = route.query.tenant as string | undefined;
  router.push(tenant ? { path, query: { tenant } } : { path });
}

function getRunStatusLabel(status: string) {
  switch (status) {
    case 'cancelled': {
      return $t('page.jobs_view.status_cancelled');
    }
    case 'completed': {
      return $t('page.jobs_view.status_completed');
    }
    case 'failed': {
      return $t('page.jobs_view.status_failed');
    }
    case 'queued': {
      return $t('page.jobs_view.status_queued');
    }
    case 'running': {
      return $t('page.jobs_view.status_running');
    }
    default: {
      return $t('page.jobs_view.status_pending');
    }
  }
}

function getDeviceStatusLabel(status: string) {
  switch (status) {
    case 'busy': {
      return $t('page.automation_view.device_status_busy');
    }
    case 'idle': {
      return $t('page.automation_view.device_status_idle');
    }
    case 'maintenance': {
      return $t('page.automation_view.device_status_maintenance');
    }
    default: {
      return $t('common.offline');
    }
  }
}

watch(
  () => route.query.tenant,
  () => {
    loadOverview();
  },
);

onMounted(() => {
  loadOverview();
});
</script>

<template>
  <Page
    :title="$t('page.automation.overview')"
    :description="$t('page.automation.overview_desc')"
  >
    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Badge
          variant="outline"
          class="hidden h-8 items-center gap-1.5 px-2.5 sm:inline-flex"
        >
          <Terminal class="size-3.5 text-muted-foreground" />
          <span>:{{ overview.fleet.loopback_port }}</span>
          <span
            class="size-1.5 rounded-full"
            :class="
              overview.fleet.loopback_online
                ? 'animate-pulse bg-success'
                : 'bg-muted-foreground'
            "
          ></span>
          <span class="font-sans text-muted-foreground">{{
            overview.fleet.loopback_online
              ? $t('page.fleet_view.online')
              : $t('page.fleet_view.standby')
          }}</span>
        </Badge>
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2.5"
          :disabled="loading"
          :title="$t('common.refresh')"
          @click="loadOverview"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
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

    <!-- 1. Unified Actionable Automation & Fleet KPI Grid (2 cols on Mobile, 5 cols on Desktop) -->
    <div>
      <div
        class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5"
      >
        <Card
          v-for="mod in moduleCards"
          :key="mod.key"
          tabindex="0"
          role="button"
          class="group cursor-pointer justify-between p-3 transition-all hover:border-primary/40 hover:bg-muted/20 sm:p-4"
          :aria-label="`${mod.title}: ${mod.total}`"
          @click="navigateTo(mod.path)"
          @keydown.enter="navigateTo(mod.path)"
        >
          <div class="flex items-center justify-between gap-2">
            <div
              class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <component :is="mod.icon" class="size-4" />
            </div>
            <ArrowRight
              class="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <div class="mt-2.5">
            <div class="flex items-baseline justify-between gap-1.5">
              <span class="truncate text-foreground">
                {{ mod.title }}
              </span>
              <span class="text-base font-bold text-foreground sm:text-lg">
                {{ mod.total }}
              </span>
            </div>
            <p class="mt-0.5 truncate text-muted-foreground">
              {{ mod.subtext }}
            </p>
          </div>
        </Card>
      </div>
    </div>

    <!-- 3. Recent Jobs & Worker Devices -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Recent Runs -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <PlayCircle class="size-4 text-muted-foreground" />
            <span>{{ $t('page.automation_view.overview_recent_runs') }}</span>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
              @click="navigateTo('/automation/jobs')"
            >
              <span>{{ $t('page.automation_view.overview_view_all') }}</span>
              <ArrowRight class="size-3" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div
            v-if="overview.recentRuns.length > 0"
            class="divide-y divide-border/40"
          >
            <div
              v-for="run in overview.recentRuns"
              :key="run.id"
              class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-foreground">
                    {{ run.name }}
                  </span>
                  <Badge variant="outline">
                    <span
                      class="mr-1 size-1.5 rounded-full"
                      :class="{
                        'bg-primary animate-pulse': run.status === 'running',
                        'bg-success': run.status === 'completed',
                        'bg-destructive': run.status === 'failed',
                        'bg-muted-foreground':
                          run.status !== 'running' &&
                          run.status !== 'completed' &&
                          run.status !== 'failed',
                      }"
                    ></span>
                    {{ getRunStatusLabel(run.status) }}
                  </Badge>
                </div>
                <div class="mt-1 flex items-center gap-2 text-muted-foreground">
                  <span class="truncate">
                    {{
                      run.workflow?.name ||
                      $t('page.jobs_view.unassigned_workflow')
                    }}
                  </span>
                  <span>&bull;</span>
                  <span>
                    {{
                      calculateProgressPercentage(
                        run.completed_tasks,
                        run.total_tasks,
                      )
                    }}%
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                class="h-7 shrink-0 gap-1 px-2"
                @click="router.push(`/automation/jobs/${run.id}`)"
              >
                <FileText class="size-3.5" />
                <span class="hidden sm:inline">{{
                  $t('page.jobs_view.logs_btn')
                }}</span>
              </Button>
            </div>
          </div>
          <Empty v-else class="border-none py-6">
            <EmptyHeader>
              <EmptyDescription>
                {{ $t('page.jobs_view.empty_title') }}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>

      <!-- Recent Devices -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Laptop class="size-4 text-muted-foreground" />
            <span>{{
              $t('page.automation_view.overview_recent_devices')
            }}</span>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
              @click="navigateTo('/automation/devices')"
            >
              <span>{{ $t('page.automation_view.overview_view_all') }}</span>
              <ArrowRight class="size-3" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div
            v-if="overview.recentDevices.length > 0"
            class="divide-y divide-border/40"
          >
            <div
              v-for="device in overview.recentDevices"
              :key="device.id"
              class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-foreground">
                    {{ device.name }}
                  </span>
                  <Badge variant="outline" class="capitalize">
                    {{ device.os_info }}
                  </Badge>
                </div>
                <div class="mt-1 flex items-center gap-2 text-muted-foreground">
                  <span class="inline-flex items-center gap-1">
                    <Cpu class="size-3" />
                    {{
                      $t('page.automation_view.cpu_cores_unit', [
                        device.cpu_cores,
                      ])
                    }}
                  </span>
                  <span>&bull;</span>
                  <span>{{ device.ram_gb }} GB</span>
                  <span>&bull;</span>
                  <span>{{
                    $t('page.automation_view.active_jobs_unit', [
                      device.active_jobs,
                    ])
                  }}</span>
                </div>
              </div>

              <Badge variant="outline">
                <span
                  class="mr-1 size-1.5 rounded-full"
                  :class="{
                    'bg-success': device.status === 'idle',
                    'bg-primary animate-pulse': device.status === 'busy',
                    'bg-warning': device.status === 'maintenance',
                    'bg-muted-foreground':
                      device.status === 'offline' ||
                      device.status === 'disabled',
                  }"
                ></span>
                {{ getDeviceStatusLabel(device.status) }}
              </Badge>
            </div>
          </div>
          <Empty v-else class="border-none py-6">
            <EmptyHeader>
              <EmptyDescription>
                {{ $t('page.fleet_view.devices_empty') }}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>

    <ConnectFleetModal
      v-model:open="isConnectModalVisible"
      :loopback-online="overview.fleet.loopback_online"
      :loopback-port="overview.fleet.loopback_port"
      :probing="loading"
      @reprobe="loadOverview"
    />
  </Page>
</template>
