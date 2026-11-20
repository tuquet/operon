<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useSlots } from 'vue';

import { useRefresh } from '@operon/hooks';
import { preferences, usePreferences } from '@operon/preferences';
import { useAccessStore } from '@operon/stores';

import { useFullscreen, useMagicKeys, whenever } from '@vueuse/core';

import { LockScreenModal } from '../../widgets';
import LogoutConfirmation from '../../widgets/logout-confirmation.vue';
import {
  buildOrderedZoneSlots,
  buildWidgetConfigMap,
  openGlobalSearchCommand,
  toggleSidebarHidden,
} from '../widget-zones';
import HeaderWidget from './header-widget.vue';

interface Props {
  /**
   * Avatar
   */
  avatar?: string;
  /**
   * Whether the desktop sidebar is currently visible
   */
  sidebarRendered?: boolean;
  /**
   * Logo theme
   */
  theme?: string;
  /**
   * User text
   */
  text?: string;
}

defineOptions({
  name: 'LayoutHeader',
});

const props = withDefaults(defineProps<Props>(), {
  avatar: '',
  sidebarRendered: true,
  theme: 'light',
  text: '',
});

const emit = defineEmits<{
  clearPreferencesAndLogout: [];
  logout: [];
  openLockScreen: [];
}>();

const REFERENCE_VALUE = 100;

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
const accessStore = useAccessStore();
const {
  globalLockScreenShortcutKey,
  globalLogoutShortcutKey,
  globalSearchShortcutKey,
  isMobile,
  preferencesButtonPosition,
} = usePreferences();
const slots = useSlots();
const { refresh } = useRefresh();

function isHeaderPosition(pos?: string): boolean {
  return pos === 'header' || pos === 'header-left' || pos === 'header-right';
}

const showLockInHeader = computed(
  () =>
    preferences.widget.lockScreen &&
    isHeaderPosition(preferences.widget.lockScreenButtonPosition),
);

const showLogoutInHeader = computed(() =>
  isHeaderPosition(preferences.widget.logoutButtonPosition),
);

const enableLockScreenShortcutKey = computed(() => {
  return showLockInHeader.value && globalLockScreenShortcutKey.value;
});

const enableLogoutShortcutKey = computed(() => {
  return showLogoutInHeader.value && globalLogoutShortcutKey.value;
});

const lockOpen = ref(false);
const logoutOpen = ref(false);

function handleOpenLock() {
  lockOpen.value = true;
}

function handleSubmitLock(lockScreenPassword: string) {
  lockOpen.value = false;
  accessStore.lockScreen(lockScreenPassword);
}

function handleLogout() {
  logoutOpen.value = true;
}

function handleSubmitLogout() {
  emit('logout');
  logoutOpen.value = false;
}

// Keyboard shortcuts
const keys = useMagicKeys({
  onEventFired(e) {
    if (e.type !== 'keydown' || !e.altKey) return;
    if (
      (e.code === 'KeyQ' && enableLogoutShortcutKey.value) ||
      (e.code === 'KeyL' && enableLockScreenShortcutKey.value)
    ) {
      e.preventDefault();
    }
  },
});
const lockKey = keys['Alt+KeyL'];
const logoutKey = keys['Alt+KeyQ'];

if (lockKey) {
  whenever(lockKey, () => {
    if (enableLockScreenShortcutKey.value) {
      handleOpenLock();
    }
  });
}

if (logoutKey) {
  whenever(logoutKey, () => {
    if (enableLogoutShortcutKey.value) {
      handleLogout();
    }
  });
}

type SlotItem = { index: number; name: string };

const widgetConfigMap = computed(() =>
  buildWidgetConfigMap({
    fallbackSidebarHeaderToLeft: false,
    isMobile: isMobile.value,
    showPreferencesInHeader: preferencesButtonPosition.value.header,
  }),
);

function buildZoneSlots(targetZone: 'left' | 'right'): SlotItem[] {
  const prefix = targetZone === 'left' ? 'header-left' : 'header-right';
  const list: SlotItem[] = buildOrderedZoneSlots(
    preferences.widget.order,
    widgetConfigMap.value,
    targetZone,
  ).map((name, idx) => ({
    index: REFERENCE_VALUE + idx,
    name,
  }));

  Object.keys(slots).forEach((key) => {
    if (key.startsWith(prefix)) {
      const slotIndex = Number(key.split('-')[2]);
      const index = Number.isNaN(slotIndex) ? nextIndex(list) : slotIndex;
      list.push({ index, name: key });
    }
  });

  return list.toSorted((a, b) => a.index - b.index);
}

const leftSlots = computed(() => buildZoneSlots('left'));
const rightSlots = computed(() => buildZoneSlots('right'));

function nextIndex(list: Array<SlotItem>) {
  const index =
    list.length > 0 ? Math.max(...list.map((item) => item.index)) : 0;
  return index + 1;
}

onMounted(() => {
  const handleOpenLockModal = () => {
    if (showLockInHeader.value) {
      lockOpen.value = true;
    }
  };
  window.addEventListener('open-lock-screen-modal', handleOpenLockModal);
  onUnmounted(() => {
    window.removeEventListener('open-lock-screen-modal', handleOpenLockModal);
  });
});
</script>

<template>
  <LockScreenModal
    v-model:open="lockOpen"
    v-if="showLockInHeader || lockOpen"
    :avatar="avatar"
    :text="text"
    @submit="handleSubmitLock"
  />

  <LogoutConfirmation
    v-if="showLogoutInHeader"
    v-model:open="logoutOpen"
    @confirm="handleSubmitLogout"
  />

  <div class="flex h-full min-w-0 shrink-0 items-center gap-3">
    <template v-for="slot in leftSlots" :key="slot.name">
      <div
        v-if="slot.name === 'breadcrumb'"
        class="hidden h-full items-center lg:flex"
      >
        <slot name="breadcrumb"></slot>
      </div>
      <slot v-else :name="slot.name">
        <HeaderWidget
          :name="slot.name"
          :is-fullscreen="isFullscreen"
          :global-search-shortcut-key="globalSearchShortcutKey"
          @open-global-search="openGlobalSearchCommand"
          @toggle-fullscreen="toggleFullscreen"
          @open-lock="handleOpenLock"
          @logout="handleLogout"
          @refresh="refresh"
          @toggle-sidebar="toggleSidebarHidden"
        />
      </slot>
    </template>
  </div>

  <div
    :class="`menu-align-${preferences.header.menuAlign}`"
    class="flex h-full min-w-0 flex-1 items-center"
  >
    <slot name="menu"></slot>
  </div>
  <div class="flex-1 h-full min-w-8"></div>
  <div class="flex h-full min-w-0 shrink-0 items-center gap-1">
    <template v-for="slot in rightSlots" :key="slot.name">
      <div
        v-if="slot.name === 'breadcrumb'"
        class="hidden h-full items-center lg:flex"
      >
        <slot name="breadcrumb"></slot>
      </div>
      <slot v-else :name="slot.name">
        <HeaderWidget
          :name="slot.name"
          :is-fullscreen="isFullscreen"
          :global-search-shortcut-key="globalSearchShortcutKey"
          @open-global-search="openGlobalSearchCommand"
          @toggle-fullscreen="toggleFullscreen"
          @open-lock="handleOpenLock"
          @logout="handleLogout"
          @refresh="refresh"
          @toggle-sidebar="toggleSidebarHidden"
        />
      </slot>
    </template>
  </div>
</template>
<style lang="scss" scoped>
.menu-align-start {
  --menu-align: start;
}

.menu-align-center {
  --menu-align: center;
}

.menu-align-end {
  --menu-align: end;
}
</style>
