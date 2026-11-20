<script setup lang="ts">
/* eslint-disable vue/one-component-per-file */
import type { BulletLegendItemInterface } from '@unovis/ts';

import type { Component } from 'vue';

import { createApp } from 'vue';

import { omit } from '@unovis/ts';
import { VisTooltip } from '@unovis/vue';

import ChartTooltip from './ChartTooltip.vue';

const props = defineProps<{
  customTooltip?: Component;
  index: string;
  items?: BulletLegendItemInterface[];
  selector: string;
  valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string;
}>();

// Use weakmap to store reference to each datapoint for Tooltip
const wm = new WeakMap();
function template(d: any, i: number, elements: (HTMLElement | SVGElement)[]) {
  const valueFormatter = props.valueFormatter ?? ((tick: number) => `${tick}`);
  if (props.index in d) {
    if (wm.has(d)) {
      return wm.get(d);
    } else {
      const componentDiv = document.createElement('div');
      const omittedData = Object.entries(omit(d, [props.index])).map(
        ([key, value]) => {
          const legendReference = props.items?.find(
            (item) => item.name === key,
          );
          return { ...legendReference, value: valueFormatter(value as number) };
        },
      );
      const TooltipComponent = props.customTooltip ?? ChartTooltip;
      createApp(TooltipComponent, {
        data: omittedData,
        title: d[props.index]?.toString() ?? '',
      }).mount(componentDiv);
      wm.set(d, componentDiv.innerHTML);
      return componentDiv.innerHTML;
    }
  } else {
    const data = d.data;

    if (wm.has(data)) {
      return wm.get(data);
    } else {
      const targetEl = elements[i];
      const style = targetEl ? getComputedStyle(targetEl) : null;
      const omittedData = [
        {
          color: style?.fill ?? 'transparent',
          name: data?.name ?? '',
          value: valueFormatter(data?.[props.index]),
        },
      ];
      const componentDiv = document.createElement('div');
      const TooltipComponent = props.customTooltip ?? ChartTooltip;
      createApp(TooltipComponent, {
        data: omittedData,
        title: d[props.index]?.toString() ?? '',
      }).mount(componentDiv);
      wm.set(d, componentDiv.innerHTML);
      return componentDiv.innerHTML;
    }
  }
}
</script>

<template>
  <VisTooltip
    :attributes="{
      style:
        'background-color: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important;',
    }"
    :horizontal-shift="20"
    :triggers="{
      [selector]: template,
    }"
    :vertical-shift="20"
  />
</template>
