<script setup lang="ts">
import type { Component } from 'vue';

import type { LanguageOption } from '@operon/constants';
import type { SupportedLanguagesType } from '@operon/locales';
import type { AnyFunction } from '@operon/types';

import type { ClassType } from '@operon-core/typings';

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue';

import { onSupportLanguagesChange } from '@operon/constants';
import { useHoverToggle, useRefresh } from '@operon/hooks';
import {
  Bell,
  Globe,
  Languages,
  LockKeyhole,
  LogOut,
  Maximize,
  Minimize,
  RotateCw,
  Search,
  Settings,
  SunMoon,
  User,
} from '@operon/icons';
import { $t, loadLocaleMessages } from '@operon/locales';
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@operon/preferences';
import { useAccessStore } from '@operon/stores';
import { isWindowsOs } from '@operon/utils';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  VbenIcon,
} from '@operon-core/shadcn-ui';

import { useFullscreen, useMagicKeys, whenever } from '@vueuse/core';

import { LockScreenModal } from '../lock-screen';
import LogoutConfirmation from '../logout-confirmation.vue';
import { Notification } from '../notification';
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
  /** Whether to show logout action */
  showLogout?: boolean;
  /**
   * Whether to show the user info label (name + description) in the dropdown header.
   * Set to false when user is not authenticated.
   * @default true
   */
  showLabel?: boolean;
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
  showLogout: true,
  showLabel: true,
});

const emit = defineEmits<{ clearPreferencesAndLogout: []; logout: [] }>();

const {
  globalLogoutShortcutKey,
  globalLockScreenShortcutKey,
  isDark,
  preferencesButtonPosition,
  isMobile,
} = usePreferences();
const { refresh } = useRefresh();
const { toggle: toggleFullscreen, isFullscreen } = useFullscreen();
const accessStore = useAccessStore();
const lockOpen = ref(false);
const logoutOpen = ref(false);

const refTrigger = useTemplateRef('refTrigger');
const refContent = useTemplateRef('refContent');
const refTimezone = useTemplateRef('refTimezone');

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
    props.showLogout &&
    (preferences.widget.logoutButtonPosition === 'user-dropdown' ||
      isMobile.value),
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
  lockOpen.value = true;
}

function handleSubmitLock(lockScreenPassword: string) {
  lockOpen.value = false;
  accessStore.lockScreen(lockScreenPassword);
}

function handleLogout() {
  logoutOpen.value = true;
  openPopover.value = false;
}

function handleSubmitLogout() {
  emit('logout');
  logoutOpen.value = false;
}

// Settings - open singleton preferences modal
function handleOpenSettings() {
  openPopover.value = false;
  window.dispatchEvent(new CustomEvent('open-preferences'));
}

// Refresh current page
function handleRefresh() {
  openPopover.value = false;
  refresh();
}

// Search - trigger singleton GlobalSearch modal
function handleGlobalSearch() {
  openPopover.value = false;
  window.dispatchEvent(
    new CustomEvent('open-command-palette', {
      detail: { mode: 'navigation', initialValue: '' },
    }),
  );
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

onMounted(() => {
  const handleOpenLockModal = () => {
    if (preferences.widget.lockScreenButtonPosition !== 'header') {
      handleOpenLock();
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
    v-if="showLockInDropdown || lockOpen"
    :avatar="avatar"
    :text="text"
    @submit="handleSubmitLock"
  />

  <LogoutConfirmation
    v-if="showLogoutInDropdown"
    v-model:open="logoutOpen"
    @confirm="handleSubmitLogout"
  />

  <TimezoneButton
    v-if="showTimezoneInDropdown"
    ref="refTimezone"
    :show-button="false"
  />

  <DropdownMenu v-model:open="openPopover" :modal="false">
    <DropdownMenuTrigger
      ref="refTrigger"
      as-child
      :disabled="props.trigger === 'hover'"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="text || $t('page.auth.profile')"
        class="relative"
      >
        <Avatar v-if="avatar" class="size-8">
          <AvatarImage :src="avatar" :alt="text" />
          <AvatarFallback>{{ text?.slice(0, 2) || '?' }}</AvatarFallback>
        </Avatar>
        <User v-else />
        <span
          v-if="avatar && avatarDot"
          :class="avatarDotClass"
          class="absolute rounded-full"
        ></span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="mr-2 min-w-60 max-h-[85vh] overflow-y-auto p-0 pb-1"
    >
      <DropdownMenuGroup as-child>
        <div ref="refContent">
          <DropdownMenuLabel v-if="showLabel" class="flex items-center p-3">
            <span v-if="avatar" class="relative inline-flex shrink-0">
              <Avatar class="size-12">
                <AvatarImage :src="avatar" :alt="text" />
                <AvatarFallback>{{ text?.slice(0, 2) || '?' }}</AvatarFallback>
              </Avatar>
              <span
                v-if="avatarDot"
                :class="avatarDotClass"
                class="absolute rounded-full"
              ></span>
            </span>
            <div
              v-else
              class="flex-center size-10 shrink-0 rounded-full bg-muted text-muted-foreground"
            >
              <User class="size-5" />
            </div>
            <div class="ml-2 w-full">
              <div
                v-if="tagText || text || $slots.tagText"
                class="mb-1 flex items-center text-foreground"
              >
                {{ text }}
                <slot name="tagText">
                  <Badge v-if="tagText" variant="secondary" class="ml-2">
                    {{ tagText }}
                  </Badge>
                </slot>
              </div>
              <div class="text-muted-foreground">
                {{ description }}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator v-if="showLabel && menus?.length" />
          <DropdownMenuItem
            v-for="menu in menus"
            :key="menu.text"
            @select="menu.handler"
          >
            <VbenIcon :icon="menu.icon" />
            {{ menu.text }}
          </DropdownMenuItem>

          <template v-if="hasUtilityInDropdown">
            <DropdownMenuSeparator v-if="showLabel && menus?.length" />
            <DropdownMenuItem
              v-if="showGlobalSearchInDropdown"
              @select="handleGlobalSearch"
            >
              <Search />
              {{ $t('preferences.widget.globalSearch') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="showThemeToggleInDropdown"
              @select="handleThemeToggleSelect"
            >
              <SunMoon />
              {{ $t('preferences.theme.title') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="showLanguageToggleInDropdown"
              @select="handleLanguageToggleSelect"
            >
              <Languages />
              {{ $t('preferences.widget.languageToggle') }}
            </DropdownMenuItem>
            <DropdownMenuRadioGroup
              v-if="showLanguageList"
              :model-value="preferences.app.locale"
            >
              <DropdownMenuRadioItem
                v-for="lang in languageList"
                :key="lang.value"
                :value="lang.value"
                @select="(e: Event) => handleLocaleChange(e, lang.value)"
              >
                {{ lang.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuItem
              v-if="showTimezoneInDropdown"
              @select="handleTimezoneSelect"
            >
              <Globe />
              {{ $t('ui.widgets.timezone.setTimezone') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="showFullscreenInDropdown"
              @select="handleFullscreenSelect"
            >
              <Minimize v-if="isFullscreen" />
              <Maximize v-else />
              {{ $t('preferences.widget.fullscreen') }}
            </DropdownMenuItem>
            <Notification v-if="showNotificationInDropdown" class="w-full">
              <template #trigger>
                <DropdownMenuItem @select.prevent>
                  <Bell />
                  {{ $t('preferences.widget.notification') }}
                </DropdownMenuItem>
              </template>
            </Notification>
            <DropdownMenuItem
              v-if="showRefreshInDropdown"
              @select="handleRefresh"
            >
              <RotateCw />
              {{ $t('preferences.widget.refresh') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="showPreferencesInDropdown"
              @select="handleOpenSettings"
            >
              <Settings />
              {{ $t('preferences.settingsTitle') }}
            </DropdownMenuItem>
          </template>

          <template v-if="showLockInDropdown || showLogoutInDropdown">
            <DropdownMenuSeparator
              v-if="menus?.length || hasUtilityInDropdown"
            />
            <DropdownMenuItem
              v-if="showLockInDropdown"
              @select="handleOpenLock"
            >
              <LockKeyhole />
              {{ $t('ui.widgets.lockScreen.title') }}
              <DropdownMenuShortcut v-if="enableLockScreenShortcutKey">
                {{ altView }} L
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="showLogoutInDropdown"
              @select="handleLogout"
            >
              <LogOut />
              {{ $t('common.logout') }}
              <DropdownMenuShortcut v-if="enableLogoutShortcutKey">
                {{ altView }} Q
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </template>
        </div>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
