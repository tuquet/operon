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
   * Whether logo is displayed
   */
  logoVisible?: boolean;
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

const props = withDefaults(defineProps<Props>(), {
  logoVisible: true,
});

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

const logoStyle = computed((): CSSProperties => {
  if (!props.logoVisible) {
    return {
      minWidth: '12px',
    };
  }

  return {
    minWidth: `${props.isMobile ? 40 : props.sidebarWidth}px`,
  };
});
</script>

<template>
  <header
    :class="theme"
    :style="style"
    class="top-0 flex w-full flex-[0_0_auto] items-center border-b border-border bg-header pl-2 transition-[margin-top] duration-200"
  >
    <div
      v-if="slots['toggle-button']"
      :class="
        isMobile
          ? 'order-first mr-1 flex h-full items-center'
          : 'order-2 flex h-full items-center'
      "
    >
      <slot name="toggle-button"> </slot>
    </div>

    <div
      v-if="slots.logo || (!logoVisible && !isMobile)"
      :style="logoStyle"
      :class="isMobile ? 'order-2 hidden md:block' : 'order-1'"
    >
      <slot name="logo"></slot>
    </div>

    <div
      class="order-3 flex min-w-0 flex-1 items-center h-full"
      data-tauri-drag-region
    >
      <slot></slot>
    </div>
  </header>
</template>
