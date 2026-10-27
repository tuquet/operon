<script setup lang="ts" generic="T extends Record<string, any>">
import type { BulletLegendItemInterface } from '@unovis/ts';

import type { Component } from 'vue';

import type { BaseChartProps } from '../chart';

import { computed, ref, watch } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { Axis, GroupedBar, StackedBar } from '@unovis/ts';
import {
  VisAxis,
  VisGroupedBar,
  VisStackedBar,
  VisXYContainer,
} from '@unovis/vue';
import { useMounted } from '@vueuse/core';

import { ChartCrosshair, ChartLegend, defaultColors } from '../chart';

const props = withDefaults(
  defineProps<
    BaseChartProps<T> & {
      /**
       * Render custom tooltip component.
       */
      customTooltip?: Component;
      /**
       * Rounded bar corners
       * @default 4
       */
      roundedCorners?: number;
      /**
       * Change the type of the chart
       * @default "grouped"
       */
      type?: 'grouped' | 'stacked';
    }
  >(),
  {
    filterOpacity: 0.2,
    margin: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
    roundedCorners: 4,
    showGridLine: true,
    showLegend: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    type: 'grouped',
  },
);
const emits = defineEmits<{
  legendItemClick: [d: BulletLegendItemInterface, i: number];
}>();

type KeyOfT = Extract<keyof T, string>;
type Data = (typeof props.data)[number];

const index = computed(() => props.index as KeyOfT);
const colors = computed(() =>
  props.colors?.length ? props.colors : defaultColors(props.categories.length),
);
const legendItems = ref<BulletLegendItemInterface[]>(
  props.categories.map((category, i) => ({
    color: colors.value[i],
    inactive: false,
    name: category,
  })),
);

watch(
  [colors, () => props.categories],
  () => {
    legendItems.value = props.categories.map((category, i) => ({
      color: colors.value[i],
      inactive:
        legendItems.value.find((item) => item.name === category)?.inactive ??
        false,
      name: category,
    }));
  },
  { deep: true },
);

const isMounted = useMounted();

function handleLegendItemClick(d: BulletLegendItemInterface, i: number) {
  emits('legendItemClick', d, i);
}

const VisBarComponent = computed(() =>
  props.type === 'grouped' ? VisGroupedBar : VisStackedBar,
);
const selectorsBar = computed(() =>
  props.type === 'grouped'
    ? GroupedBar.selectors.bar
    : StackedBar.selectors.bar,
);
</script>

<template>
  <div
    :class="cn('flex h-[320px] w-full flex-col items-end', $attrs.class ?? '')"
  >
    <ChartLegend
      v-if="showLegend"
      v-model:items="legendItems"
      @legend-item-click="handleLegendItemClick"
    />

    <VisXYContainer
      :data="data"
      :margin="margin"
      :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
    >
      <ChartCrosshair
        v-if="showTooltip"
        :colors="colors"
        :custom-tooltip="customTooltip"
        :index="index"
        :items="legendItems"
      />

      <VisBarComponent
        :attributes="{
          [selectorsBar]: {
            opacity: (_d: Data, i: number) => {
              const pos = i % categories.length;
              return legendItems[pos]?.inactive ? filterOpacity : 1;
            },
          },
        }"
        :bar-padding="0.05"
        :color="colors"
        :rounded-corners="roundedCorners"
        :x="(_d: Data, i: number) => i"
        :y="categories.map((category) => (d: Data) => d[category])"
      />

      <VisAxis
        v-if="showXAxis"
        :domain-line="false"
        :grid-line="false"
        :num-ticks="data.length"
        :tick-format="
          xFormatter ??
          ((v: number) => (Number.isInteger(v) ? (data[v]?.[index] ?? '') : ''))
        "
        :tick-line="false"
        :tick-values="data.map((_, i) => i)"
        tick-text-color="hsl(var(--muted-foreground))"
        type="x"
      />
      <VisAxis
        v-if="showYAxis"
        :attributes="{
          [Axis.selectors.grid]: {
            class: 'stroke-border/40',
          },
        }"
        :domain-line="false"
        :grid-line="showGridLine"
        :tick-format="yFormatter"
        :tick-line="false"
        tick-text-color="hsl(var(--muted-foreground))"
        type="y"
      />

      <slot></slot>
    </VisXYContainer>
  </div>
</template>
