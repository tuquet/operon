<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed } from 'vue';

interface Props {
  /**
   * Whether to fix at the bottom
   */
  fixed?: boolean;
  height: number;
  /**
   * Whether to display
   * @default true
   */
  show?: boolean;
  width: string;
  zIndex: number;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
});

const style = computed((): CSSProperties => {
  const { fixed, height, show, width, zIndex } = props;
  return {
    height: `${height}px`,
    marginBottom: show ? '0' : `-${height}px`,
    position: fixed ? 'fixed' : 'static',
    right: fixed ? 0 : undefined,
    transform: show ? 'translateY(0)' : 'translateY(100%)',
    width,
    zIndex,
  };
});
</script>

<template>
  <footer
    :style="style"
    data-layout-region="footer"
    class="bottom-0 right-0 w-full shrink-0 bg-card/90 backdrop-blur-sm transition-all duration-200"
  >
    <slot></slot>
  </footer>
</template>
