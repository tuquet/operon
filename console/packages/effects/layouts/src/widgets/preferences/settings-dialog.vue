<script setup lang="ts">
import type { SupportedLanguagesType } from '@operon/locales';
import type { CustomPreferencesRecord } from '@operon/preferences';
import type {
  BreadcrumbStyleType,
  BuiltinThemeType,
  ContentCompactType,
  LayoutHeaderMenuAlignType,
  LayoutHeaderModeType,
  LayoutType,
  NavigationStyleType,
  PreferencesButtonPositionType,
  ThemeModeType,
} from '@operon/types';

import type { SegmentedItem } from '@operon-core/shadcn-ui';

import { computed, ref } from 'vue';

import {
  Bell,
  Keyboard,
  LayoutTemplate,
  LogIn,
  LogOut,
  Palette,
  Settings,
} from '@operon/icons';
import { $t, loadLocaleMessages } from '@operon/locales';
import {
  clearCache,
  preferences,
  resetPreferences,
  updateCustomPreferences,
  usePreferences,
} from '@operon/preferences';
import { useAccessStore, useUserStore } from '@operon/stores';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  VbenAvatar,
} from '@operon-core/shadcn-ui';
import { globalShareState } from '@operon-core/shared/global-state';

import { useClipboard, useMediaQuery } from '@vueuse/core';

import {
  Animation,
  Block,
  Breadcrumb,
  BuiltinTheme,
  ColorMode,
  Content,
  Copyright,
  Custom,
  FontSize,
  Footer,
  General,
  GlobalShortcutKeys,
  Header,
  Layout,
  Navigation,
  Radius,
  Sidebar,
  Tabbar,
  Theme,
  Widget,
} from './blocks';
import PreferencesActions from './preferences-actions.vue';

const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

const message = globalShareState.getMessage();

const appLocale = defineModel<SupportedLanguagesType | undefined>('appLocale', {
  default: undefined,
});
const appTimezone = defineModel<string | undefined>('appTimezone', {
  default: undefined,
});
const appDynamicTitle = defineModel<boolean>('appDynamicTitle');
const appLayout = defineModel<LayoutType | undefined>('appLayout', {
  default: undefined,
});
const appColorGrayMode = defineModel<boolean>('appColorGrayMode');
const appColorWeakMode = defineModel<boolean>('appColorWeakMode');
const appContentCompact = defineModel<ContentCompactType | undefined>(
  'appContentCompact',
  {
    default: undefined,
  },
);
const appWatermark = defineModel<boolean>('appWatermark');
const appWatermarkContent = defineModel<string | undefined>(
  'appWatermarkContent',
  {
    default: undefined,
  },
);
const appEnableCheckUpdates = defineModel<boolean>('appEnableCheckUpdates');
const appEnableCopyPreferences = defineModel<boolean>(
  'appEnableCopyPreferences',
);
const appPreferencesButtonPosition = defineModel<
  PreferencesButtonPositionType | undefined
>('appPreferencesButtonPosition', { default: undefined });

const transitionProgress = defineModel<boolean>('transitionProgress');
const transitionName = defineModel<string | undefined>('transitionName', {
  default: undefined,
});
const transitionLoading = defineModel<boolean>('transitionLoading');
const transitionEnable = defineModel<boolean>('transitionEnable');

const themeColorPrimary = defineModel<string | undefined>('themeColorPrimary', {
  default: undefined,
});
const themeBuiltinType = defineModel<BuiltinThemeType | undefined>(
  'themeBuiltinType',
  {
    default: undefined,
  },
);
const themeMode = defineModel<ThemeModeType | undefined>('themeMode', {
  default: undefined,
});
const themeRadius = defineModel<string | undefined>('themeRadius', {
  default: undefined,
});
const themeFontSize = defineModel<number | undefined>('themeFontSize', {
  default: undefined,
});
const themeSemiDarkSidebar = defineModel<boolean>('themeSemiDarkSidebar');
const themeSemiDarkHeader = defineModel<boolean>('themeSemiDarkHeader');

const sidebarEnable = defineModel<boolean>('sidebarEnable');
const sidebarWidth = defineModel<number | undefined>('sidebarWidth', {
  default: undefined,
});
const sidebarDraggable = defineModel<boolean>('sidebarDraggable');
const sidebarCollapsed = defineModel<boolean>('sidebarCollapsed');
const sidebarCollapsedShowTitle = defineModel<boolean>(
  'sidebarCollapsedShowTitle',
);
const sidebarAutoActivateChild = defineModel<boolean>(
  'sidebarAutoActivateChild',
);
const sidebarExpandOnHover = defineModel<boolean>('sidebarExpandOnHover');
const widgetSidebarToggle = defineModel<boolean>('widgetSidebarToggle');
const headerEnable = defineModel<boolean>('headerEnable');
const headerMode = defineModel<LayoutHeaderModeType | undefined>('headerMode', {
  default: undefined,
});
const headerMenuAlign = defineModel<LayoutHeaderMenuAlignType | undefined>(
  'headerMenuAlign',
  { default: undefined },
);

const breadcrumbShowIcon = defineModel<boolean>('breadcrumbShowIcon');
const breadcrumbShowHome = defineModel<boolean>('breadcrumbShowHome');
const breadcrumbStyleType = defineModel<BreadcrumbStyleType | undefined>(
  'breadcrumbStyleType',
  { default: undefined },
);
const breadcrumbHideOnlyOne = defineModel<boolean>('breadcrumbHideOnlyOne');

const tabbarEnable = defineModel<boolean>('tabbarEnable');
const tabbarShowIcon = defineModel<boolean>('tabbarShowIcon');
const tabbarShowRefresh = defineModel<boolean>('tabbarShowRefresh');
const tabbarShowMore = defineModel<boolean>('tabbarShowMore');
const tabbarShowMaximize = defineModel<boolean>('tabbarShowMaximize');
const tabbarPersist = defineModel<boolean>('tabbarPersist');
const tabbarVisitHistory = defineModel<boolean>('tabbarVisitHistory');
const tabbarDraggable = defineModel<boolean>('tabbarDraggable');
const tabbarWheelable = defineModel<boolean>('tabbarWheelable');
const tabbarStyleType = defineModel<string | undefined>('tabbarStyleType', {
  default: undefined,
});
const tabbarMaxCount = defineModel<number | undefined>('tabbarMaxCount', {
  default: undefined,
});
const tabbarMiddleClickToClose = defineModel<boolean>(
  'tabbarMiddleClickToClose',
);

const navigationStyleType = defineModel<NavigationStyleType | undefined>(
  'navigationStyleType',
  { default: undefined },
);
const navigationSplit = defineModel<boolean>('navigationSplit');
const navigationAccordion = defineModel<boolean>('navigationAccordion');

const footerEnable = defineModel<boolean>('footerEnable');
const footerFixed = defineModel<boolean>('footerFixed');

const copyrightSettingShow = defineModel<boolean>('copyrightSettingShow');
const copyrightEnable = defineModel<boolean>('copyrightEnable');
const copyrightCompanyName = defineModel<string | undefined>(
  'copyrightCompanyName',
  {
    default: undefined,
  },
);
const copyrightCompanySiteLink = defineModel<string | undefined>(
  'copyrightCompanySiteLink',
  { default: undefined },
);
const copyrightDate = defineModel<string | undefined>('copyrightDate', {
  default: undefined,
});
const copyrightIcp = defineModel<string | undefined>('copyrightIcp', {
  default: undefined,
});
const copyrightIcpLink = defineModel<string | undefined>('copyrightIcpLink', {
  default: undefined,
});

const shortcutKeysEnable = defineModel<boolean>('shortcutKeysEnable');
const shortcutKeysGlobalSearch = defineModel<boolean>(
  'shortcutKeysGlobalSearch',
);
const shortcutKeysGlobalLogout = defineModel<boolean>(
  'shortcutKeysGlobalLogout',
);
const shortcutKeysGlobalEscape = defineModel<boolean>(
  'shortcutKeysGlobalEscape',
);
const shortcutKeysGlobalLockScreen = defineModel<boolean>(
  'shortcutKeysGlobalLockScreen',
);

const widgetLogoButtonPosition = defineModel<string | undefined>(
  'widgetLogoButtonPosition',
  { default: undefined },
);
const widgetSidebarToggleButtonPosition = defineModel<string | undefined>(
  'widgetSidebarToggleButtonPosition',
  { default: undefined },
);
const widgetBreadcrumbButtonPosition = defineModel<string | undefined>(
  'widgetBreadcrumbButtonPosition',
  { default: undefined },
);
const widgetUserDropdownButtonPosition = defineModel<string | undefined>(
  'widgetUserDropdownButtonPosition',
  { default: undefined },
);
const widgetTenantSelectorButtonPosition = defineModel<string | undefined>(
  'widgetTenantSelectorButtonPosition',
  { default: undefined },
);
const widgetGlobalSearchButtonPosition = defineModel<string | undefined>(
  'widgetGlobalSearchButtonPosition',
  { default: undefined },
);
const widgetFullscreenButtonPosition = defineModel<string | undefined>(
  'widgetFullscreenButtonPosition',
  { default: undefined },
);
const widgetLanguageToggleButtonPosition = defineModel<string | undefined>(
  'widgetLanguageToggleButtonPosition',
  { default: undefined },
);
const widgetNotificationButtonPosition = defineModel<string | undefined>(
  'widgetNotificationButtonPosition',
  { default: undefined },
);
const widgetThemeToggleButtonPosition = defineModel<string | undefined>(
  'widgetThemeToggleButtonPosition',
  { default: undefined },
);
const widgetLockScreenButtonPosition = defineModel<string | undefined>(
  'widgetLockScreenButtonPosition',
  { default: undefined },
);
const widgetLogoutButtonPosition = defineModel<string | undefined>(
  'widgetLogoutButtonPosition',
  { default: undefined },
);
const widgetOrder = defineModel<string[]>('widgetOrder', { required: true });
const widgetRefreshButtonPosition = defineModel<string | undefined>(
  'widgetRefreshButtonPosition',
  { default: undefined },
);
const widgetTimezoneButtonPosition = defineModel<string | undefined>(
  'widgetTimezoneButtonPosition',
  { default: undefined },
);

const {
  customPreferences,
  diffCustomPreference,
  diffPreference,
  isDark,
  isFullContent,
  isMixedNav,
  preferencesExtension,
  isSideMode,
} = usePreferences();
const { copy } = useClipboard({ legacy: true });

const open = defineModel<boolean>('open', { default: false });

const activeTab = ref('general');
const isDesktop = useMediaQuery('(min-width: 768px)');

const customPreferencesTab = computed(() => {
  return preferencesExtension.value;
});

const mergedDiffPreference = computed(() => {
  const result: Record<string, unknown> = {};

  if (diffPreference.value) {
    Object.assign(result, diffPreference.value);
  }

  if (diffCustomPreference.value) {
    result.custom = diffCustomPreference.value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
});

const accessStore = useAccessStore();
const userStore = useUserStore();

const isAuthenticated = computed(() => Boolean(accessStore.accessToken));
const accountName = computed(() =>
  isAuthenticated.value
    ? userStore.userInfo?.realName || userStore.userInfo?.username || 'User'
    : $t('preferences.account.localOperator'),
);
const accountDesc = computed(() =>
  isAuthenticated.value
    ? userStore.userInfo?.username || ''
    : $t('preferences.account.localSession'),
);
const accountAvatar = computed(
  () => userStore.userInfo?.avatar || preferences.app.defaultAvatar,
);

function handleAccountSignIn() {
  open.value = false;
  accessStore.setLoginExpired(true);
}

function handleAccountSignOut() {
  open.value = false;
  emit('clearPreferencesAndLogout');
}

const tabs = computed((): SegmentedItem[] => {
  return [
    {
      icon: Settings,
      label: $t('preferences.general'),
      value: 'general',
    },
    {
      icon: LayoutTemplate,
      label: $t('preferences.application'),
      value: 'application',
    },
    {
      icon: Palette,
      label: $t('preferences.appearance'),
      value: 'appearance',
    },
    {
      icon: Keyboard,
      label: $t('preferences.shortcutKeys.title'),
      value: 'shortcutKey',
    },
    {
      icon: Bell,
      label: $t('preferences.widget.notification'),
      value: 'notifications',
    },
  ];
});

const sidebarToggleEnabled = computed({
  get: () =>
    !!widgetSidebarToggle.value &&
    widgetSidebarToggleButtonPosition.value !== 'none',
  set: (value: boolean) => {
    widgetSidebarToggle.value = value;
    if (!value) {
      widgetSidebarToggleButtonPosition.value = 'none';
    } else if (
      !widgetSidebarToggleButtonPosition.value ||
      widgetSidebarToggleButtonPosition.value === 'none'
    ) {
      widgetSidebarToggleButtonPosition.value = 'header-left';
    }
  },
});

const showBreadcrumbConfig = computed(() => {
  return !isFullContent.value && preferences.header.enable;
});

async function handleCopy() {
  await copy(JSON.stringify(mergedDiffPreference.value, null, 2));

  message.copyPreferencesSuccess?.(
    $t('preferences.copyPreferencesSuccessTitle'),
    $t('preferences.copyPreferencesSuccess'),
  );
}

async function handleClearCache() {
  await resetPreferences();
  await clearCache();
  emit('clearPreferencesAndLogout');
}

async function handleReset() {
  if (!mergedDiffPreference.value) {
    return;
  }
  await resetPreferences();
  await loadLocaleMessages(preferences.app.locale);
}

function handleCustomPreferencesUpdate(updates: CustomPreferencesRecord) {
  updateCustomPreferences(updates);
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :aria-describedby="undefined"
      :open="open"
      modal
      class="flex h-[88vh] max-h-[88vh] w-[min(1100px,96vw)] max-w-none select-text flex-col gap-0 overflow-hidden p-0 sm:max-w-none [&_[data-slot=label]]:select-text"
      @close="open = false"
    >
      <DialogHeader class="shrink-0 border-b border-border px-6 py-4 pr-12">
        <DialogTitle>{{ $t('preferences.settingsTitle') }}</DialogTitle>
      </DialogHeader>

      <Tabs
        v-model="activeTab"
        :orientation="isDesktop ? 'vertical' : 'horizontal'"
        class="min-h-0 w-full flex-1 gap-0 overflow-hidden md:flex-row"
      >
        <nav
          class="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-border p-2 md:w-52 md:flex-col md:items-stretch md:border-b-0 md:border-r md:py-4"
        >
          <div class="min-w-0 flex-1 md:flex-none">
            <TabsList
              :aria-label="$t('preferences.title')"
              class="h-auto min-w-full justify-start gap-0.5 bg-transparent p-0 md:w-full md:flex-col md:items-stretch"
            >
              <TabsTrigger
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
                class="h-9 shrink-0 gap-2 rounded-lg px-2.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none md:w-full md:flex-none md:justify-start"
              >
                <component :is="tab.icon" />
                {{ tab.label }}
              </TabsTrigger>
            </TabsList>
          </div>

          <div class="shrink-0 md:mt-auto">
            <Separator class="mb-2 hidden md:block" />
            <Button
              type="button"
              variant="ghost"
              class="h-auto w-full justify-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left font-normal hover:bg-accent/60 md:py-2"
              :class="{
                'bg-accent/70 border-border/50': activeTab === 'account',
              }"
              @click="activeTab = 'account'"
            >
              <VbenAvatar
                :src="accountAvatar"
                class="size-7 shrink-0 md:size-8"
              />
              <div class="hidden min-w-0 flex-1 leading-tight md:block">
                <p class="truncate text-xs font-medium text-foreground">
                  {{ accountName }}
                </p>
                <p class="truncate text-[11px] text-muted-foreground">
                  {{ accountDesc }}
                </p>
              </div>
            </Button>
          </div>
        </nav>
        <div class="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <TabsContent
            value="appearance"
            class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 md:px-8 md:py-6"
          >
            <Block :title="$t('preferences.theme.title')">
              <Theme
                v-model="themeMode"
                v-model:theme-semi-dark-header="themeSemiDarkHeader"
                v-model:theme-semi-dark-sidebar="themeSemiDarkSidebar"
              />
            </Block>
            <Block :title="$t('preferences.theme.builtin.title')">
              <BuiltinTheme
                v-model="themeBuiltinType"
                v-model:theme-color-primary="themeColorPrimary"
                :is-dark="isDark"
              />
            </Block>
            <Block :title="$t('preferences.theme.radius')">
              <Radius v-model="themeRadius" />
            </Block>
            <Block :title="$t('preferences.typography.title')">
              <Custom
                v-if="customPreferencesTab?.fields.length"
                :fields="customPreferencesTab.fields"
                :values="customPreferences"
                @update="handleCustomPreferencesUpdate"
              />
              <FontSize v-model="themeFontSize" />
            </Block>
            <Block :title="$t('preferences.other')">
              <ColorMode
                v-model:app-color-gray-mode="appColorGrayMode"
                v-model:app-color-weak-mode="appColorWeakMode"
              />
            </Block>
          </TabsContent>
          <TabsContent
            value="application"
            class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 md:px-8 md:py-6"
          >
            <Block :title="$t('preferences.layout')">
              <Layout v-model="appLayout" />
              <Content v-model="appContentCompact" />
            </Block>
            <Block :title="$t('preferences.sidebar.title')">
              <Sidebar
                v-model:sidebar-auto-activate-child="sidebarAutoActivateChild"
                v-model:sidebar-collapsed="sidebarCollapsed"
                v-model:sidebar-collapsed-show-title="sidebarCollapsedShowTitle"
                v-model:sidebar-draggable="sidebarDraggable"
                v-model:sidebar-enable="sidebarEnable"
                v-model:sidebar-expand-on-hover="sidebarExpandOnHover"
                v-model:sidebar-width="sidebarWidth"
                v-model:widget-sidebar-toggle="sidebarToggleEnabled"
                :current-layout="appLayout"
                :disabled="!isSideMode"
              />
            </Block>
            <Block :title="$t('preferences.header.title')">
              <Header
                v-model:header-enable="headerEnable"
                v-model:header-menu-align="headerMenuAlign"
                v-model:header-mode="headerMode"
                :disabled="isFullContent"
              />
            </Block>
            <Block :title="$t('preferences.navigationMenu.title')">
              <Navigation
                v-model:navigation-accordion="navigationAccordion"
                v-model:navigation-split="navigationSplit"
                v-model:navigation-style-type="navigationStyleType"
                :disabled="isFullContent"
                :disabled-navigation-split="!isMixedNav"
              />
            </Block>
            <Block
              v-if="widgetBreadcrumbButtonPosition !== 'none'"
              :title="$t('preferences.breadcrumb.title')"
            >
              <Breadcrumb
                v-model:breadcrumb-hide-only-one="breadcrumbHideOnlyOne"
                v-model:breadcrumb-show-home="breadcrumbShowHome"
                v-model:breadcrumb-show-icon="breadcrumbShowIcon"
                v-model:breadcrumb-style-type="breadcrumbStyleType"
                :disabled="!showBreadcrumbConfig"
              />
            </Block>
            <Block :title="$t('preferences.widget.title')">
              <Widget
                v-model:app-preferences-button-position="
                  appPreferencesButtonPosition
                "
                v-model:widget-breadcrumb-button-position="
                  widgetBreadcrumbButtonPosition
                "
                v-model:widget-fullscreen-button-position="
                  widgetFullscreenButtonPosition
                "
                v-model:widget-global-search-button-position="
                  widgetGlobalSearchButtonPosition
                "
                v-model:widget-language-toggle-button-position="
                  widgetLanguageToggleButtonPosition
                "
                v-model:widget-lock-screen-button-position="
                  widgetLockScreenButtonPosition
                "
                v-model:widget-logo-button-position="widgetLogoButtonPosition"
                v-model:widget-logout-button-position="
                  widgetLogoutButtonPosition
                "
                v-model:widget-notification-button-position="
                  widgetNotificationButtonPosition
                "
                v-model:widget-order="widgetOrder"
                v-model:widget-refresh-button-position="
                  widgetRefreshButtonPosition
                "
                v-model:widget-sidebar-toggle-button-position="
                  widgetSidebarToggleButtonPosition
                "
                @update:widget-sidebar-toggle-button-position="
                  (pos) => {
                    if (pos !== undefined) {
                      widgetSidebarToggle = pos !== 'none';
                    }
                  }
                "
                v-model:widget-theme-toggle-button-position="
                  widgetThemeToggleButtonPosition
                "
                v-model:widget-user-dropdown-button-position="
                  widgetUserDropdownButtonPosition
                "
                v-model:widget-tenant-selector-button-position="
                  widgetTenantSelectorButtonPosition
                "
                v-model:widget-timezone-button-position="
                  widgetTimezoneButtonPosition
                "
              />
            </Block>
            <Block :title="$t('preferences.tabbar.title')">
              <Tabbar
                v-model:tabbar-draggable="tabbarDraggable"
                v-model:tabbar-enable="tabbarEnable"
                v-model:tabbar-max-count="tabbarMaxCount"
                v-model:tabbar-middle-click-to-close="tabbarMiddleClickToClose"
                v-model:tabbar-persist="tabbarPersist"
                v-model:tabbar-show-icon="tabbarShowIcon"
                v-model:tabbar-show-maximize="tabbarShowMaximize"
                v-model:tabbar-show-more="tabbarShowMore"
                v-model:tabbar-show-refresh="tabbarShowRefresh"
                v-model:tabbar-style-type="tabbarStyleType"
                v-model:tabbar-visit-history="tabbarVisitHistory"
                v-model:tabbar-wheelable="tabbarWheelable"
              />
            </Block>
            <Block :title="$t('preferences.footer.title')">
              <Footer
                v-model:footer-enable="footerEnable"
                v-model:footer-fixed="footerFixed"
              />
            </Block>
            <Block
              v-if="copyrightSettingShow"
              :title="$t('preferences.copyright.title')"
            >
              <Copyright
                v-model:copyright-company-name="copyrightCompanyName"
                v-model:copyright-company-site-link="copyrightCompanySiteLink"
                v-model:copyright-date="copyrightDate"
                v-model:copyright-enable="copyrightEnable"
                v-model:copyright-icp="copyrightIcp"
                v-model:copyright-icp-link="copyrightIcpLink"
                :disabled="!footerEnable"
              />
            </Block>
          </TabsContent>
          <TabsContent
            value="shortcutKey"
            class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 md:px-8 md:py-6"
          >
            <Block :title="$t('preferences.shortcutKeys.global')">
              <GlobalShortcutKeys
                v-model:shortcut-keys-enable="shortcutKeysEnable"
                v-model:shortcut-keys-escape="shortcutKeysGlobalEscape"
                v-model:shortcut-keys-global-search="shortcutKeysGlobalSearch"
                v-model:shortcut-keys-lock-screen="shortcutKeysGlobalLockScreen"
                v-model:shortcut-keys-logout="shortcutKeysGlobalLogout"
              />
            </Block>
          </TabsContent>
          <TabsContent
            value="general"
            class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 md:px-8 md:py-6"
          >
            <Block>
              <General
                v-model:app-dynamic-title="appDynamicTitle"
                v-model:app-enable-check-updates="appEnableCheckUpdates"
                v-model:app-enable-copy-preferences="appEnableCopyPreferences"
                v-model:app-locale="appLocale"
                v-model:app-timezone="appTimezone"
                v-model:app-watermark="appWatermark"
                v-model:app-watermark-content="appWatermarkContent"
              />
            </Block>
            <Block :title="$t('preferences.animation.title')">
              <Animation
                v-model:transition-enable="transitionEnable"
                v-model:transition-loading="transitionLoading"
                v-model:transition-name="transitionName"
                v-model:transition-progress="transitionProgress"
              />
            </Block>
          </TabsContent>
          <TabsContent
            value="notifications"
            class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 md:px-8 md:py-6"
          >
            <Block :title="$t('preferences.widget.notification')">
              <p class="text-xs text-muted-foreground">
                {{ $t('preferences.widget.notification') }}
              </p>
            </Block>
          </TabsContent>
          <TabsContent
            value="account"
            class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 md:px-8 md:py-6"
          >
            <div>
              <h3 class="text-base font-semibold text-foreground">
                {{ $t('preferences.account.title') }}
              </h3>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ $t('preferences.account.description') }}
              </p>
            </div>

            <Card
              class="rounded-xl border-border/60 bg-card/50 py-0 shadow-none"
            >
              <CardContent class="flex items-center justify-between gap-4 p-4">
                <div class="flex min-w-0 items-center gap-3">
                  <VbenAvatar :src="accountAvatar" class="size-11 shrink-0" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="truncate text-sm font-medium text-foreground">
                        {{ accountName }}
                      </p>
                      <Badge variant="outline" class="text-[10px]">
                        {{
                          isAuthenticated
                            ? 'Cloud'
                            : $t('preferences.account.localSession')
                        }}
                      </Badge>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-muted-foreground">
                      {{
                        isAuthenticated
                          ? $t('preferences.account.connectedDesc')
                          : $t('preferences.account.localOnlyDesc')
                      }}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card class="rounded-xl border-border/60 py-0 shadow-none">
              <CardContent class="flex items-center justify-between gap-4 p-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground">
                    {{ $t('preferences.account.cloudSession') }}
                  </p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    {{
                      isAuthenticated
                        ? accountDesc
                        : $t('preferences.account.localOnlyDesc')
                    }}
                  </p>
                </div>
                <Button
                  v-if="isAuthenticated"
                  variant="outline"
                  size="sm"
                  class="shrink-0 gap-1.5"
                  @click="handleAccountSignOut"
                >
                  <LogOut class="size-3.5" />
                  {{ $t('preferences.account.signOut') }}
                </Button>
                <Button
                  v-else
                  variant="default"
                  size="sm"
                  class="shrink-0 gap-1.5"
                  @click="handleAccountSignIn"
                >
                  <LogIn class="size-3.5" />
                  {{ $t('preferences.account.signIn') }}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      <DialogFooter class="shrink-0 border-t border-border px-4 py-3 sm:px-6">
        <PreferencesActions
          :can-reset="!!mergedDiffPreference"
          :show-copy="appEnableCopyPreferences"
          @reset="handleReset"
          @copy="handleCopy"
          @clear="handleClearCache"
        />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
