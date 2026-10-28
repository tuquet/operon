<script setup lang="ts">
import type { Component } from 'vue';

import type { LanguageOption } from '@operon/constants';
import type { SupportedLanguagesType } from '@operon/locales';
import type { AnyFunction } from '@operon/types';

import type { ClassType } from '@operon-core/typings';

import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { onSupportLanguagesChange } from '@operon/constants';
import { useHoverToggle, useRefresh } from '@operon/hooks';
import {
  Globe,
  Languages,
  LockKeyhole,
  LogOut,
  RotateCw,
  Search,
  Settings,
} from '@operon/icons';
import { $t, loadLocaleMessages } from '@operon/locales';
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@operon/preferences';
import { useAccessStore } from '@operon/stores';
import { isWindowsOs } from '@operon/utils';

import { useVbenModal } from '@operon-core/popup-ui';
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  VbenAvatar,
  VbenFullScreen,
  VbenIcon,
  VbenIconButton,
} from '@operon-core/shadcn-ui';

import { useFullscreen, useMagicKeys, whenever } from '@vueuse/core';

import { GlobalSearch } from '../global-search';
import { LockScreenModal } from '../lock-screen';
import { Notification } from '../notification';
import { Preferences } from '../preferences';
import { ThemeToggle } from '../theme-toggle';
import { TimezoneButton } from '../timezone';

interface Props {
  /**
   * Avatar
   */
  avatar?: string;
  /**
   * Whether avatar displays online status indicator
   * @default true
   */
  avatarDot?: boolean;
  /**
   * Avatar online status indicator class/style
   */
  avatarDotClass?: ClassType;
  /**
   * Description
   */
  description?: string;
  /**
   * Menu items array
   */
  menus?: Array<{
    handler: AnyFunction;
    icon?: Component | Function | string;
    text: string;
  }>;

  /**
   * Tag text
   */
  tagText?: string;
  /**
   * Text label
   */
  text?: string;
  /** Trigger method */
  trigger?: 'both' | 'click' | 'hover';
  /** Hover delay duration */
  hoverDelay?: number;
}

defineOptions({
  name: 'UserDropdown',
});

const props = withDefaults(defineProps<Props>(), {
  avatar: '',
  avatarDot: true,
  avatarDotClass: 'bottom-0 right-0 border-2 size-2.5 bg-success',
  description: '',
  menus: () => [],
  tagText: '',
  text: '',
  trigger: 'click',
  hoverDelay: 500,
});

const emit = defineEmits<{ clearPreferencesAndLogout: []; logout: [] }>();

const {
  globalLogoutShortcutKey,
  globalLockScreenShortcutKey,
  globalSearchShortcutKey,
  isDark,
  preferencesButtonPosition,
  isMobile,
} = usePreferences();
const { refresh } = useRefresh();
const { toggle: toggleFullscreen } = useFullscreen();
const accessStore = useAccessStore();
const [LockModal, lockModalApi] = useVbenModal({
  connectedComponent: LockScreenModal,
});
const [LogoutModal, logoutModalApi] = useVbenModal({
  onConfirm() {
    handleSubmitLogout();
  },
  openAutoFocus: true,
});

const refTrigger = useTemplateRef('refTrigger');
const refContent = useTemplateRef('refContent');
const refPreferences = useTemplateRef('refPreferences');
const refGlobalSearch = useTemplateRef('refGlobalSearch');
const refTimezone = useTemplateRef('refTimezone');
const refNotification = useTemplateRef('refNotification');

const [openPopover, hoverWatcher] = useHoverToggle(
  [refTrigger, refContent],
  () => props.hoverDelay,
);

watch(
  () => props.trigger === 'hover' || props.trigger === 'both',
  (val) => {
    if (val) {
      hoverWatcher.enable();
    } else {
      hoverWatcher.disable();
    }
  },
  {
    immediate: true,
  },
);

const showLockInDropdown = computed(
  () =>
    preferences.widget.lockScreen &&
    (preferences.widget.lockScreenButtonPosition === 'user-dropdown' ||
      isMobile.value),
);

const showLogoutInDropdown = computed(
  () =>
    preferences.widget.logoutButtonPosition === 'user-dropdown' ||
    isMobile.value,
);

const showGlobalSearchInDropdown = computed(
  () =>
    preferences.widget.globalSearch &&
    preferences.widget.globalSearchButtonPosition === 'user-dropdown',
);

const showThemeToggleInDropdown = computed(
  () =>
    preferences.widget.themeToggle &&
    (preferences.widget.themeToggleButtonPosition === 'user-dropdown' ||
      isMobile.value),
);

const showLanguageToggleInDropdown = computed(
  () =>
    preferences.widget.languageToggle &&
    (preferences.widget.languageToggleButtonPosition === 'user-dropdown' ||
      isMobile.value),
);

const showTimezoneInDropdown = computed(
  () =>
    preferences.widget.timezone &&
    (preferences.widget.timezoneButtonPosition === 'user-dropdown' ||
      isMobile.value),
);

const showFullscreenInDropdown = computed(
  () =>
    preferences.widget.fullscreen &&
    preferences.widget.fullscreenButtonPosition === 'user-dropdown',
);

const showNotificationInDropdown = computed(
  () =>
    preferences.widget.notification &&
    preferences.widget.notificationButtonPosition === 'user-dropdown',
);

const showRefreshInDropdown = computed(
  () =>
    preferences.widget.refresh &&
    preferences.widget.refreshButtonPosition === 'user-dropdown',
);

const showPreferencesInDropdown = computed(() => {
  return (
    preferences.app.enablePreferences &&
    (preferencesButtonPosition.value.userDropdown || isMobile.value)
  );
});

const hasUtilityInDropdown = computed(
  () =>
    showGlobalSearchInDropdown.value ||
    showThemeToggleInDropdown.value ||
    showLanguageToggleInDropdown.value ||
    showTimezoneInDropdown.value ||
    showFullscreenInDropdown.value ||
    showNotificationInDropdown.value ||
    showRefreshInDropdown.value ||
    showPreferencesInDropdown.value,
);

const altView = computed(() => (isWindowsOs() ? 'Alt' : '⌥'));

const enableLogoutShortcutKey = computed(() => {
  return showLogoutInDropdown.value && globalLogoutShortcutKey.value;
});

const enableLockScreenShortcutKey = computed(() => {
  return showLockInDropdown.value && globalLockScreenShortcutKey.value;
});

function handleOpenLock() {
  lockModalApi.open();
}

function handleSubmitLock(lockScreenPassword: string) {
  lockModalApi.close();
  accessStore.lockScreen(lockScreenPassword);
}

function handleLogout() {
  logoutModalApi.open();
  openPopover.value = false;
}

function handleSubmitLogout() {
  emit('logout');
  logoutModalApi.close();
}

// Settings - open preferences drawer
function handleOpenSettings() {
  openPopover.value = false;
  refPreferences.value?.open();
}

// Refresh current page
function handleRefresh() {
  openPopover.value = false;
  refresh();
}

// Search - trigger GlobalSearch modal without closing dropdown
function handleGlobalSearch() {
  refGlobalSearch.value?.open();
}

// Theme toggle
function handleThemeToggleSelect(event?: Event) {
  event?.preventDefault();
  updatePreferences({ theme: { mode: isDark.value ? 'light' : 'dark' } });
}

// Timezone
function handleTimezoneSelect() {
  refTimezone.value?.open();
}

// Fullscreen toggle
function handleFullscreenSelect() {
  toggleFullscreen();
}

// Notifications
function handleNotificationSelect(event?: Event) {
  event?.preventDefault();
  refNotification.value?.toggle();
}

// Locale switch - prevent Radix from closing outer dropdown, toggle inline
const showLanguageList = ref(false);
const languageList = ref<LanguageOption[]>([]);
const unsubLang = onSupportLanguagesChange((langs) => {
  languageList.value = [...langs];
});
onUnmounted(unsubLang);
function handleLanguageToggleSelect(event?: Event) {
  event?.preventDefault();
  showLanguageList.value = !showLanguageList.value;
}
async function handleLocaleChange(event: Event, value: string) {
  // Prevent default close so user sees selection; collapse manually
  event.preventDefault();
  // Runtime assertion for custom language support
  const locale = value as SupportedLanguagesType;
  updatePreferences({ app: { locale } });
  await loadLocaleMessages(locale);
  showLanguageList.value = false;
  openPopover.value = false;
}

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
const logoutKey = keys['Alt+KeyQ'];
const lockKey = keys['Alt+KeyL'];

if (logoutKey) {
  whenever(logoutKey, () => {
    if (enableLogoutShortcutKey.value) {
      handleLogout();
    }
  });
}

if (lockKey) {
  whenever(lockKey, () => {
    if (enableLockScreenShortcutKey.value) {
      handleOpenLock();
    }
  });
}
</script>

<template>
  <LockModal
    v-if="showLockInDropdown"
    :avatar="avatar"
    :text="text"
    @submit="handleSubmitLock"
  />

  <LogoutModal
    v-if="showLogoutInDropdown"
    :cancel-text="$t('common.cancel')"
    :confirm-text="$t('common.confirm')"
    :fullscreen-button="false"
    :title="$t('common.prompt')"
    centered
    content-class="px-8 min-h-10"
    footer-class="border-none mb-3 mr-3"
    header-class="border-none"
  >
    {{ $t('ui.widgets.logoutTip') }}
  </LogoutModal>

  <Preferences
    v-if="showPreferencesInDropdown"
    ref="refPreferences"
    :show-button="false"
    @clear-preferences-and-logout="emit('clearPreferencesAndLogout')"
  />

  <GlobalSearch
    v-if="showGlobalSearchInDropdown"
    ref="refGlobalSearch"
    :enable-shortcut-key="globalSearchShortcutKey"
    :menus="accessStore.accessMenus"
    :show-button="false"
  />

  <TimezoneButton
    v-if="showTimezoneInDropdown"
    ref="refTimezone"
    :show-button="false"
  />

  <DropdownMenu v-model:open="openPopover" :modal="false">
    <DropdownMenuTrigger ref="refTrigger" :disabled="props.trigger === 'hover'">
      <div class="mr-2 ml-1 cursor-pointer rounded-full p-1.5 hover:bg-accent">
        <div class="flex-center hover:text-accent-foreground">
          <VbenAvatar
            :alt="text"
            :src="avatar"
            class="size-8"
            :dot="avatarDot"
            :dot-class="avatarDotClass"
          />
        </div>
      </div>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="mr-2 min-w-60 max-h-[85vh] overflow-y-auto p-0 pb-1"
    >
      <div ref="refContent">
        <DropdownMenuLabel class="flex items-center p-3">
          <VbenAvatar
            :alt="text"
            :src="avatar"
            class="size-12"
            :dot="avatarDot"
            :dot-class="avatarDotClass"
          />
          <div class="ml-2 w-full">
            <div
              v-if="tagText || text || $slots.tagText"
              class="mb-1 flex items-center text-foreground"
            >
              {{ text }}
              <slot name="tagText">
                <Badge
                  v-if="tagText"
                  variant="secondary"
                  class="ml-2 text-success"
                >
                  {{ tagText }}
                </Badge>
              </slot>
            </div>
            <div class="text-muted-foreground">
              {{ description }}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator v-if="menus?.length" />
        <DropdownMenuItem
          v-for="menu in menus"
          :key="menu.text"
          class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
          @click="menu.handler"
        >
          <VbenIconButton class="mr-2" @click="menu.handler">
            <VbenIcon :icon="menu.icon" class="size-4" />
          </VbenIconButton>
          {{ menu.text }}
        </DropdownMenuItem>

        <template v-if="hasUtilityInDropdown">
          <DropdownMenuSeparator v-if="menus?.length" />
          <DropdownMenuItem
            v-if="showGlobalSearchInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleGlobalSearch"
          >
            <VbenIconButton class="mr-2" @click="handleGlobalSearch">
              <Search class="size-4" />
            </VbenIconButton>
            {{ $t('preferences.widget.globalSearch') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showThemeToggleInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleThemeToggleSelect"
          >
            <ThemeToggle class="mr-2" />
            {{ $t('preferences.theme.title') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showLanguageToggleInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleLanguageToggleSelect"
          >
            <VbenIconButton class="mr-2" @click="handleLanguageToggleSelect">
              <Languages class="size-4" />
            </VbenIconButton>
            {{ $t('preferences.widget.languageToggle') }}
          </DropdownMenuItem>
          <template v-if="showLanguageList">
            <DropdownMenuItem
              v-for="lang in languageList"
              :key="lang.value"
              class="mx-1 flex cursor-pointer items-center rounded-sm py-1 pl-8 leading-8"
              @select="(e: Event) => handleLocaleChange(e, lang.value)"
            >
              <span
                :class="
                  lang.value === preferences.app.locale ? 'bg-foreground' : ''
                "
                class="mr-2 size-1.5 rounded-full"
              ></span>
              {{ lang.label }}
            </DropdownMenuItem>
          </template>
          <DropdownMenuItem
            v-if="showTimezoneInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleTimezoneSelect"
          >
            <VbenIconButton class="mr-2" @click="handleTimezoneSelect">
              <Globe class="size-4" />
            </VbenIconButton>
            {{ $t('ui.widgets.timezone.setTimezone') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showFullscreenInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleFullscreenSelect"
          >
            <VbenFullScreen class="mr-2" @click.stop />
            {{ $t('preferences.widget.fullscreen') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showNotificationInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @select="handleNotificationSelect"
          >
            <Notification ref="refNotification" class="mr-2" />
            {{ $t('preferences.widget.notification') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showRefreshInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @click="handleRefresh"
          >
            <VbenIconButton class="mr-2" @click="handleRefresh">
              <RotateCw class="size-4" />
            </VbenIconButton>
            {{ $t('preferences.widget.refresh') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showPreferencesInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @click="handleOpenSettings"
          >
            <VbenIconButton class="mr-2" @click="handleOpenSettings">
              <Settings class="size-4" />
            </VbenIconButton>
            {{ $t('preferences.title') }}
          </DropdownMenuItem>
        </template>

        <template v-if="showLockInDropdown || showLogoutInDropdown">
          <DropdownMenuSeparator v-if="menus?.length || hasUtilityInDropdown" />
          <DropdownMenuItem
            v-if="showLockInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @click="handleOpenLock"
          >
            <VbenIconButton class="mr-2" @click="handleOpenLock">
              <LockKeyhole class="size-4" />
            </VbenIconButton>
            {{ $t('ui.widgets.lockScreen.title') }}
            <DropdownMenuShortcut v-if="enableLockScreenShortcutKey">
              {{ altView }} L
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="showLogoutInDropdown"
            class="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            @click="handleLogout"
          >
            <VbenIconButton class="mr-2" @click="handleLogout">
              <LogOut class="size-4" />
            </VbenIconButton>
            {{ $t('common.logout') }}
            <DropdownMenuShortcut v-if="enableLogoutShortcutKey">
              {{ altView }} Q
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </template>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
