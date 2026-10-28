<script lang="ts" setup>
import type { RealAnalyticsData } from '#/api';

import { computed, onMounted, ref } from 'vue';

import {
  AreaChart,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DonutChart,
  Progress,
  Spinner,
  toast,
} from '@operon-core/shadcn-ui';

import {
  Activity,
  ArrowUpRight,
  Building2,
  Cpu,
  Layers,
  PieChart,
  Puzzle,
  RefreshCw,
  Terminal,
} from '@lucide/vue';

import { getRealAnalyticsData } from '#/api';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

defineOptions({ name: 'Analytics' });

const loading = ref(true);
const analyticsData = ref<RealAnalyticsData>({
  fleet: { loopbackPort: 8765, status: 'ready' },
  plugins: { coreCount: 0, items: [], moduleCount: 0, total: 0 },
  system: {
    edgeProvider: 'Cloudflare Pages',
    latencyMs: 20,
    status: 'healthy',
  },
  tenants: {
    activeCount: 0,
    growth: [],
    items: [],
    planBreakdown: { enterprise: 0, free: 0, pro: 0 },
    total: 0,
  },
});

const totalPlans = computed(() => {
  const { enterprise, free, pro } = analyticsData.value.tenants.planBreakdown;
  return enterprise + free + pro || 1;
});

const proPlanPercent = computed(() =>
  Math.round(
    (analyticsData.value.tenants.planBreakdown.pro / totalPlans.value) * 100,
  ),
);
const freePlanPercent = computed(() =>
  Math.round(
    (analyticsData.value.tenants.planBreakdown.free / totalPlans.value) * 100,
  ),
);
const entPlanPercent = computed(() =>
  Math.round(
    (analyticsData.value.tenants.planBreakdown.enterprise / totalPlans.value) *
      100,
  ),
);

const plansChartData = computed(() => [
  {
    count: analyticsData.value.tenants.planBreakdown.pro,
    plan: $t('page.analytics.plan_pro') || 'Pro',
  },
  {
    count: analyticsData.value.tenants.planBreakdown.free,
    plan: $t('page.analytics.plan_free') || 'Free',
  },
  {
    count: analyticsData.value.tenants.planBreakdown.enterprise,
    plan: $t('page.analytics.plan_enterprise') || 'Enterprise',
  },
]);

const totalPlugins = computed(
  () =>
    analyticsData.value.plugins.coreCount +
      analyticsData.value.plugins.moduleCount || 1,
);

const corePluginPercent = computed(() =>
  Math.round(
    (analyticsData.value.plugins.coreCount / totalPlugins.value) * 100,
  ),
);
const modulePluginPercent = computed(() =>
  Math.round(
    (analyticsData.value.plugins.moduleCount / totalPlugins.value) * 100,
  ),
);

async function loadAnalytics() {
  loading.value = true;
  try {
    const data = await getRealAnalyticsData();
    analyticsData.value = data;
  } catch (error: any) {
    captureError(error, { action: 'loadAnalytics', view: 'Analytics' });
    toast.error(error.message || $t('common.error'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAnalytics();
});
</script>

<template>
  <div class="space-y-3 p-3 sm:space-y-5 sm:p-5">
    <!-- Top Header: Streamlined, Flat & Compact -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <h1
          class="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          {{ $t('page.analytics.title') }}
        </h1>
        <p class="truncate text-muted-foreground sm:">
          {{ $t('page.analytics.description') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Badge
          variant="outline"
          class="hidden border-border/80 bg-background/50 px-2 py-0.5 text-muted-foreground sm:inline-flex"
        >
          <span class="relative mr-1.5 flex size-2">
            <span
              class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex size-2 rounded-full bg-emerald-500"
            ></span>
          </span>
          {{ $t('page.analytics.badge') }}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2.5 shadow-none"
          :disabled="loading"
          @click="loadAnalytics"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
          <span>{{ $t('common.refresh') }}</span>
        </Button>
      </div>
    </div>

    <!-- 4 Platform Metric Cards: Clean 2-Row Executive KPI Strip -->
    <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <!-- 1. Workspaces / Tenants Metric -->
      <Card
        data-testid="kpi-card-workspaces"
        class="border-border/60 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-border"
      >
        <div
          class="flex items-center justify-between gap-1 text-muted-foreground"
        >
          <span class="truncate uppercase tracking-wider">
            {{ $t('page.analytics.metric_workspaces') }}
          </span>
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Building2 class="size-3.5" />
          </div>
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <div
            data-testid="kpi-workspaces-total"
            class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            <span v-if="loading">--</span>
            <span v-else>{{ analyticsData.tenants.total }}</span>
          </div>
          <Badge
            data-testid="kpi-workspaces-status"
            variant="secondary"
            class="shrink-0 bg-primary/10 text-primary hover:bg-primary/15"
          >
            <span
              v-if="
                analyticsData.tenants.activeCount ===
                analyticsData.tenants.total
              "
            >
              {{ $t('page.analytics.active_workspaces') }}
            </span>
            <span v-else>
              {{ analyticsData.tenants.activeCount }}
              {{ $t('page.analytics.active') }}
            </span>
          </Badge>
        </div>
      </Card>

      <!-- 2. Registered Plugins Metric -->
      <Card
        data-testid="kpi-card-plugins"
        class="border-border/60 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-border"
      >
        <div
          class="flex items-center justify-between gap-1 text-muted-foreground"
        >
          <span class="truncate uppercase tracking-wider">
            {{ $t('page.analytics.metric_plugins') }}
          </span>
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <Layers class="size-3.5" />
          </div>
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <div
            class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            <span v-if="loading">--</span>
            <span v-else>{{ analyticsData.plugins.total }}</span>
          </div>
          <Badge variant="outline" class="shrink-0 text-muted-foreground">
            {{ analyticsData.plugins.coreCount }}
            {{ $t('page.analytics.core_suffix') }}
          </Badge>
        </div>
      </Card>

      <!-- 3. Local Fleet Port / Status Metric -->
      <Card
        data-testid="kpi-card-fleet"
        class="border-border/60 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-border"
      >
        <div
          class="flex items-center justify-between gap-1 text-muted-foreground"
        >
          <span class="truncate uppercase tracking-wider">
            {{ $t('page.analytics.metric_fleet') }}
          </span>
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <Terminal class="size-3.5" />
          </div>
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <div
            data-testid="kpi-fleet-port"
            class="truncate text-base font-bold tracking-tight text-foreground sm:text-lg"
          >
            {{ analyticsData.fleet.loopbackPort }}
          </div>
          <Badge
            variant="secondary"
            class="shrink-0 text-emerald-600 dark:text-emerald-400"
          >
            {{ analyticsData.fleet.status }}
          </Badge>
        </div>
      </Card>

      <!-- 4. System Latency & Edge Provider Metric -->
      <Card
        data-testid="kpi-card-latency"
        class="border-border/60 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-border"
      >
        <div
          class="flex items-center justify-between gap-1 text-muted-foreground"
        >
          <span class="truncate uppercase tracking-wider">
            {{ $t('page.analytics.metric_latency') }}
          </span>
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <Activity class="size-3.5" />
          </div>
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <div
            class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {{ analyticsData.system.latencyMs }}ms
          </div>
          <Badge
            variant="secondary"
            class="shrink-0 text-emerald-600 dark:text-emerald-400"
          >
            {{ analyticsData.system.status }}
          </Badge>
        </div>
      </Card>
    </div>

    <!-- Analytics Insights Row 1: Workspace Growth & Plan Structure -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Growth Summary Card (2 cols on lg) -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">
            {{ $t('page.analytics.growth_timeline') }}
          </CardTitle>
          <CardDescription>
            {{ $t('page.analytics.weekly_updates') }}
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              <ArrowUpRight class="mr-1 size-3 text-emerald-500" />
              +{{ analyticsData.tenants.growth.length }} records
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div
            v-if="loading"
            class="flex h-52 items-center justify-center text-muted-foreground"
          >
            <div class="flex items-center gap-2">
              <Spinner class="size-5 text-primary" />
              <span>{{ $t('common.loading') }}</span>
            </div>
          </div>

          <div v-else class="space-y-4">
            <!-- AreaChart for growth trend if enough data points exist -->
            <div
              v-if="analyticsData.tenants.growth.length > 1"
              class="h-44 w-full"
            >
              <AreaChart
                :data="analyticsData.tenants.growth"
                index="date"
                :categories="['count']"
                :show-legend="false"
                :show-grid-line="true"
                class="h-44"
              />
            </div>

            <!-- Fallback compact stat cards -->
            <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                v-for="point in analyticsData.tenants.growth.slice(-4)"
                :key="point.date"
                class="rounded-lg border border-border/50 bg-muted/20 p-3"
              >
                <div class="text-muted-foreground">
                  {{ point.date }}
                </div>
                <div class="mt-1 text-lg font-bold text-foreground">
                  {{ point.count }}
                </div>
                <div class="mt-1 text-emerald-600 dark:text-emerald-400">
                  Active Tenant Node
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border/40 bg-muted/10 p-3.5">
              <div
                class="flex items-center justify-between text-muted-foreground"
              >
                <span>Tenant Fleet Capacity</span>
                <span class="text-foreground">
                  {{ analyticsData.tenants.activeCount }} /
                  {{ analyticsData.tenants.total }} active
                </span>
              </div>
              <Progress
                :model-value="
                  analyticsData.tenants.total > 0
                    ? (analyticsData.tenants.activeCount /
                        analyticsData.tenants.total) *
                      100
                    : 0
                "
                class="mt-2 h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Plan Distribution Breakdown -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            {{ $t('page.analytics.plans_structure') }}
          </CardTitle>
          <CardDescription>
            {{ $t('page.analytics.actual') }}
          </CardDescription>
          <CardAction>
            <PieChart class="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>

        <CardContent>
          <div
            v-if="loading"
            class="flex h-52 items-center justify-center text-muted-foreground"
          >
            <div class="flex items-center gap-2">
              <Spinner class="size-5 text-primary" />
              <span>{{ $t('common.loading') }}</span>
            </div>
          </div>

          <div v-else class="space-y-4">
            <!-- Visual Donut Chart if non-zero subscriptions -->
            <div
              v-if="analyticsData.tenants.total > 0"
              class="flex justify-center py-1"
            >
              <DonutChart
                :data="plansChartData"
                index="plan"
                category="count"
                :show-legend="false"
                class="h-32 w-32"
              />
            </div>

            <!-- Pro Plan -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-foreground">
                  {{ $t('page.analytics.plan_pro') }}
                </span>
                <span class="text-muted-foreground">
                  {{ analyticsData.tenants.planBreakdown.pro }} ({{
                    proPlanPercent
                  }}%)
                </span>
              </div>
              <Progress :model-value="proPlanPercent" class="h-2 bg-muted" />
            </div>

            <!-- Free Plan -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-foreground">
                  {{ $t('page.analytics.plan_free') }}
                </span>
                <span class="text-muted-foreground">
                  {{ analyticsData.tenants.planBreakdown.free }} ({{
                    freePlanPercent
                  }}%)
                </span>
              </div>
              <Progress :model-value="freePlanPercent" class="h-2 bg-muted" />
            </div>

            <!-- Enterprise Plan -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-foreground">
                  {{ $t('page.analytics.plan_enterprise') }}
                </span>
                <span class="text-muted-foreground">
                  {{ analyticsData.tenants.planBreakdown.enterprise }} ({{
                    entPlanPercent
                  }}%)
                </span>
              </div>
              <Progress :model-value="entPlanPercent" class="h-2 bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Analytics Insights Row 2: Plugins Core vs Module & Infrastructure Status -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Plugins Breakdown Card (2 cols on lg) -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">
            {{ $t('page.analytics.plugins_distribution') }}
          </CardTitle>
          <CardDescription>
            {{ $t('page.analytics.actual') }}
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              Total: {{ analyticsData.plugins.total }}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div
            v-if="loading"
            class="flex h-44 items-center justify-center text-muted-foreground"
          >
            <div class="flex items-center gap-2">
              <Spinner class="size-5 text-primary" />
              <span>{{ $t('common.loading') }}</span>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                <div class="flex items-center gap-2">
                  <Cpu class="size-4 text-primary" />
                  <span class="text-foreground">
                    {{ $t('page.analytics.core_kernel') }}
                  </span>
                </div>
                <div class="mt-2 text-xl font-bold text-foreground">
                  {{ analyticsData.plugins.coreCount }}
                </div>
                <Progress :model-value="corePluginPercent" class="mt-2 h-1.5" />
              </div>

              <div class="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                <div class="flex items-center gap-2">
                  <Puzzle class="size-4 text-accent-foreground" />
                  <span class="text-foreground">
                    {{ $t('page.analytics.service_modules') }}
                  </span>
                </div>
                <div class="mt-2 text-xl font-bold text-foreground">
                  {{ analyticsData.plugins.moduleCount }}
                </div>
                <Progress
                  :model-value="modulePluginPercent"
                  class="mt-2 h-1.5"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Infrastructure Status List -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            {{ $t('page.analytics.services_title') }}
          </CardTitle>
          <CardDescription> System Core Invariants </CardDescription>
        </CardHeader>

        <CardContent>
          <div class="divide-y divide-border/40">
            <div class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-foreground">
                  {{ $t('page.analytics.service_database') }}
                </div>
                <div class="text-muted-foreground">
                  {{ $t('page.analytics.service_database_desc') }}
                </div>
              </div>
              <Badge variant="secondary">
                <span
                  class="mr-1.5 size-1.5 rounded-full bg-emerald-500"
                ></span>
                {{ $t('page.analytics.operational') }}
              </Badge>
            </div>

            <div class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-foreground">
                  {{ $t('page.analytics.edge_delivery') }}
                </div>
                <div class="text-muted-foreground">
                  {{ analyticsData.system.edgeProvider }}
                </div>
              </div>
              <Badge variant="secondary">
                <span
                  class="mr-1.5 size-1.5 rounded-full bg-emerald-500"
                ></span>
                {{ $t('page.analytics.online') }}
              </Badge>
            </div>

            <div class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-foreground">
                  {{ $t('page.analytics.service_gateway') }}
                </div>
                <div class="text-muted-foreground">
                  {{ $t('page.analytics.service_gateway_desc') }}
                </div>
              </div>
              <Badge variant="secondary">
                <span
                  class="mr-1.5 size-1.5 rounded-full bg-emerald-500"
                ></span>
                {{ $t('page.analytics.operational') }}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
