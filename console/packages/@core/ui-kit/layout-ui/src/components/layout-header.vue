<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, useSlots } from 'vue';

interface Props {
  /**
   * Full screen width
   */
  fullWidth: boolean;
  /**
   * Header height
   */
  height: number;
  /**
   * Whether in mobile mode
   */
  isMobile: boolean;
  /**
   * Whether to display
   */
  show: boolean;
  /**
   * Sidebar menu width
   */
  sidebarWidth: number;
  /**
   * Theme
   */
  theme: string | undefined;
  /**
   * Header width
   */
  width: string;
  /**
   * zIndex
   */
  zIndex: number;
}

const props = defineProps<Props>();

const slots = useSlots();

const style = computed((): CSSProperties => {
  const { fullWidth, height, show } = props;
  const right = !show || !fullWidth ? undefined : 0;

  return {
    height: `${height}px`,
    marginTop: show ? 0 : `-${height}px`,
    right,
  };
});
</script>

<template>
  <header
    :class="theme"
    :style="style"
    class="top-0 flex w-full flex-[0_0_auto] items-center bg-header px-3 text-foreground transition-[margin-top] duration-200"
  >
    <div
      v-if="slots['toggle-button']"
      :class="
        isMobile ? 'mr-1 flex h-full items-center' : 'flex h-full items-center'
      "
    >
      <slot name="toggle-button"> </slot>
    </div>

    <div class="flex h-full min-w-0 flex-1 items-center gap-2">
      <slot></slot>
    </div>
  </header>
</template>
