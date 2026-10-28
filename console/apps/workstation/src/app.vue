<script lang="ts" setup>
import { onMounted } from 'vue';

import { usePreferences } from '@operon/preferences';

import { Toaster } from '@operon-core/shadcn-ui';

import {
  initDesktopAuthHandling,
  isTauriEnvironment,
  revealWindow,
} from '#/adapter/desktop';

defineOptions({ name: 'App' });

const { isDark } = usePreferences();

onMounted(async () => {
  if (isTauriEnvironment()) {
    await revealWindow();
    await initDesktopAuthHandling();
  }
});
</script>

<template>
  <RouterView />
  <Toaster
    position="top-right"
    :theme="isDark ? 'dark' : 'light'"
    rich-colors
  />
</template>
