<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Copy, Minus, Square, X } from '@lucide/vue';

import {
  closeWindow,
  isTauriEnvironment,
  isWindowMaximized,
  minimizeWindow,
  toggleMaximizeWindow,
} from '#/adapter/desktop';
import { $t } from '#/locales';

defineOptions({ name: 'WindowControls' });

const isDesktop = ref(isTauriEnvironment());
const isMaximized = ref(false);

async function handleMinimize() {
  await minimizeWindow();
}

async function handleToggleMaximize() {
  const state = await toggleMaximizeWindow();
  isMaximized.value = state;
}

async function handleClose() {
  await closeWindow();
}

onMounted(async () => {
  if (isDesktop.value) {
    isMaximized.value = await isWindowMaximized();
  }
});
</script>

<template>
  <div
    v-if="isDesktop"
    class="flex items-center space-x-1 shrink-0 ml-1 mr-2 no-drag"
  >
    <button
      type="button"
      class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none"
      :title="$t('common.windowMinimize')"
      @click="handleMinimize"
    >
      <Minus class="size-3.5" />
    </button>

    <button
      type="button"
      class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none"
      :title="
        isMaximized ? $t('common.windowRestore') : $t('common.windowMaximize')
      "
      @click="handleToggleMaximize"
    >
      <Copy v-if="isMaximized" class="size-3 -rotate-90" />
      <Square v-else class="size-3" />
    </button>

    <button
      type="button"
      class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus:outline-none"
      :title="$t('common.windowClose')"
      @click="handleClose"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>
