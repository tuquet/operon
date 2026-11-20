<script lang="ts" setup>
import type { Component } from 'vue';

import { computed } from 'vue';

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

import { $t } from '#/locales';

import AnalyticsLoadingState from './components/AnalyticsLoadingState.vue';
import { useAnalyticsMetrics } from './use-analytics-metrics';

defineOptions({ name: 'Analytics' });

interface KpiCardItem {
  badgeClass: string;
  badgeTestId?: string;
  badgeText: string;
  badgeVariant: 'outline' | 'secondary';
  cardTestId: string;
  icon: Component;
  iconWrapperClass: string;
  label: string;
  showLoadingDash?: boolean;
  value: number | string;
  valueClass?: string;
  valueTestId?: string;
}

const {
  analyticsData,
  corePluginPercent,
  entPlanPercent,
  freePlanPercent,
  loadAnalytics,
  loading,
  modulePluginPercent,
  plansChartData,
  proPlanPercent,
} = useAnalyticsMetrics();

const kpiCards = computed<KpiCardItem[]>(() => {
  const { fleet, plugins, system, tenants } = analyticsData.value;
  return [
    {
      badgeClass: 'shrink-0 bg-primary/10 text-primary hover:bg-primary/15',
      badgeTestId: 'kpi-tenants-status',
      badgeText:
        tenants.activeCount === tenants.total
          ? $t('page.analytics.active_tenants')
          : `${tenants.activeCount} ${$t('page.analytics.active')}`,
      badgeVariant: 'secondary',
      cardTestId: 'kpi-card-tenants',
      icon: Building2,
      iconWrapperClass: 'bg-primary/10 text-primary',
      label: $t('page.analytics.metric_tenants'),
      showLoadingDash: true,
      value: tenants.total,
      valueTestId: 'kpi-tenants-total',
    },
    {
      badgeClass: 'shrink-0 text-muted-foreground',
      badgeText: `${plugins.coreCount} ${$t('page.analytics.core_suffix')}`,
      badgeVariant: 'outline',
      cardTestId: 'kpi-card-plugins',
      icon: Layers,
      iconWrapperClass: 'bg-muted text-muted-foreground',
      label: $t('page.analytics.metric_plugins'),
      showLoadingDash: true,
      value: plugins.total,
    },
    {
      badgeClass: 'shrink-0 text-success',
      badgeText: fleet.status,
      badgeVariant: 'secondary',
      cardTestId: 'kpi-card-fleet',
      icon: Terminal,
      iconWrapperClass: 'bg-muted text-muted-foreground',
      label: $t('page.analytics.metric_fleet'),
      value: fleet.loopbackPort,
      valueClass:
        'truncate text-base font-bold tracking-tight text-foreground sm:text-lg',
      valueTestId: 'kpi-fleet-port',
    },
    {
      badgeClass: 'shrink-0 text-success',
      badgeText: system.status,
      badgeVariant: 'secondary',
      cardTestId: 'kpi-card-latency',
      icon: Activity,
      iconWrapperClass: 'bg-success/10 text-success',
      label: $t('page.analytics.metric_latency'),
      value: `${system.latencyMs}ms`,
    },
  ];
});

const planRows = computed(() => [
  {
    count: analyticsData.value.tenants.planBreakdown.pro,
    key: 'pro',
    label: $t('page.analytics.plan_pro'),
    percent: proPlanPercent.value,
  },
  {
    count: analyticsData.value.tenants.planBreakdown.free,
    key: 'free',
    label: $t('page.analytics.plan_free'),
    percent: freePlanPercent.value,
  },
  {
    count: analyticsData.value.tenants.planBreakdown.enterprise,
    key: 'enterprise',
    label: $t('page.analytics.plan_enterprise'),
    percent: entPlanPercent.value,
  },
]);
</script>

<template>
  <div class="flex flex-col gap-3 p-3 sm:gap-5 sm:p-5">
    <!-- Top Header: Streamlined, Flat & Compact -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <h1
          class="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          {{ $t('page.analytics.title') }}
        </h1>
        <p class="truncate text-xs text-muted-foreground sm:text-sm">
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
              class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75"
            ></span>
            <span
              class="relative inline-flex size-2 rounded-full bg-success"
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
      <Card
        v-for="kpi in kpiCards"
        :key="kpi.cardTestId"
        :data-testid="kpi.cardTestId"
        class="border-border/60 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-border"
      >
        <div
          class="flex items-center justify-between gap-1 text-muted-foreground"
        >
          <span class="truncate text-xs font-medium uppercase tracking-wider">
            {{ kpi.label }}
          </span>
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg"
            :class="kpi.iconWrapperClass"
          >
            <component :is="kpi.icon" class="size-3.5" />
          </div>
        </div>

        <div class="mt-2.5 flex items-baseline justify-between gap-2">
          <div
            :data-testid="kpi.valueTestId"
            :class="
              kpi.valueClass ??
              'text-xl font-bold tracking-tight text-foreground sm:text-2xl'
            "
          >
            <span v-if="kpi.showLoadingDash && loading">--</span>
            <span v-else>{{ kpi.value }}</span>
          </div>
          <Badge
            :data-testid="kpi.badgeTestId"
            :variant="kpi.badgeVariant"
            :class="kpi.badgeClass"
          >
            {{ kpi.badgeText }}
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
              <ArrowUpRight class="mr-1 size-3 text-success" />
              +{{ analyticsData.tenants.growth.length }} records
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          <AnalyticsLoadingState v-if="loading" />

          <div v-else class="flex flex-col gap-4">
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
                <div class="mt-1 text-xs text-success">Active Tenant Node</div>
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
          <AnalyticsLoadingState v-if="loading" />

          <div v-else class="flex flex-col gap-4">
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
                class="size-32"
              />
            </div>

            <div
              v-for="plan in planRows"
              :key="plan.key"
              class="flex flex-col gap-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-foreground">
                  {{ plan.label }}
                </span>
                <span class="text-muted-foreground">
                  {{ plan.count }} ({{ plan.percent }}%)
                </span>
              </div>
              <Progress :model-value="plan.percent" class="h-2 bg-muted" />
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
          <AnalyticsLoadingState v-if="loading" height-class="h-44" />

          <div v-else class="flex flex-col gap-4">
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
                <div class="text-sm font-medium text-foreground">
                  {{ $t('page.analytics.service_database') }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ $t('page.analytics.service_database_desc') }}
                </div>
              </div>
              <Badge variant="secondary">
                <span class="mr-1.5 size-1.5 rounded-full bg-success"></span>
                {{ $t('page.analytics.operational') }}
              </Badge>
            </div>

            <div class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-sm font-medium text-foreground">
                  {{ $t('page.analytics.edge_delivery') }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ analyticsData.system.edgeProvider }}
                </div>
              </div>
              <Badge variant="secondary">
                <span class="mr-1.5 size-1.5 rounded-full bg-success"></span>
                {{ $t('page.analytics.online') }}
              </Badge>
            </div>

            <div class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-sm font-medium text-foreground">
                  {{ $t('page.analytics.service_gateway') }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ $t('page.analytics.service_gateway_desc') }}
                </div>
              </div>
              <Badge variant="secondary">
                <span class="mr-1.5 size-1.5 rounded-full bg-success"></span>
                {{ $t('page.analytics.operational') }}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
