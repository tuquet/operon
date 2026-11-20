<script setup lang="ts">
import type {
  PreferencesButtonPositionType,
  SelectOption,
} from '@operon/types';

import { computed } from 'vue';

import { $t } from '@operon/locales';

import DraggableList from '../draggable-list.vue';

defineOptions({
  name: 'PreferenceInterfaceControl',
});

const widgetOrder = defineModel<string[]>('widgetOrder', { required: true });

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
const widgetRefreshButtonPosition = defineModel<string | undefined>(
  'widgetRefreshButtonPosition',
  { default: undefined },
);
const widgetTimezoneButtonPosition = defineModel<string | undefined>(
  'widgetTimezoneButtonPosition',
  { default: undefined },
);
const appPreferencesButtonPosition = defineModel<
  PreferencesButtonPositionType | undefined
>('appPreferencesButtonPosition', { default: undefined });

const headerOnlyPositionItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.widget.headerLeft'),
    value: 'header-left',
  },
  {
    label: $t('preferences.widget.headerRight'),
    value: 'header-right',
  },
  {
    label: $t('common.notShow'),
    value: 'none',
  },
]);

const buttonPositionItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.widget.sidebarHeader'),
    value: 'sidebar-header',
  },
  {
    label: $t('preferences.widget.headerLeft'),
    value: 'header-left',
  },
  {
    label: $t('preferences.widget.headerRight'),
    value: 'header-right',
  },
  {
    label: $t('preferences.widget.userDropdown'),
    value: 'user-dropdown',
  },
  {
    label: $t('common.notShow'),
    value: 'none',
  },
]);

const preferencesPositionItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.position.auto'),
    value: 'auto',
  },
  {
    label: $t('preferences.position.header'),
    value: 'header',
  },
  {
    label: $t('preferences.position.fixed'),
    value: 'fixed',
  },
  {
    label: $t('preferences.position.userDropdown'),
    value: 'user-dropdown',
  },
  {
    label: $t('common.notShow'),
    value: 'none',
  },
]);

const sidebarAndHeaderOnlyKeys = new Set([
  'logo',
  'sidebarToggle',
  'tenantSelector',
]);

const headerOnlyKeys = new Set(['breadcrumb', 'userDropdown']);

const sidebarHeaderOnlyPositionItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.widget.sidebarHeader'),
    value: 'sidebar-header',
  },
  ...headerOnlyPositionItems.value,
]);

const labelMap: Record<string, string> = {
  logo: 'preferences.widget.logo',
  sidebarToggle: 'preferences.widget.sidebarToggle',
  breadcrumb: 'preferences.widget.breadcrumb',
  globalSearch: 'preferences.widget.globalSearch',
  preferences: 'preferences.title',
  themeToggle: 'preferences.widget.themeToggle',
  languageToggle: 'preferences.widget.languageToggle',
  timezone: 'preferences.widget.timezone',
  fullscreen: 'preferences.widget.fullscreen',
  refresh: 'preferences.widget.refresh',
  notification: 'preferences.widget.notification',
  lockScreenBtn: 'ui.widgets.lockScreen.title',
  logoutBtn: 'common.logout',
  userDropdown: 'preferences.widget.userDropdown',
  tenantSelector: 'preferences.widget.tenantSelector',
};

function getModelMap() {
  return {
    logo: widgetLogoButtonPosition,
    sidebarToggle: widgetSidebarToggleButtonPosition,
    breadcrumb: widgetBreadcrumbButtonPosition,
    globalSearch: widgetGlobalSearchButtonPosition,
    preferences: appPreferencesButtonPosition,
    themeToggle: widgetThemeToggleButtonPosition,
    languageToggle: widgetLanguageToggleButtonPosition,
    timezone: widgetTimezoneButtonPosition,
    fullscreen: widgetFullscreenButtonPosition,
    refresh: widgetRefreshButtonPosition,
    notification: widgetNotificationButtonPosition,
    lockScreenBtn: widgetLockScreenButtonPosition,
    logoutBtn: widgetLogoutButtonPosition,
    userDropdown: widgetUserDropdownButtonPosition,
    tenantSelector: widgetTenantSelectorButtonPosition,
  } as Record<string, any>;
}

function resolvePositionItems(key: string) {
  if (key === 'preferences') return preferencesPositionItems.value;
  if (sidebarAndHeaderOnlyKeys.has(key))
    return sidebarHeaderOnlyPositionItems.value;
  if (headerOnlyKeys.has(key)) return headerOnlyPositionItems.value;
  return undefined;
}

const draggableItems = computed(() =>
  (widgetOrder.value ?? []).map((key) => ({
    key,
    label: $t(labelMap[key] ?? key),
    position: getPosition(key),
    positionItems: resolvePositionItems(key),
  })),
);

function getPosition(key: string) {
  const raw = getModelMap()[key]?.value ?? 'none';
  if (key !== 'preferences' && raw === 'header') {
    return 'header-right';
  }
  return raw;
}

function handleUpdateOrder(keys: string[]) {
  widgetOrder.value = keys;
}

function handleUpdatePosition(key: string, position: string) {
  const model = getModelMap()[key];
  if (model) {
    model.value = position;
  }
}
</script>

<template>
  <DraggableList
    :items="draggableItems"
    :position-items="buttonPositionItems"
    @update-order="handleUpdateOrder"
    @update-position="handleUpdatePosition"
  />
</template>
