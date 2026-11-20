import type { Router, RouteRecordRaw } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@operon/types';

import { generateAccessible } from '@operon/access';
import { DEFAULT_HOME_PATH } from '@operon/constants';
import { preferences } from '@operon/preferences';
import { useAccessStore, useUserStore } from '@operon/stores';

import { toast } from '@operon-core/shadcn-ui';

import { getAllMenusApi } from '#/api';
import { listInstalledPlugins } from '#/api/core/access';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import { getPlatform } from '#/utils/platform';

import { filterRoutesByPlatform } from './platform-gate';
import { filterRoutesByPlugins } from './plugin-gate';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

function filterRoutesByCloudAuth(
  routes: RouteRecordRaw[],
  isAuthenticated: boolean,
): RouteRecordRaw[] {
  if (isAuthenticated) {
    return routes;
  }
  return routes
    .filter(
      (route) =>
        !(route.meta as undefined | { requiresCloud?: boolean })?.requiresCloud,
    )
    .map((route) => {
      if (Array.isArray(route.children) && route.children.length > 0) {
        const filteredChildren = filterRoutesByCloudAuth(
          route.children,
          isAuthenticated,
        );
        return {
          ...route,
          children: filteredChildren,
        };
      }
      return route;
    })
    .filter(
      (route) =>
        !Array.isArray(route.children) ||
        route.children.length > 0 ||
        Boolean(route.component),
    );
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const platform = getPlatform();
  const accessStore = useAccessStore();
  const isAuthenticated = Boolean(accessStore.accessToken);

  // Canonical plugins: both Desktop and Web operate with daemon; always include operon + vault
  let installedPlugins: string[] = ['identity', 'operon', 'vault'];

  try {
    const fetched = await listInstalledPlugins();
    if (fetched && fetched.length > 0) {
      installedPlugins = [...new Set([...installedPlugins, ...fetched])];
    }
  } catch (error) {
    console.warn(
      `Failed to load installed plugins from cloud, defaulting to [${installedPlugins.join(', ')}]:`,
      error,
    );
  }

  // 1. Filter route tree by active platform (desktop vs web)
  const platformFilteredRoutes = filterRoutesByPlatform(
    options.routes,
    platform,
  );

  // 2. Filter out cloud-only routes when unauthenticated (both platforms)
  const authFilteredRoutes = filterRoutesByCloudAuth(
    platformFilteredRoutes,
    isAuthenticated,
  );

  // 3. Filter remaining routes by installed plugins
  const filteredRoutes = filterRoutesByPlugins(
    authFilteredRoutes,
    installedPlugins,
  );

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    routes: filteredRoutes,
    fetchMenuListAsync: async () => {
      toast.loading(`${$t('common.loadingMenu')}...`, {
        duration: 1500,
      });
      return await getAllMenusApi();
    },
    // Specify component for unauthorized access (403 Forbidden)
    forbiddenComponent,
    // Fallback layout when route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

/**
 * Initialize a local-first operator session and register accessible routes/menus.
 */
async function bootstrapLocalOperatorSession(
  router: Router,
  routes: RouteRecordRaw[],
) {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  if (!userStore.userInfo) {
    userStore.setUserInfo({
      avatar: preferences.app.defaultAvatar || '',
      homePath: preferences.app.defaultHomePath || DEFAULT_HOME_PATH,
      realName: 'Local Operator',
      roles: ['local_operator'],
      userId: 'local-operator',
      username: 'operator',
    });
  }

  const { accessibleMenus, accessibleRoutes } = await generateAccess({
    roles: ['local_operator'],
    router,
    routes,
  });
  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(accessibleRoutes);
  accessStore.setIsAccessChecked(true);
}

export { bootstrapLocalOperatorSession, generateAccess };
