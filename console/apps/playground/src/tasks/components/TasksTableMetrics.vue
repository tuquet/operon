<script setup lang="ts">
import type { VueTable } from '@tanstack/vue-table';

import type { DataTableFeatures } from '../../components/data-table';
import type { Task } from '../data/schema';

import { computed } from 'vue';

import { Button, Progress } from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { CheckCircle2, Flame, Layers, Timer } from '@lucide/vue';

interface TasksTableMetricsProps {
  metrics: {
    completionRate: number;
    done: number;
    highPriority: number;
    inProgress: number;
    total: number;
  };
  table: VueTable<DataTableFeatures, Task>;
}

type MetricPresetKey = 'all' | 'done' | 'high' | 'in-progress';

interface MetricCardConfig {
  activeClass: string;
  columnId?: 'priority' | 'status';
  filterValue?: string;
  icon: unknown;
  iconClass: string;
  key: MetricPresetKey;
  label: string;
  showProgress?: boolean;
  subtext: () => string;
  value: () => number | string;
}

const props = defineProps<TasksTableMetricsProps>();

function sharePercent(count: number): number {
  return props.metrics.total > 0
    ? Math.round((count / props.metrics.total) * 100)
    : 0;
}

const metricCards: MetricCardConfig[] = [
  {
    key: 'all',
    label: 'All Issues',
    icon: Layers,
    iconClass: 'text-muted-foreground',
    activeClass: 'border-foreground/25 after:bg-primary shadow-2xs',
    value: () => props.metrics.total,
    subtext: () => 'Active queue',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Timer,
    iconClass: 'text-sky-500',
    activeClass: 'border-sky-500/40 shadow-2xs after:bg-sky-500',
    columnId: 'status',
    filterValue: 'in progress',
    value: () => props.metrics.inProgress,
    subtext: () => `${sharePercent(props.metrics.inProgress)}% of total`,
  },
  {
    key: 'high',
    label: 'High Priority',
    icon: Flame,
    iconClass: 'text-rose-500',
    activeClass: 'border-rose-500/40 shadow-2xs after:bg-rose-500',
    columnId: 'priority',
    filterValue: 'high',
    value: () => props.metrics.highPriority,
    subtext: () => `${sharePercent(props.metrics.highPriority)}% urgent`,
  },
  {
    key: 'done',
    label: 'Completed',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    activeClass: 'border-emerald-500/40 shadow-2xs after:bg-emerald-500',
    columnId: 'status',
    filterValue: 'done',
    showProgress: true,
    value: () => `${props.metrics.completionRate}%`,
    subtext: () => `${props.metrics.done}/${props.metrics.total}`,
  },
];

const activeFilterKey = computed(() => {
  const filters = props.table.atoms.columnFilters.get();
  if (filters.length === 0) return 'all';
  const first = filters.length === 1 ? filters[0] : undefined;
  if (first) {
    const val = Array.isArray(first.value) ? first.value : [];
    const matched = metricCards.find(
      (c) =>
        c.columnId === first.id && val.length === 1 && val[0] === c.filterValue,
    );
    if (matched) return matched.key;
  }
  return 'custom';
});

function applyPreset(card: MetricCardConfig) {
  const shouldClear = card.key === 'all' || activeFilterKey.value === card.key;
  props.table.resetColumnFilters();
  if (!shouldClear && card.columnId && card.filterValue) {
    props.table.getColumn(card.columnId)?.setFilterValue([card.filterValue]);
  }
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Button
      v-for="card in metricCards"
      :key="card.key"
      type="button"
      variant="outline"
      :class="
        cn(
          'bg-card relative flex h-auto w-full flex-col items-stretch justify-between overflow-hidden rounded-lg border px-4 py-3 text-left font-normal whitespace-normal transition-all',
          activeFilterKey === card.key
            ? cn(
                card.activeClass,
                'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5',
              )
            : 'border-border/70 hover:border-border hover:bg-accent/20',
        )
      "
      @click="applyPreset(card)"
    >
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground text-xs font-medium">
          {{ card.label }}
        </span>
        <component :is="card.icon" class="size-3.5" :class="card.iconClass" />
      </div>
      <div
        class="mt-2 flex justify-between"
        :class="
          card.showProgress ? 'items-center gap-3' : 'items-baseline gap-2'
        "
      >
        <span
          class="text-foreground font-mono text-xl font-semibold tracking-tight"
        >
          {{ card.value() }}
        </span>
        <div
          v-if="card.showProgress"
          class="flex flex-1 items-center justify-end gap-2"
        >
          <Progress
            :model-value="metrics.completionRate"
            class="h-1.5 max-w-16"
          />
          <span
            class="text-muted-foreground font-mono text-[11px] whitespace-nowrap"
          >
            {{ card.subtext() }}
          </span>
        </div>
        <span v-else class="text-muted-foreground font-mono text-[11px]">
          {{ card.subtext() }}
        </span>
      </div>
    </Button>
  </div>
</template>
