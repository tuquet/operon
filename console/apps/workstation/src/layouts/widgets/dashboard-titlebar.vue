<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { ChevronRight, Copy, Minus, Square, X } from '@lucide/vue';

import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  toggleMaximizeWindow,
} from '#/adapter/desktop';
import { $t } from '#/locales';

defineOptions({ name: 'DashboardTitlebar' });

const route = useRoute();
const isMaximized = ref(false);
let checkInterval: null | ReturnType<typeof setInterval> = null;

const currentTitle = computed(() => {
  const titleKey = route.meta?.title as string | undefined;
  if (!titleKey) return '';
  // Translate if it is an i18n key, else return as-is
  return titleKey.includes('.') ? $t(titleKey) : titleKey;
});

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
  isMaximized.value = await isWindowMaximized();
});

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});
</script>

<template>
  <header
    class="flex h-9 w-full select-none items-center justify-between border-b border-border/60 bg-background/95 px-3 text-foreground backdrop-blur z-50 shrink-0"
    data-tauri-drag-region
    @dblclick="handleToggleMaximize"
  >
    <!-- Left: Dashboard Branding & Dynamic Route Breadcrumb -->
    <div
      class="flex items-center space-x-2 pointer-events-none"
      data-tauri-drag-region
    >
      <svg
        class="size-4 shrink-0"
        viewBox="0 0 400 402"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        data-tauri-drag-region
      >
        <path
          d="M200 0C101.217 0 44.1739 76.5217 44.1739 173.913C44.1739 243.478 41.3913 322.783 44.1739 367.304C45.5652 388.174 74.7826 392.348 88.6957 375.652C110.957 347.826 136 347.826 158.261 375.652C172.174 392.348 200 392.348 213.913 375.652C236.174 347.826 261.217 347.826 283.478 375.652C300.174 395.13 330.783 388.174 332.174 367.304C334.957 322.783 355.826 243.478 355.826 173.913C355.826 76.5217 298.783 0 200 0Z"
          fill="currentColor"
          class="text-foreground"
        />
        <circle cx="150" cy="174" r="16" fill="#09090B" />
        <circle cx="250" cy="174" r="16" fill="#09090B" />
        <circle cx="154" cy="164" r="6" fill="#FFFFFF" />
        <circle cx="254" cy="164" r="6" fill="#FFFFFF" />
      </svg>
      <span
        class="font-semibold tracking-tight text-foreground"
        data-tauri-drag-region
      >
        Admin
      </span>

      <template v-if="currentTitle">
        <ChevronRight class="size-3 text-muted-foreground/60 shrink-0" />
        <span
          class="text-muted-foreground truncate max-w-[240px]"
          data-tauri-drag-region
        >
          {{ currentTitle }}
        </span>
      </template>
    </div>

    <!-- Center: Large drag region -->
    <div class="flex-1 h-full mx-4" data-tauri-drag-region></div>

    <!-- Right: Shadcn Slate Window control buttons -->
    <div class="flex items-center space-x-1 shrink-0">
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
  </header>
</template>
