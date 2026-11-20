<script setup lang="ts">
import { inject } from 'vue';

import { useScrollLock } from '@operon-core/composables';
import { cn } from '@operon-core/shared/utils';

const props = withDefaults(
  defineProps<{
    class?: any;
    overlayBlur?: number;
    position?: 'absolute' | 'fixed';
    zIndex?: number;
  }>(),
  {
    position: 'fixed',
  },
);

useScrollLock();
const dismissableModalId = inject('DISMISSABLE_MODAL_ID', undefined);
</script>

<template>
  <div
    :data-dismissable-modal="dismissableModalId"
    :style="{
      ...(zIndex ? { zIndex } : { zIndex: 1040 }),
      position,
      backdropFilter:
        overlayBlur && overlayBlur > 0 ? `blur(${overlayBlur}px)` : 'none',
    }"
    :class="cn('z-popup bg-overlay inset-0 fixed', props.class)"
  ></div>
</template>
