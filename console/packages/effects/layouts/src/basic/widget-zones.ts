import type { Preferences } from '@operon/preferences';

import { preferences, updatePreferences } from '@operon/preferences';

export type WidgetZone = 'left' | 'right' | 'sidebar-header';

export interface WidgetZoneEntry {
  slotName: string;
  zone: null | WidgetZone;
}

/**
 * Normalize a widget position string into a layout zone.
 */
export function resolveWidgetZone(
  pos?: string,
  fallbackSidebarHeaderToLeft = false,
): null | WidgetZone {
  if (pos === 'header-left') return 'left';
  if (pos === 'header' || pos === 'header-right') return 'right';
  if (pos === 'sidebar-header') {
    return fallbackSidebarHeaderToLeft ? 'left' : 'sidebar-header';
  }
  return null;
}

/**
 * Build zone configuration for every ordered layout widget from preferences.
 */
export function buildWidgetConfigMap(options: {
  fallbackSidebarHeaderToLeft?: boolean;
  isMobile: boolean;
  prefs?: Preferences;
  showPreferencesInHeader: boolean;
}): Record<string, WidgetZoneEntry> {
  const {
    fallbackSidebarHeaderToLeft = false,
    isMobile,
    prefs = preferences,
    showPreferencesInHeader,
  } = options;
  const resolveZone = (pos?: string) =>
    resolveWidgetZone(pos, fallbackSidebarHeaderToLeft);
  const prefZone = showPreferencesInHeader
    ? resolveZone(
        (prefs.app.preferencesButtonPosition as string) === 'header-left'
          ? 'header-left'
          : 'header-right',
      )
    : null;

  return {
    logo: {
      slotName: 'logo',
      zone: prefs.widget.logo
        ? resolveZone(prefs.widget.logoButtonPosition)
        : null,
    },
    sidebarToggle: {
      slotName: 'sidebar-toggle',
      zone:
        !isMobile && prefs.widget.sidebarToggle
          ? resolveZone(prefs.widget.sidebarToggleButtonPosition)
          : null,
    },
    breadcrumb: {
      slotName: 'breadcrumb',
      zone: resolveZone(prefs.widget.breadcrumbButtonPosition),
    },
    globalSearch: {
      slotName: 'global-search',
      zone: prefs.widget.globalSearch
        ? resolveZone(prefs.widget.globalSearchButtonPosition)
        : null,
    },
    preferences: {
      slotName: 'preferences',
      zone: prefZone,
    },
    themeToggle: {
      slotName: 'theme-toggle',
      zone: prefs.widget.themeToggle
        ? resolveZone(prefs.widget.themeToggleButtonPosition)
        : null,
    },
    languageToggle: {
      slotName: 'language-toggle',
      zone: prefs.widget.languageToggle
        ? resolveZone(prefs.widget.languageToggleButtonPosition)
        : null,
    },
    timezone: {
      slotName: 'timezone',
      zone: prefs.widget.timezone
        ? resolveZone(prefs.widget.timezoneButtonPosition)
        : null,
    },
    fullscreen: {
      slotName: 'fullscreen',
      zone: prefs.widget.fullscreen
        ? resolveZone(prefs.widget.fullscreenButtonPosition)
        : null,
    },
    refresh: {
      slotName: 'refresh',
      zone: prefs.widget.refresh
        ? resolveZone(prefs.widget.refreshButtonPosition)
        : null,
    },
    notification: {
      slotName: 'notification',
      zone: prefs.widget.notification
        ? resolveZone(prefs.widget.notificationButtonPosition)
        : null,
    },
    lockScreenBtn: {
      slotName: 'lock-screen-btn',
      zone: prefs.widget.lockScreen
        ? resolveZone(prefs.widget.lockScreenButtonPosition)
        : null,
    },
    logoutBtn: {
      slotName: 'logout-btn',
      zone: resolveZone(prefs.widget.logoutButtonPosition),
    },
    userDropdown: {
      slotName: 'user-dropdown',
      zone: resolveZone(prefs.widget.userDropdownButtonPosition),
    },
    tenantSelector: {
      slotName: 'tenant-selector',
      zone: resolveZone(prefs.widget.tenantSelectorButtonPosition),
    },
  };
}

/**
 * Collect ordered widget slot names assigned to a specific layout zone.
 */
export function buildOrderedZoneSlots(
  order: readonly string[],
  configMap: Record<string, WidgetZoneEntry>,
  targetZone: WidgetZone,
): string[] {
  const list: string[] = [];
  for (const key of order) {
    const entry = configMap[key];
    if (entry?.zone === targetZone) {
      list.push(entry.slotName);
    }
  }
  return list;
}

/**
 * Open global command palette navigation modal.
 */
export function openGlobalSearchCommand() {
  window.dispatchEvent(
    new CustomEvent('open-command-palette', {
      detail: { mode: 'navigation', initialValue: '' },
    }),
  );
}

/**
 * Toggle sidebar visibility in preferences.
 */
export function toggleSidebarHidden() {
  updatePreferences({
    sidebar: {
      hidden: !preferences.sidebar.hidden,
    },
  });
}
