import { DEFAULT_HOME_PATH } from '@operon/constants';
import { defineOverridesPreferences } from '@operon/preferences';

/**
 * @description Project preferences configuration
 * Only override necessary configurations; omitted options will automatically fallback to default values.
 * Note: Clear localStorage / cache if configuration changes do not take effect immediately.
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    defaultHomePath: DEFAULT_HOME_PATH,
    enablePreferences: true,
    enableRefreshToken: true,
    locale: 'en-US',
    loginExpiredMode: 'modal',
    name: 'Operon',
    authPageLayout: 'panel-right',
    layout: 'header-sidebar-nav',
    preferencesButtonPosition: 'none',
  },
  logo: {
    source: '/logo.svg',
    sourceDark: '/logo.svg',
  },
  breadcrumb: {
    enable: true,
    showIcon: false,
  },
  copyright: {
    companyName: 'operon',
    companySiteLink: 'https://operon.com',
    date: '2026',
    enable: true,
    icp: '',
    icpLink: '',
    settingShow: true,
  },
  footer: {
    enable: false,
    fixed: true,
  },
  sidebar: {
    collapsed: false,
    width: 220,
  },
  tabbar: {
    enable: false,
  },
  theme: {
    builtinType: 'neutral',
    colorPrimary: 'hsl(0 0% 98%)',
    mode: 'dark',
    radius: '0.5',
  },
  widget: {
    breadcrumbButtonPosition: 'none',
    fullscreenButtonPosition: 'header-right',
    globalSearchButtonPosition: 'header-left',
    lockScreenButtonPosition: 'none',
    logoButtonPosition: 'none',
    logoutButtonPosition: 'none',
    refreshButtonPosition: 'header-right',
    sidebarToggleButtonPosition: 'header-left',
    timezoneButtonPosition: 'header-right',
    userDropdownButtonPosition: 'header-right',
    tenantSelectorButtonPosition: 'header-left',
    languageToggleButtonPosition: 'header-right',
    notificationButtonPosition: 'header-right',
    themeToggleButtonPosition: 'header-right',
    order: [
      'tenantSelector',
      'sidebarToggle',
      'globalSearch',
      'themeToggle',
      'languageToggle',
      'notification',
      'fullscreen',
      'timezone',
      'userDropdown',
      'refresh',
      'logo',
      'breadcrumb',
      'logoutBtn',
      'lockScreenBtn',
      'preferences',
    ],
  },
});

export interface AdminCustomPreferences {
  fontFamily: 'inter' | 'roboto' | 'system-ui';
}

export const typographyPreferencesExtension = {
  fields: [
    {
      component: 'select' as const,
      defaultValue: 'inter',
      key: 'fontFamily',
      label: 'preferences.typography.fontFamily',
      options: [
        {
          label: 'preferences.typography.inter',
          value: 'inter',
        },
        {
          label: 'preferences.typography.roboto',
          value: 'roboto',
        },
        {
          label: 'preferences.typography.systemUi',
          value: 'system-ui',
        },
      ],
      tip: 'preferences.typography.fontFamilyTip',
    },
  ],
  tabLabel: 'preferences.typography.title',
  title: 'preferences.typography.title',
};
