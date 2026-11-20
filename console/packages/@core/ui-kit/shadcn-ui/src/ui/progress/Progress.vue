<script setup lang="ts">
import type { ProgressRootEmits, ProgressRootProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { computed } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { ProgressIndicator, ProgressRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<
  ProgressRootProps & { class?: HTMLAttributes['class'] }
>();

const emits = defineEmits<ProgressRootEmits>();

/** ProgressRoot fallback for invalid max (max must be positive). */
const DEFAULT_MAX = 100;

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);

/**
 * ProgressRoot falls back invalid max (0, negative, NaN, Infinity) to 100; normalized here
 * using the same rule for both root and indicator transform to avoid infinite percentage on max=0
 * and avoid empty fill from division by infinity on max=Infinity.
 */
const normalizedMax = computed(() => {
  const { max } = props;
  return typeof max === 'number' && Number.isFinite(max) && max > 0
    ? max
    : DEFAULT_MAX;
});
</script>

<template>
  <ProgressRoot
    v-slot="slotProps"
    data-slot="progress"
    v-bind="forwarded"
    :max="normalizedMax"
    :class="
      cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        props.class,
      )
    "
  >
    <ProgressIndicator
      data-slot="progress-indicator"
      :class="cn('bg-primary h-full w-full flex-1 transition-all')"
      :style="`transform: translateX(-${100 - ((slotProps.modelValue || 0) / normalizedMax) * 100}%)`"
    />
  </ProgressRoot>
</template>
