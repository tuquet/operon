<script setup lang="ts">
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

// Controlled via v-if; useScrollLock unlocks scroll automatically on unmount
useScrollLock();
</script>

<template>
  <div
    :style="{
      ...(zIndex ? { zIndex } : {}),
      position,
      backdropFilter:
        overlayBlur && overlayBlur > 0 ? `blur(${overlayBlur}px)` : 'none',
    }"
    :class="cn('z-popup bg-overlay inset-0 fixed', props.class)"
  ></div>
</template>
