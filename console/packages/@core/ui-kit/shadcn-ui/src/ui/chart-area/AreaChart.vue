<script setup lang="ts" generic="T extends Record<string, any>">
import type { BulletLegendItemInterface } from '@unovis/ts';

import type { Component } from 'vue';

import type { BaseChartProps } from '../chart';

import { computed, ref, useId, watch } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { Area, Axis, CurveType, Line } from '@unovis/ts';
import { VisArea, VisAxis, VisLine, VisXYContainer } from '@unovis/vue';
import { useMounted } from '@vueuse/core';

import { ChartCrosshair, ChartLegend, defaultColors } from '../chart';

const props = withDefaults(
  defineProps<
    BaseChartProps<T> & {
      /**
       * Type of curve
       */
      curveType?: CurveType;
      /**
       * Render custom tooltip component.
       */
      customTooltip?: Component;
      /**
       * Controls the visibility of gradient.
       * @default true
       */
      showGradient?: boolean;
    }
  >(),
  {
    curveType: CurveType.MonotoneX,
    filterOpacity: 0.2,
    margin: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
    showGradient: true,
    showGridLine: true,
    showLegend: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
  },
);

const emits = defineEmits<{
  legendItemClick: [d: BulletLegendItemInterface, i: number];
}>();

type KeyOfT = Extract<keyof T, string>;
type Data = (typeof props.data)[number];

const chartRef = useId();

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
      :margin="{ bottom: 10, left: 24, right: 12, top: 10 }"
      :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
    >
      <svg class="absolute" height="0" width="0">
        <defs>
          <linearGradient
            v-for="(color, i) in colors"
            :id="`${chartRef}-color-${i}`"
            :key="i"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <template v-if="showGradient">
              <stop offset="0%" :stop-color="color" stop-opacity="0.45" />
              <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
            </template>
            <template v-else>
              <stop offset="0%" :stop-color="color" />
            </template>
          </linearGradient>
        </defs>
      </svg>

      <ChartCrosshair
        v-if="showTooltip"
        :colors="colors"
        :custom-tooltip="customTooltip"
        :index="index"
        :items="legendItems"
      />

      <template v-for="(category, i) in categories" :key="category">
        <VisArea
          :attributes="{
            [Area.selectors.area]: {
              fill: showGradient ? `url(#${chartRef}-color-${i})` : colors[i],
            },
          }"
          :color="
            () => (showGradient ? `url(#${chartRef}-color-${i})` : colors[i])
          "
          :curve-type="curveType"
          :opacity="
            legendItems.find((item) => item.name === category)?.inactive
              ? filterOpacity
              : 1
          "
          :x="(_d: Data, i: number) => i"
          :y="(d: Data) => d[category]"
        />
      </template>

      <template v-for="(category, i) in categories" :key="category">
        <VisLine
          :attributes="{
            [Line.selectors.line]: {
              opacity: legendItems.find((item) => item.name === category)
                ?.inactive
                ? filterOpacity
                : 1,
            },
          }"
          :color="colors[i]"
          :curve-type="curveType"
          :line-width="2.5"
          :x="(_d: Data, i: number) => i"
          :y="(d: Data) => d[category]"
        />
      </template>

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
