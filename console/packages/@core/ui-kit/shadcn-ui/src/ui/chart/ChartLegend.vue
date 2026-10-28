<script setup lang="ts">
import type { BulletLegendItemInterface } from '@unovis/ts';

import { nextTick, onMounted, ref } from 'vue';

import { BulletLegend } from '@unovis/ts';
import { VisBulletLegend } from '@unovis/vue';

import { buttonVariants } from '../button';

const props = withDefaults(
  defineProps<{ items?: BulletLegendItemInterface[] }>(),
  {
    items: () => [],
  },
);

const emits = defineEmits<{
  legendItemClick: [d: BulletLegendItemInterface, i: number];
  'update:items': [payload: BulletLegendItemInterface[]];
}>();

const elRef = ref<HTMLElement>();

function keepStyling() {
  const selector = `.${BulletLegend.selectors.item}`;
  nextTick(() => {
    const elements = elRef.value?.querySelectorAll(selector);
    const classes = buttonVariants({ size: 'sm', variant: 'ghost' }).split(' ');
    elements?.forEach((el) =>
      el.classList.add(...classes, '!inline-flex', '!mr-2'),
    );
  });
}

onMounted(() => {
  keepStyling();
});

function onLegendItemClick(d: BulletLegendItemInterface, i: number) {
  emits('legendItemClick', d, i);
  const isBulletActive = !props.items[i]?.inactive;
  const isFilterApplied = props.items.some((item) => item.inactive);
  if (isFilterApplied && isBulletActive) {
    // reset filter
    emits(
      'update:items',
      props.items.map((item) => ({ ...item, inactive: false })),
    );
  } else {
    // apply selection, set other item as inactive
    emits(
      'update:items',
      props.items.map((item) =>
        item.name === d.name
          ? { ...d, inactive: false }
          : { ...item, inactive: true },
      ),
    );
  }
  keepStyling();
}
</script>

<template>
  <div
    ref="elRef"
    class="w-max"
    :style="{
      '--vis-legend-bullet-size': '12px',
    }"
  >
    <VisBulletLegend :items="items" :on-legend-item-click="onLegendItemClick" />
  </div>
</template>
