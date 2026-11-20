<script lang="ts" setup>
import type { SetupContext } from 'vue';

import type { MenuRecordRaw } from '@operon/types';

import { computed, useSlots, watch } from 'vue';

import { useRefresh } from '@operon/hooks';
import { $t, i18n } from '@operon/locales';
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@operon/preferences';
import {
  useAccessStore,
  useTabbarStore,
  useTimezoneStore,
} from '@operon/stores';
import { cloneDeep, mapTree } from '@operon/utils';

import { VbenAdminLayout } from '@operon-core/layout-ui';
import { VbenBackTop } from '@operon-core/shadcn-ui';
import { ELEMENT_ID_LAYOUT_SCROLL } from '@operon-core/shared/constants';

import { useFullscreen } from '@vueuse/core';

import {
  Breadcrumb,
  CheckUpdates,
  GlobalSearch,
  Preferences,
} from '../widgets';
import { LayoutContent, LayoutContentSpinner } from './content';
import { Copyright } from './copyright';
import { LayoutFooter } from './footer';
import { LayoutHeader } from './header';
import HeaderWidget from './header/header-widget.vue';
import { LayoutMenu, useMixedMenu } from './menu';
import { LayoutTabbar } from './tabbar';
import { useLayoutScroll } from './use-layout-scroll';
import {
  buildOrderedZoneSlots,
  buildWidgetConfigMap,
  openGlobalSearchCommand,
  toggleSidebarHidden,
} from './widget-zones';

defineOptions({ name: 'BasicLayout' });

withDefaults(defineProps<Props>(), {
  avatar: '',
  text: '',
});

const emit = defineEmits<{
  clearPreferencesAndLogout: [];
  logout: [];
}>();

interface Props {
  /** User avatar image URL */
  avatar?: string;
  /** User text (e.g. username) */
  text?: string;
}

const slots: SetupContext['slots'] = useSlots();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

const {
  globalSearchShortcutKey,
  isDark,
  isHeaderNav,
  isMixedNav,
  isMobile,
  isSideMode,
  layout,
  preferencesButtonPosition,
  theme,
} = usePreferences();
const accessStore = useAccessStore();
const timezoneStore = useTimezoneStore();
const { refresh } = useRefresh();
const layoutScrollTarget = `#${ELEMENT_ID_LAYOUT_SCROLL}`;

useLayoutScroll();

const sidebarTheme = computed(() => {
  const dark = isDark.value || preferences.theme.semiDarkSidebar;
  return dark ? 'dark' : 'light';
});

const headerTheme = computed(() => {
  const dark = isDark.value || preferences.theme.semiDarkHeader;
  return dark ? 'dark' : 'light';
});

const isMenuRounded = computed(() => {
  return preferences.navigation.styleType === 'rounded';
});

const showHeaderNav = computed(() => {
  return !isMobile.value && (isHeaderNav.value || isMixedNav.value);
});

const {
  handleMenuSelect,
  handleMenuOpen,
  headerActive,
  headerMenus,
  sidebarActive,
  sidebarMenus,
  sidebarVisible,
} = useMixedMenu();

/**
 * Wrap menu items and translate menu titles
 * @param menus Raw menu data
 * @param deep Whether to wrap deeply (in mixed layout only first level is wrapped)
 */
function wrapperMenus(menus: MenuRecordRaw[], deep: boolean = true) {
  return deep
    ? mapTree(menus, (item) => {
        return { ...cloneDeep(item), name: $t(item.name) };
      })
    : menus.map((item) => {
        return { ...cloneDeep(item), name: $t(item.name) };
      });
}

function toggleSidebar() {
  updatePreferences({
    sidebar: {
      hidden: !preferences.sidebar.hidden,
    },
  });
}

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}

function handleLogout() {
  emit('logout');
}

const tabbarStore = useTabbarStore();

function refreshAll() {
  tabbarStore.cachedTabs.clear();
  refresh();
}

// Refresh page when language updates
// i18n.global.locale updates after preferences; wait for full locale loading
watch(i18n.global.locale, refreshAll, { flush: 'post' });

// Refresh page when timezone updates
watch(() => timezoneStore.timezone, refreshAll, { flush: 'post' });

const isSidebarRendered = computed(
  () =>
    !isMobile.value &&
    isSideMode.value &&
    sidebarVisible.value &&
    !preferences.sidebar.hidden,
);

const sidebarHeaderSlots = computed(() => {
  const configMap = buildWidgetConfigMap({
    fallbackSidebarHeaderToLeft: false,
    isMobile: isMobile.value,
    showPreferencesInHeader: preferencesButtonPosition.value.header,
  });
  return buildOrderedZoneSlots(
    preferences.widget.order,
    configMap,
    'sidebar-header',
  );
});

const headerSlots = computed(() => {
  return Object.keys(slots).filter((key) => key.startsWith('header-'));
});
</script>

<template>
  <VbenAdminLayout
    :content-compact="preferences.app.contentCompact"
    :content-compact-width="preferences.app.contentCompactWidth"
    :content-padding="preferences.app.contentPadding"
    :content-padding-bottom="preferences.app.contentPaddingBottom"
    :content-padding-left="preferences.app.contentPaddingLeft"
    :content-padding-right="preferences.app.contentPaddingRight"
    :content-padding-top="preferences.app.contentPaddingTop"
    :footer-enable="preferences.footer.enable"
    :footer-fixed="preferences.footer.fixed"
    :footer-height="preferences.footer.height"
    :header-height="preferences.header.height"
    :header-hidden="preferences.header.hidden"
    :header-mode="preferences.header.mode"
    :header-theme="headerTheme"
    :header-toggle-sidebar-button="false"
    :header-visible="preferences.header.enable"
    :is-mobile="preferences.app.isMobile"
    :layout="layout"
    :sidebar-draggable="preferences.sidebar.draggable"
    :sidebar-collapse="preferences.sidebar.collapsed"
    :sidebar-collapse-show-title="preferences.sidebar.collapsedShowTitle"
    :sidebar-enable="sidebarVisible"
    :sidebar-collapsed-button="false"
    :sidebar-fixed-button="false"
    :sidebar-expand-on-hover="preferences.sidebar.expandOnHover"
    :sidebar-extra-collapsed-width="preferences.sidebar.extraCollapsedWidth"
    :sidebar-hidden="preferences.sidebar.hidden"
    :sidebar-theme="sidebarTheme"
    :sidebar-width="preferences.sidebar.width"
    :side-collapse-width="preferences.sidebar.collapseWidth"
    :tabbar-enable="preferences.tabbar.enable"
    :tabbar-height="preferences.tabbar.height"
    :z-index="preferences.app.zIndex"
    @toggle-sidebar="toggleSidebar"
    @update:sidebar-collapse="
      (value: boolean) => updatePreferences({ sidebar: { collapsed: value } })
    "
    @update:sidebar-enable="
      (value: boolean) => updatePreferences({ sidebar: { enable: value } })
    "
    @update:sidebar-expand-on-hover="
      (value: boolean) =>
        updatePreferences({ sidebar: { expandOnHover: value } })
    "
    @update:sidebar-width="
      (value: number) => updatePreferences({ sidebar: { width: value } })
    "
  >
    <!-- Sidebar header -->
    <template
      v-if="$slots['sidebar-header'] || sidebarHeaderSlots.length > 0"
      #sidebar-header="{ collapsed }"
    >
      <div
        class="flex w-full min-w-0 items-center gap-1"
        :class="collapsed ? 'flex-col justify-center' : ''"
      >
        <template v-for="slotName in sidebarHeaderSlots" :key="slotName">
          <slot
            v-if="
              slotName === 'tenant-selector' && $slots['tenant-selector']
            "
            :collapsed="collapsed"
            name="tenant-selector"
          ></slot>
          <HeaderWidget
            v-else
            v-show="
              !collapsed || slotName === 'logo' || slotName === 'sidebar-toggle'
            "
            :name="slotName"
            :is-fullscreen="isFullscreen"
            :global-search-shortcut-key="globalSearchShortcutKey"
            @open-global-search="openGlobalSearchCommand"
            @toggle-fullscreen="toggleFullscreen"
            @toggle-sidebar="toggleSidebarHidden"
            @refresh="refreshAll"
          />
        </template>
        <slot :collapsed="collapsed" name="sidebar-header"></slot>
      </div>
    </template>
    <!-- Header area -->
    <template #header>
      <LayoutHeader
        :avatar="avatar"
        :sidebar-rendered="isSidebarRendered"
        :theme="theme"
        :text="text"
        @clear-preferences-and-logout="clearPreferencesAndLogout"
        @logout="handleLogout"
      >
        <template
          v-if="preferences.widget.breadcrumbButtonPosition !== 'none'"
          #breadcrumb
        >
          <Breadcrumb
            :hide-when-only-one="preferences.breadcrumb.hideOnlyOne"
            :show-home="preferences.breadcrumb.showHome"
            :show-icon="preferences.breadcrumb.showIcon"
            :type="preferences.breadcrumb.styleType"
          />
        </template>
        <template v-if="showHeaderNav" #menu>
          <LayoutMenu
            :default-active="headerActive"
            :menus="wrapperMenus(headerMenus)"
            :rounded="isMenuRounded"
            :theme="headerTheme"
            class="w-full"
            mode="horizontal"
            @select="handleMenuSelect"
          />
        </template>
        <template #user-dropdown>
          <slot name="user-dropdown"></slot>
        </template>
        <template v-if="$slots['tenant-selector']" #tenant-selector>
          <slot :collapsed="false" name="tenant-selector"></slot>
        </template>
        <template #notification>
          <slot name="notification"></slot>
        </template>
        <template v-for="item in headerSlots" #[item]>
          <slot :name="item"></slot>
        </template>
      </LayoutHeader>
    </template>
    <!-- Sidebar menu area -->
    <template #menu>
      <LayoutMenu
        :accordion="preferences.navigation.accordion"
        :collapse="preferences.sidebar.collapsed"
        :collapse-show-title="preferences.sidebar.collapsedShowTitle"
        :default-active="sidebarActive"
        :menus="wrapperMenus(sidebarMenus)"
        :rounded="isMenuRounded"
        :theme="sidebarTheme"
        mode="vertical"
        @open="handleMenuOpen"
        @select="handleMenuSelect"
      />
    </template>

    <!-- Sidebar footer -->
    <template v-if="$slots['sidebar-footer']" #sidebar-footer="{ collapsed }">
      <slot :collapsed="collapsed" name="sidebar-footer"></slot>
    </template>

    <template #tabbar>
      <LayoutTabbar
        v-if="preferences.tabbar.enable"
        :show-icon="preferences.tabbar.showIcon"
        :theme="theme"
      />
    </template>

    <!-- Main content -->
    <template #content>
      <LayoutContent />
    </template>

    <template v-if="preferences.transition.loading" #content-overlay>
      <LayoutContentSpinner />
    </template>

    <!-- Footer -->
    <template v-if="preferences.footer.enable" #footer>
      <LayoutFooter>
        <slot name="footer">
          <Copyright
            v-if="preferences.copyright.enable"
            v-bind="preferences.copyright"
          />
          <div v-else class="text-muted-foreground">
            Copyright © {{ preferences.copyright.date || '2026' }}
            <a
              v-if="preferences.copyright.companyName"
              :href="
                preferences.copyright.companySiteLink || 'javascript:void(0)'
              "
              class="mx-1 hover:text-primary-hover"
              target="_blank"
            >
              {{ preferences.copyright.companyName }}
            </a>
          </div>
        </slot>
      </LayoutFooter>
    </template>

    <template #extra>
      <slot name="extra"></slot>
      <CheckUpdates
        v-if="preferences.app.enableCheckUpdates"
        :check-updates-interval="preferences.app.checkUpdatesInterval"
      />

      <Transition v-if="preferences.widget.lockScreen" name="slide-up">
        <slot v-if="accessStore.isLockScreen" name="lock-screen"></slot>
      </Transition>

      <GlobalSearch
        v-if="preferences.widget.globalSearch"
        :enable-shortcut-key="globalSearchShortcutKey"
        :menus="accessStore.accessMenus"
        :show-button="false"
      />

      <Preferences
        v-if="preferences.app.enablePreferences"
        :show-button="preferencesButtonPosition.fixed"
        :class="
          preferencesButtonPosition.fixed
            ? 'fixed top-1/2 right-0 z-100 -translate-y-1/2 transform'
            : ''
        "
        @clear-preferences-and-logout="clearPreferencesAndLogout"
      />
      <VbenBackTop :target="layoutScrollTarget" />
    </template>
  </VbenAdminLayout>
</template>
