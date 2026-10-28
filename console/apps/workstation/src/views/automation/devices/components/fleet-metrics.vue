<script lang="ts" setup>
import type { FleetMetricsData } from '#/api';

import { CheckCircle2, Cpu, Laptop, Terminal } from '@lucide/vue';

import { $t } from '#/locales';

interface Props {
  loading?: boolean;
  metrics: FleetMetricsData;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});
</script>

<template>
  <div class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
    <!-- Metric 1: Total Nodes -->
    <div
      class="rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="truncate text-muted-foreground sm:">
          {{ $t('page.fleet_view.metric_total_nodes') }}
        </span>
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:size-9"
        >
          <Laptop class="size-3.5 sm:size-4.5" />
        </span>
      </div>
      <div class="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
        <span
          class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {{ props.metrics.total_nodes }}
        </span>
        <span class="truncate text-muted-foreground">
          {{ $t('page.fleet_view.metric_devices_unit') }}
        </span>
      </div>
      <div class="mt-1 hidden text-muted-foreground sm:mt-2 sm:block">
        {{ $t('page.fleet_view.metric_registered_desc') }}
      </div>
    </div>

    <!-- Metric 2: Online Nodes -->
    <div
      class="rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="truncate text-muted-foreground sm:">
          {{ $t('page.fleet_view.metric_online_nodes') }}
        </span>
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:size-9"
        >
          <CheckCircle2 class="size-3.5 text-success sm:size-4.5" />
        </span>
      </div>
      <div class="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
        <span
          class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {{ props.metrics.online_nodes }}
        </span>
        <span class="truncate text-muted-foreground">
          {{ $t('page.fleet_view.metric_ready_unit') }}
        </span>
      </div>
      <div
        class="mt-1 hidden items-center gap-1.5 text-muted-foreground sm:mt-2 sm:flex"
      >
        <span
          class="size-2 shrink-0 animate-pulse rounded-full bg-success"
        ></span>
        <span class="truncate">{{
          $t('page.fleet_view.metric_auto_exec_desc')
        }}</span>
      </div>
    </div>

    <!-- Metric 3: Active Jobs -->
    <div
      class="rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="truncate text-muted-foreground sm:">
          {{ $t('page.fleet_view.metric_active_jobs') }}
        </span>
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:size-9"
        >
          <Cpu class="size-3.5 sm:size-4.5" />
        </span>
      </div>
      <div class="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
        <span
          class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {{ props.metrics.active_jobs }}
        </span>
        <span class="truncate text-muted-foreground">
          {{ $t('page.fleet_view.metric_jobs_unit') }}
        </span>
      </div>
      <div class="mt-1 hidden text-muted-foreground sm:mt-2 sm:block">
        {{ $t('page.fleet_view.metric_active_jobs_desc') }}
      </div>
    </div>

    <!-- Metric 4: Loopback Daemon -->
    <div
      class="rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="truncate text-muted-foreground sm:">
          {{ $t('page.fleet_view.metric_loopback_port') }}
        </span>
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:size-9"
        >
          <Terminal class="size-3.5 sm:size-4.5" />
        </span>
      </div>
      <div class="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
        <span
          class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          :{{ props.metrics.loopback_port }}
        </span>
        <span
          v-if="props.metrics.loopback_online"
          class="inline-flex items-center gap-1 text-foreground"
        >
          <span
            class="size-1.5 shrink-0 animate-pulse rounded-full bg-success sm:size-2"
          ></span>
          {{ $t('page.fleet_view.online') }}
        </span>
        <span v-else class="text-muted-foreground">
          {{ $t('page.fleet_view.standby') }}
        </span>
      </div>
      <div class="mt-1 hidden text-muted-foreground sm:mt-2 sm:block">
        {{ $t('page.fleet_view.process_supervisor') }}
      </div>
    </div>
  </div>
</template>
