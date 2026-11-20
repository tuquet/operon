import { computed } from 'vue';

import { diff, diffStrict } from '@operon-core/shared/utils';

import { preferencesManager } from './preferences';
import { isDarkTheme } from './update-css-variables';

function usePreferences() {
  const preferences = preferencesManager.getPreferences();
  const customPreferences = preferencesManager.getCustomPreferences();
  const preferencesExtension = computed(() =>
    preferencesManager.getPreferencesExtension(),
  );
  /**
   * Compute preference diff
   * Uses diffStrict: array fields like icon ordering require order-sensitive comparison
   */
  const diffPreference = computed(() => {
    const initialPreferences = preferencesManager.getInitialPreferences();
    // Exclude runtime-only viewport state (isMobile) from diff calculation
    const baseline = {
      ...initialPreferences,
      app: {
        ...initialPreferences.app,
        isMobile: preferences.app.isMobile,
      },
    };
    return diffStrict(baseline, preferences);
  });

  const diffCustomPreference = computed(() => {
    const initialCustomPreferences =
      preferencesManager.getInitialCustomPreferences();
    return diff(initialCustomPreferences, customPreferences);
  });

  const appPreferences = computed(() => preferences.app);

  const shortcutKeysPreferences = computed(() => preferences.shortcutKeys);

  /**
   * Determine whether dark mode is active
   * @param preferences - Current preferences object
   * @returns Returns true if theme is dark mode, false otherwise
   */
  const isDark = computed(() => {
    return isDarkTheme(preferences.theme.mode);
  });

  const locale = computed(() => {
    return appPreferences.value.locale;
  });

  const isMobile = computed(() => {
    return appPreferences.value.isMobile;
  });

  const theme = computed(() => {
    return isDark.value ? 'dark' : 'light';
  });

  /**
   * Layout mode
   */
  const layout = computed(() =>
    isMobile.value ? 'sidebar-nav' : appPreferences.value.layout,
  );

  /**
   * Whether header is visible
   */
  const isShowHeaderNav = computed(() => {
    return preferences.header.enable;
  });

  /**
   * Whether to display full content without sidebar, header, footer, or tabs
   */
  const isFullContent = computed(
    () => appPreferences.value.layout === 'full-content',
  );

  /**
   * Whether sidebar nav mode
   */
  const isSideNav = computed(
    () => appPreferences.value.layout === 'sidebar-nav',
  );

  /**
   * Whether header nav mode
   */
  const isHeaderNav = computed(
    () => appPreferences.value.layout === 'header-nav',
  );

  /**
   * Whether mixed nav mode
   */
  const isHeaderSidebarNav = computed(
    () => appPreferences.value.layout === 'header-sidebar-nav',
  );

  /**
   * Whether mixed nav mode
   */
  const isMixedNav = computed(
    () => appPreferences.value.layout === 'mixed-nav',
  );

  /**
   * Whether contains sidebar nav
   */
  const isSideMode = computed(() => {
    return isMixedNav.value || isSideNav.value || isHeaderSidebarNav.value;
  });

  const sidebarCollapsed = computed(() => {
    return preferences.sidebar.collapsed;
  });

  /**
   * Whether keep-alive is active
   * Active only when tabs are visible and keep-alive is enabled
   */
  const keepAlive = computed(
    () => preferences.tabbar.enable && preferences.tabbar.keepAlive,
  );

  /**
   * Whether auth page layout is left panel
   */
  const authPanelLeft = computed(() => {
    return appPreferences.value.authPageLayout === 'panel-left';
  });

  /**
   * Whether auth page layout is right panel
   */
  const authPanelRight = computed(() => {
    return appPreferences.value.authPageLayout === 'panel-right';
  });

  /**
   * Whether auth page layout is center panel
   */
  const authPanelCenter = computed(() => {
    return appPreferences.value.authPageLayout === 'panel-center';
  });

  /**
   * Whether content area is maximized
   * Excluding full-content mode
   */
  const contentIsMaximize = computed(() => {
    const headerIsHidden = preferences.header.hidden;
    const sidebarIsHidden = preferences.sidebar.hidden;
    return headerIsHidden && sidebarIsHidden && !isFullContent.value;
  });

  /**
   * Whether global search shortcut is enabled
   */
  const globalSearchShortcutKey = computed(() => {
    const { enable, globalSearch } = shortcutKeysPreferences.value;
    return enable && globalSearch;
  });

  /**
   * Whether global logout shortcut is enabled
   */
  const globalLogoutShortcutKey = computed(() => {
    const { enable, globalLogout } = shortcutKeysPreferences.value;
    return enable && globalLogout;
  });

  /**
   * Whether global logout shortcut is enabled
   */
  const globalEscapeShortcutKey = computed(() => {
    const { enable, globalEscape } = shortcutKeysPreferences.value;
    return enable && globalEscape;
  });

  const globalLockScreenShortcutKey = computed(() => {
    const { enable, globalLockScreen } = shortcutKeysPreferences.value;
    return enable && globalLockScreen;
  });

  /**
   * Preferences button position
   */
  const preferencesButtonPosition = computed(() => {
    const { enablePreferences, preferencesButtonPosition } = preferences.app;
    // If preferences button is disabled
    if (!enablePreferences) {
      return {
        fixed: false,
        header: false,
        userDropdown: false,
      };
    }

    const { header, sidebar } = preferences;
    const headerHidden = header.hidden;
    const sidebarHidden = sidebar.hidden;

    const contentIsMaximize = headerHidden && sidebarHidden;

    const isHeaderPosition = preferencesButtonPosition === 'header';
    const isUserDropdownPosition =
      preferencesButtonPosition === 'user-dropdown';

    // If explicit position is configured
    if (preferencesButtonPosition !== 'auto') {
      // Keep preferences accessible when its configured header location is unavailable.
      const headerUnavailable = !header.enable || headerHidden;
      if ((isHeaderPosition || isUserDropdownPosition) && headerUnavailable) {
        return {
          fixed: true,
          header: false,
          userDropdown: false,
        };
      }

      return {
        fixed: preferencesButtonPosition === 'fixed',
        header: isHeaderPosition,
        userDropdown: isUserDropdownPosition,
      };
    }

    // If fullscreen mode or not fixed at top,
    const fixed =
      contentIsMaximize ||
      isFullContent.value ||
      isMobile.value ||
      !header.enable ||
      !isShowHeaderNav.value;

    return {
      fixed,
      header: !fixed,
      userDropdown: !fixed && isUserDropdownPosition,
    };
  });

  return {
    authPanelCenter,
    authPanelLeft,
    authPanelRight,
    contentIsMaximize,
    customPreferences,
    diffPreference,
    diffCustomPreference,
    globalLockScreenShortcutKey,
    globalLogoutShortcutKey,
    globalEscapeShortcutKey,
    globalSearchShortcutKey,
    isDark,
    isFullContent,
    isHeaderNav,
    isHeaderSidebarNav,
    isMixedNav,
    isMobile,
    isSideMode,
    isSideNav,
    keepAlive,
    layout,
    locale,
    preferencesExtension,
    preferencesButtonPosition,
    sidebarCollapsed,
    theme,
    app: appPreferences.value,
  };
}

export { usePreferences };
