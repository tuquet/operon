<script setup lang="ts">
import { useTemplateRef } from 'vue';

import { useElementSize } from '@vueuse/core';

import DesktopTitlebar from './desktop-titlebar.vue';

const viewport = useTemplateRef<HTMLElement>('viewport');
const { height } = useElementSize(viewport);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
    <DesktopTitlebar />
    <div
      ref="viewport"
      data-layout-region="desktop-viewport"
      class="desktop-viewport relative min-h-0 flex-1"
      :style="{ '--vben-viewport-height': `${height}px` }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.desktop-viewport {
  /* Give fixed headers, sidebars and footers a viewport below the titlebar. */
  contain: layout;
}
</style>
