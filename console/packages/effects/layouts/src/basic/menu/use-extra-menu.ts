import type { ComputedRef } from 'vue';

import type { MenuRecordRaw } from '@operon/types';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { preferences } from '@operon/preferences';
import { useAccessStore } from '@operon/stores';
import { findRootMenuByPath } from '@operon/utils';

import { useNavigation } from './use-navigation';

function useExtraMenu(useRootMenus?: ComputedRef<MenuRecordRaw[]>) {
  const accessStore = useAccessStore();
  const { navigation, willOpenedByWindow } = useNavigation();

  const menus = computed(() => useRootMenus?.value ?? accessStore.accessMenus);

  /** Track which sub-menu was last activated under current top-level menu */
  const defaultSubMap = new Map<string, string>();
  const extraRootMenus = ref<MenuRecordRaw[]>([]);
  const route = useRoute();
  const extraMenus = ref<MenuRecordRaw[]>([]);
  const sidebarExtraVisible = ref<boolean>(false);
  const extraActiveMenu = ref('');
  const parentLevel = computed(() =>
    preferences.app.layout === 'header-mixed-nav' ? 1 : 0,
  );

  /**
   * Mixed menu select event handler
   * @param menu
   */
  const handleMixedMenuSelect = async (menu: MenuRecordRaw) => {
    const _extraMenus = menu?.children ?? [];
    const hasChildren = _extraMenus.length > 0;

    if (!willOpenedByWindow(menu.path)) {
      extraMenus.value = _extraMenus ?? [];
      extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;
      sidebarExtraVisible.value = hasChildren;
    }

    if (!hasChildren) {
      await navigation(menu.path);
    } else if (preferences.sidebar.autoActivateChild) {
      await navigation(
        defaultSubMap.has(menu.path)
          ? (defaultSubMap.get(menu.path) as string)
          : menu.path,
      );
    }
  };

  /**
   * Default menu select event handler
   * @param menu
   * @param rootMenu
   */
  const handleDefaultSelect = async (
    menu: MenuRecordRaw,
    rootMenu?: MenuRecordRaw,
  ) => {
    extraMenus.value = rootMenu?.children ?? extraRootMenus.value ?? [];
    extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;

    if (preferences.sidebar.expandOnHover) {
      sidebarExtraVisible.value = extraMenus.value.length > 0;
    }
  };

  /**
   * Resolve top-level menu corresponding to current path.
   * When default child route path is '' (e.g. /cards), parent/child share the same path; findMenuByPath hits
   * top menu first. Without parents, rootMenu resolution would fail and leave secondary menu empty.
   */
  function resolveRootMenu(currentPath: string, level = 0) {
    const { findMenu, rootMenu, rootMenuPath } = findRootMenuByPath(
      menus.value,
      currentPath,
      level,
    );
    const resolved =
      rootMenu ?? menus.value.find((item) => item.path === currentPath);
    return {
      findMenu,
      rootMenu: resolved,
      rootMenuPath: rootMenuPath ?? resolved?.path,
    };
  }

  /**
   * Sidebar menu mouse leave event handler
   */
  const handleSideMouseLeave = () => {
    if (preferences.sidebar.expandOnHover) {
      return;
    }

    const { findMenu, rootMenu, rootMenuPath } = resolveRootMenu(
      route.meta?.activePath || route.path,
    );
    extraActiveMenu.value = rootMenuPath ?? findMenu?.path ?? '';
    extraMenus.value = rootMenu?.children ?? [];
  };

  const handleMenuMouseEnter = (menu: MenuRecordRaw) => {
    if (!preferences.sidebar.expandOnHover) {
      const { findMenu } = findRootMenuByPath(menus.value, menu.path);
      extraMenus.value = findMenu?.children ?? [];
      extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;
      sidebarExtraVisible.value = extraMenus.value.length > 0;
    }
  };

  function calcExtraMenus(path: string) {
    const currentPath = route.meta?.activePath || path;
    const { findMenu, rootMenu, rootMenuPath } = resolveRootMenu(
      currentPath,
      parentLevel.value,
    );
    extraRootMenus.value = rootMenu?.children ?? [];
    if (rootMenuPath) defaultSubMap.set(rootMenuPath, currentPath);
    extraActiveMenu.value = rootMenuPath ?? findMenu?.path ?? '';
    extraMenus.value = rootMenu?.children ?? [];
    sidebarExtraVisible.value = extraMenus.value.length > 0;
  }

  // On hover, layout-sidebar sets sidebarExtraVisible to true; collapse if no secondary menu
  // to prevent an empty panel from obscuring main content
  watch([sidebarExtraVisible, extraMenus], ([visible, items]) => {
    if (visible && items.length === 0) {
      sidebarExtraVisible.value = false;
    }
  });

  watch(
    () =>
      [
        route.path,
        preferences.app.layout,
        preferences.sidebar.expandOnHover,
        menus.value,
      ] as const,
    ([path]) => {
      calcExtraMenus(path || '');
    },
    { immediate: true },
  );

  return {
    extraActiveMenu,
    extraMenus,
    handleDefaultSelect,
    handleMenuMouseEnter,
    handleMixedMenuSelect,
    handleSideMouseLeave,
    sidebarExtraVisible,
  };
}

export { useExtraMenu };
