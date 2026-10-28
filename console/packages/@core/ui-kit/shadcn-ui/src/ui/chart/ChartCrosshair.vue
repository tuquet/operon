<script setup lang="ts">
import type { BulletLegendItemInterface } from '@unovis/ts';

import type { Component } from 'vue';

import { computed, createApp } from 'vue';

import { omit } from '@unovis/ts';
import { VisCrosshair, VisTooltip } from '@unovis/vue';

import ChartTooltip from './ChartTooltip.vue';

const props = withDefaults(
  defineProps<{
    colors?: string[];
    customTooltip?: Component;
    index: string;
    items: BulletLegendItemInterface[];
    y?: ((d: any) => number) | Array<(d: any) => number>;
  }>(),
  {
    colors: () => [],
  },
);

// Fallback Y accessor for Unovis Crosshair to eliminate 'Y accessors have not been configured' warning
const computedY = computed(() => {
  if (props.y) return props.y;
  return props.items.map(
    (item) => (d: any) => (d && item.name in d ? (d[item.name] ?? 0) : 0),
  );
});

// Use weakmap to store reference to each datapoint for Tooltip
const wm = new WeakMap();
function template(d: any) {
  if (wm.has(d)) {
    return wm.get(d);
  } else {
    const componentDiv = document.createElement('div');
    const omittedData = Object.entries(omit(d, [props.index])).map(
      ([key, value]) => {
        const legendReference = props.items.find((i) => i.name === key);
        return { ...legendReference, value };
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
}

function color(_d: unknown, i: number) {
  return props.colors[i] ?? 'transparent';
}
</script>

<template>
  <VisTooltip
    :attributes="{
      style:
        'background-color: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important;',
    }"
    :horizontal-shift="20"
    :vertical-shift="20"
  />
  <VisCrosshair :color="color" :template="template" :y="computedY" />
</template>
