<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  LockKeyhole,
  LogOut,
  Maximize,
  Minimize,
  PanelLeft,
  PanelLeftOpen,
  RotateCw,
  Search,
} from '@operon/icons';
import { $t } from '@operon/locales';
import { preferences, usePreferences } from '@operon/preferences';
import { isWindowsOs } from '@operon/utils';

import { Button, VbenLogo } from '@operon-core/shadcn-ui';

import {
  LanguageToggle,
  Notification,
  PreferencesButton,
  ThemeToggle,
  TimezoneButton,
} from '../../widgets';

defineProps<{
  globalSearchShortcutKey?: boolean;
  isFullscreen: boolean;
  name: string;
}>();

defineEmits<{
  logout: [];
  openGlobalSearch: [];
  openLock: [];
  refresh: [];
  toggleFullscreen: [];
  toggleSidebar: [];
}>();

const router = useRouter();
const { isDark } = usePreferences();
const logoTheme = computed(() =>
  isDark.value || preferences.theme.semiDarkHeader ? 'dark' : 'light',
);
</script>

<template>
  <VbenLogo
    v-if="name === 'logo'"
    :src="preferences.logo.source"
    :src-dark="preferences.logo.sourceDark"
    :text="preferences.app.name"
    :theme="logoTheme"
    :logo-size="26"
    collapsed
    class="cursor-pointer"
    @click="router.push(preferences.app.defaultHomePath)"
  />

  <Button
    v-else-if="name === 'sidebar-toggle'"
    type="button"
    variant="ghost"
    size="icon"
    class="my-0 size-8 rounded-md"
    data-layout-action="toggle-sidebar"
    :title="$t('preferences.widget.sidebarToggle')"
    :aria-label="$t('preferences.widget.sidebarToggle')"
    :aria-pressed="!preferences.sidebar.hidden"
    @click="$emit('toggleSidebar')"
  >
    <PanelLeftOpen v-if="preferences.sidebar.hidden" class="size-5" />
    <PanelLeft v-else class="size-5" />
  </Button>

  <Button
    v-else-if="name === 'global-search'"
    type="button"
    variant="ghost"
    size="icon"
    :title="$t('ui.widgets.search.title')"
    :aria-label="$t('ui.widgets.search.title')"
    :aria-keyshortcuts="
      globalSearchShortcutKey
        ? isWindowsOs()
          ? 'Control+K'
          : 'Meta+K'
        : undefined
    "
    @click="$emit('openGlobalSearch')"
  >
    <Search />
  </Button>

  <PreferencesButton
    v-else-if="name === 'preferences'"
    class="hidden md:flex"
  />
  <ThemeToggle v-else-if="name === 'theme-toggle'" class="hidden md:flex" />
  <LanguageToggle
    v-else-if="name === 'language-toggle'"
    class="hidden md:flex"
  />

  <Button
    v-else-if="name === 'fullscreen'"
    type="button"
    variant="ghost"
    size="icon"
    class="hidden md:flex"
    :title="$t('preferences.widget.fullscreen')"
    :aria-label="$t('preferences.widget.fullscreen')"
    :aria-pressed="isFullscreen"
    @click="$emit('toggleFullscreen')"
  >
    <Minimize v-if="isFullscreen" />
    <Maximize v-else />
  </Button>

  <TimezoneButton v-else-if="name === 'timezone'" class="hidden md:flex" />

  <Button
    v-else-if="name === 'lock-screen-btn'"
    class="hidden md:flex"
    :aria-label="$t('ui.widgets.lockScreen.title')"
    :title="$t('ui.widgets.lockScreen.title')"
    variant="ghost"
    size="icon"
    @click="$emit('openLock')"
  >
    <LockKeyhole />
  </Button>

  <Button
    v-else-if="name === 'logout-btn'"
    class="hidden md:flex"
    :aria-label="$t('common.logout')"
    :title="$t('common.logout')"
    variant="ghost"
    size="icon"
    @click="$emit('logout')"
  >
    <LogOut />
  </Button>

  <Notification v-else-if="name === 'notification'" />

  <Button
    v-else-if="name === 'refresh'"
    class="my-0 rounded-md"
    :aria-label="$t('preferences.widget.refresh')"
    :title="$t('preferences.widget.refresh')"
    variant="ghost"
    size="icon"
    @click="$emit('refresh')"
  >
    <RotateCw />
  </Button>
</template>
