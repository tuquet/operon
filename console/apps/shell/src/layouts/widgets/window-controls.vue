<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Button } from '@operon-core/shadcn-ui';

import { Copy, Minus, Square, X } from '@lucide/vue';
import { useEventListener } from '@vueuse/core';

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

async function refreshMaximized() {
  if (isDesktop.value) {
    isMaximized.value = await isWindowMaximized();
  }
}

onMounted(refreshMaximized);
useEventListener(window, 'resize', refreshMaximized);
</script>

<template>
  <div
    v-if="isDesktop"
    class="flex items-center gap-1 shrink-0 ml-1 mr-2 no-drag"
    @dblclick.stop
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-7 text-muted-foreground"
      :title="$t('common.windowMinimize')"
      :aria-label="$t('common.windowMinimize')"
      @click="handleMinimize"
    >
      <Minus class="size-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="size-7 text-muted-foreground"
      :title="
        isMaximized ? $t('common.windowRestore') : $t('common.windowMaximize')
      "
      :aria-label="
        isMaximized ? $t('common.windowRestore') : $t('common.windowMaximize')
      "
      @click="handleToggleMaximize"
    >
      <Copy v-if="isMaximized" class="size-3 -rotate-90" />
      <Square v-else class="size-3" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive dark:hover:text-destructive-foreground"
      :title="$t('common.windowClose')"
      :aria-label="$t('common.windowClose')"
      @click="handleClose"
    >
      <X class="size-3.5" />
    </Button>
  </div>
</template>
