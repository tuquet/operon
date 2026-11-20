<script lang="ts" setup>
import { computed } from 'vue';

import { Loader2 } from '@lucide/vue';

import { useAppUpdater } from '#/composables/use-app-updater';
import { $t } from '#/locales';

import TitlebarMenubar from './titlebar-menubar.vue';
import WindowControls from './window-controls.vue';

defineOptions({ name: 'DesktopTitlebar' });

const { installUpdate, isUpdating, updateAvailable } = useAppUpdater();

const buttonLabel = computed(() => {
  if (isUpdating.value) {
    return $t('page.app.restarting_update');
  }
  return $t('page.app.restart_to_update');
});

const updateTooltip = computed(() => {
  const version = updateAvailable.value?.version || '';
  return $t('page.app.update_available_title', { version });
});

async function handleRestart() {
  if (isUpdating.value) return;
  await installUpdate();
}
</script>

<template>
  <header
    class="flex h-9 w-full select-none items-center border-b border-border/60 bg-background/95 text-foreground backdrop-blur z-50 shrink-0"
    data-layout-region="window-titlebar"
    data-tauri-drag-region
  >
    <!-- Menubar navigation (interactive — no drag) -->
    <div class="no-drag flex items-center pl-1" @dblclick.stop>
      <TitlebarMenubar />
    </div>

    <!-- Center: Drag handle area -->
    <div class="flex-1" data-tauri-drag-region></div>

    <!-- Antigravity-style Restart to Update Pill Button -->
    <div
      v-if="updateAvailable"
      class="no-drag flex items-center mr-2 shrink-0 animate-in fade-in zoom-in-95 duration-200"
      @dblclick.stop
    >
      <button
        type="button"
        :disabled="isUpdating"
        :title="updateTooltip"
        class="inline-flex h-6 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary shadow-xs transition-all hover:border-primary/50 hover:bg-primary/20 hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
        @click="handleRestart"
      >
        <Loader2 v-if="isUpdating" class="size-3 animate-spin text-primary" />
        <span class="animate-pulse">{{ buttonLabel }}</span>
      </button>
    </div>

    <!-- Right: Window controls -->
    <WindowControls />
  </header>
</template>
