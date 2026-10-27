import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@operon/constants';
import { preferences } from '@operon/preferences';
import { useAccessStore, useUserStore } from '@operon/stores';
import { startProgress, stopProgress } from '@operon/utils';

import {
  isJwtTokenExpired,
  setSupabaseUnauthorizedHandler,
  tryRefreshSupabaseToken,
} from '#/api';
import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';
import { sanitizeRedirectPath } from '#/utils/security';

import { generateAccess } from './access';

/**
 * Common router guards configuration
 * @param router
 */
function setupCommonGuard(router: Router) {
  // Track loaded page paths
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // Page loading progress bar
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // Record page as loaded to avoid repeating entry animations
    loadedPaths.add(to.path);

    // Stop page loading progress bar
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * Access control router guard configuration
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // If an accessToken exists but its JWT exp has passed, attempt silent refresh first
    if (accessStore.accessToken && isJwtTokenExpired(accessStore.accessToken)) {
      const refreshedToken = await tryRefreshSupabaseToken();
      if (!refreshedToken) {
        const mode = await authStore.handleSessionExpired();
        if (mode === 'modal') {
          return false;
        }
      }
    }

    // Core routes bypass access interceptor
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        const rawRedirect = to.query?.redirect as string | undefined;
        const defaultHome =
          userStore.userInfo?.homePath || preferences.app.defaultHomePath;
        const redirectTarget = rawRedirect
          ? sanitizeRedirectPath(rawRedirect, defaultHome)
          : defaultHome;
        return redirectTarget;
      }
      return true;
    }

    // Check accessToken
    if (!accessStore.accessToken) {
      // Explicitly allowed without access authentication
      if (to.meta.ignoreAccess) {
        return true;
      }

      if (
        preferences.app.loginExpiredMode === 'modal' &&
        accessStore.isAccessChecked
      ) {
        accessStore.setLoginExpired(true);
        return false;
      }

      // Unauthorized: redirect to login page
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // Omit redirect query if navigating to default home
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // Retain intended target to redirect after login
          replace: true,
        };
      }
      return to;
    }

    // Check if dynamic routes have already been generated
    if (accessStore.isAccessChecked) {
      return true;
    }

    // Generate route table with user roles
    let userInfo = userStore.userInfo;
    if (!userInfo) {
      try {
        userInfo = await authStore.fetchUserInfo();
      } catch {
        await authStore.logout(false);
        return { path: LOGIN_PATH, replace: true };
      }
    }
    const userRoles = userInfo.roles ?? [];

    // Generate accessible menus and routes
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // Routes displayed in menu but redirected to 403 on access if forbidden
      routes: accessRoutes,
    });

    // Save accessible menus and routes
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    let redirectPath = (
      to.path === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath
    ) as string;

    if (from.query?.redirect) {
      try {
        const fromRedirect = decodeURIComponent(from.query.redirect as string)
          .trim()
          .replace(/^#+/, '');
        if (
          fromRedirect &&
          !fromRedirect.startsWith('/auth/login') &&
          fromRedirect.startsWith('/')
        ) {
          redirectPath = fromRedirect;
        }
      } catch {}
    }

    return {
      ...router.resolve(redirectPath),
      replace: true,
    };
  });
}

/**
 * Project router guards configuration
 * @param router
 */
function createRouterGuard(router: Router) {
  /** Register global 401 / expired JWT handler for Supabase REST client */
  setSupabaseUnauthorizedHandler(async () => {
    await useAuthStore().handleSessionExpired();
  });

  /** Common */
  setupCommonGuard(router);
  /** Access control */
  setupAccessGuard(router);
}

export { createRouterGuard };
