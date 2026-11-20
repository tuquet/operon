<script setup lang="ts" generic="T extends Record<string, any>">
import type { Component } from 'vue';

import type { BaseChartProps, KeyOf } from '../chart';

import { computed, ref } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { Donut } from '@unovis/ts';
import { VisDonut, VisSingleContainer } from '@unovis/vue';
import { useMounted } from '@vueuse/core';

import { ChartSingleTooltip, defaultColors } from '../chart';

const props = withDefaults(
  defineProps<
    Pick<
      BaseChartProps<T>,
      | 'colors'
      | 'data'
      | 'filterOpacity'
      | 'index'
      | 'margin'
      | 'showLegend'
      | 'showTooltip'
    > & {
      /**
       * Sets the name of the key containing the quantitative chart values.
       */
      category: KeyOf<T>;
      /**
       * Render custom tooltip component.
       */
      customTooltip?: Component;
      /**
       * Function to sort the segment
       */
      sortFunction?: (a: any, b: any) => number | undefined;
      /**
       * Change the type of the chart
       * @default "donut"
       */
      type?: 'donut' | 'pie';
      /**
       * Controls the formatting for the label.
       */
      valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string;
    }
  >(),
  {
    filterOpacity: 0.2,
    margin: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
    showLegend: true,
    showTooltip: true,
    sortFunction: () => undefined,
    type: 'donut',
  },
);

type KeyOfT = Extract<keyof T, string>;
type Data = (typeof props.data)[number];

const valueFormatter = props.valueFormatter ?? ((tick: number) => `${tick}`);
const category = computed(() => props.category as KeyOfT);
const index = computed(() => props.index as KeyOfT);

const isMounted = useMounted();
const activeSegmentKey = ref<string>();
const colors = computed(() =>
  props.colors?.length
    ? props.colors
    : defaultColors(
        props.data.filter((d) => d[props.category]).filter(Boolean).length,
      ),
);
const legendItems = computed(() =>
  props.data.map((item, i) => ({
    color: colors.value[i],
    inactive: false,
    name: item[props.index],
  })),
);

const totalValue = computed(() =>
  props.data.reduce((prev, curr) => {
    return prev + (Number(curr[props.category]) || 0);
  }, 0),
);
</script>

<template>
  <div
    :class="
      cn(
        'flex h-48 w-full flex-col items-center justify-center',
        $attrs.class ?? '',
      )
    "
  >
    <VisSingleContainer
      :data="data"
      :margin="{ bottom: 10, left: 10, right: 10, top: 10 }"
      :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
    >
      <ChartSingleTooltip
        :custom-tooltip="customTooltip"
        :index="category"
        :items="legendItems"
        :selector="`.${Donut.selectors.segment}`"
        :value-formatter="valueFormatter"
      />

      <VisDonut
        :arc-width="type === 'donut' ? 24 : 0"
        :central-label="type === 'donut' ? valueFormatter(totalValue) : ''"
        :color="colors"
        :events="{
          [Donut.selectors.segment]: {
            click: (
              d: Data,
              _ev: PointerEvent,
              i: number,
              elements: HTMLElement[],
            ) => {
              if (d?.data?.[index] === activeSegmentKey) {
                activeSegmentKey = undefined;
                elements.forEach((el) => (el.style.opacity = '1'));
              } else {
                activeSegmentKey = d?.data?.[index];
                elements.forEach(
                  (el) => (el.style.opacity = `${filterOpacity}`),
                );
                if (elements[i]) {
                  elements[i].style.opacity = '1';
                }
              }
            },
          },
        }"
        :show-background="false"
        :sort-function="sortFunction"
        :value="(d: Data) => d[category]"
      />

      <slot></slot>
    </VisSingleContainer>
  </div>
</template>
