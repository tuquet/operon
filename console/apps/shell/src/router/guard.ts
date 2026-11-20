import type { RouteLocationNormalized, Router } from 'vue-router';

import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@operon/constants';
import { getLocalBridgeStatus } from '@operon/kernel';
import { preferences } from '@operon/preferences';
import { useAccessStore, useUserStore } from '@operon/stores';
import { startProgress, stopProgress } from '@operon/utils';

import { isTauriEnvironment } from '#/adapter/desktop';
import {
  isJwtTokenExpired,
  setSupabaseUnauthorizedHandler,
  tryRefreshSupabaseToken,
} from '#/api';
import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';
import { sanitizeRedirectPath } from '#/utils/security';
import {
  buildWelcomeLocation,
  hasLocalBridgeSeen,
  markLocalBridgeSeen,
  saveWelcomeRedirect,
} from '#/utils/welcome';

import { bootstrapLocalOperatorSession, generateAccess } from './access';

/**
 * Common router guards configuration
 * @param router
 */
function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);

    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

function resolveRouteWithFallback(
  router: Router,
  targetPath: string,
  fallbackPath: string,
) {
  let resolved = router.resolve(targetPath);
  if (resolved.name === 'FallbackNotFound' || resolved.matched.length === 0) {
    resolved = router.resolve(fallbackPath);
  }
  return { ...resolved, replace: true };
}

function requiresCloudAccess(to: RouteLocationNormalized): boolean {
  return Boolean(
    (to.meta as undefined | { requiresCloud?: boolean })?.requiresCloud ||
    to.matched.some(
      (record) =>
        (record.meta as undefined | { requiresCloud?: boolean })?.requiresCloud,
    ),
  );
}

function handleCoreRouteNavigation(to: RouteLocationNormalized) {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  if (to.path === LOGIN_PATH && accessStore.accessToken) {
    const rawRedirect = to.query?.redirect as string | undefined;
    const defaultHome =
      userStore.userInfo?.homePath || preferences.app.defaultHomePath;
    return sanitizeRedirectPath(rawRedirect, defaultHome);
  }
  return true;
}

async function handleUnauthenticatedNavigation(
  to: RouteLocationNormalized,
  router: Router,
) {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  if (!accessStore.isAccessChecked) {
    await bootstrapLocalOperatorSession(router, accessRoutes);
    const fallbackHome =
      userStore.userInfo?.homePath ||
      preferences.app.defaultHomePath ||
      DEFAULT_HOME_PATH;
    let targetPath = to.fullPath;
    if (to.path === '/' || to.path === LOGIN_PATH) {
      targetPath = fallbackHome;
    }
    return resolveRouteWithFallback(router, targetPath, fallbackHome);
  }

  return true;
}

function resolvePostAuthRedirect(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  defaultHomePath: string,
): string {
  let redirectPath = (
    to.path === preferences.app.defaultHomePath ? defaultHomePath : to.fullPath
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
    } catch {
      // Ignore malformed redirect query parameter
    }
  }

  return redirectPath;
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

    // Attempt silent refresh first if an existing JWT accessToken is expired
    if (accessStore.accessToken && isJwtTokenExpired(accessStore.accessToken)) {
      const refreshedToken = await tryRefreshSupabaseToken();
      if (!refreshedToken) {
        const mode = await authStore.handleSessionExpired();
        if (mode === 'modal') {
          return false;
        }
      }
    }

    const bridgeStatus = getLocalBridgeStatus();
    if (bridgeStatus === 'healthy') {
      markLocalBridgeSeen();
    }

    // Redirect first-time Web/PWA visitors to standalone Welcome when local Operon is offline
    const isWelcomeExempt =
      to.path === '/welcome' || to.path.startsWith('/auth');
    if (
      !isTauriEnvironment() &&
      !isWelcomeExempt &&
      bridgeStatus === 'offline' &&
      !hasLocalBridgeSeen()
    ) {
      saveWelcomeRedirect(to.fullPath);
      return buildWelcomeLocation(to.fullPath);
    }

    // Core routes bypass access interceptor
    if (coreRouteNames.includes(to.name as string)) {
      return handleCoreRouteNavigation(to);
    }

    if (!accessStore.accessToken) {
      if (to.meta.ignoreAccess) {
        return true;
      }
      if (requiresCloudAccess(to)) {
        authStore.setPendingRedirect(to.fullPath);
        accessStore.setLoginExpired(true);
        return false;
      }
      return handleUnauthenticatedNavigation(to, router);
    }

    if (accessStore.isAccessChecked) {
      return true;
    }

    // Generate route table with authenticated user roles
    let userInfo = userStore.userInfo;
    if (!userInfo) {
      try {
        userInfo = await authStore.fetchUserInfo();
      } catch {
        await authStore.logout(false);
        return true;
      }
    }

    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userInfo.roles ?? [],
      router,
      routes: accessRoutes,
    });

    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    const fallbackHome =
      userInfo.homePath || preferences.app.defaultHomePath || DEFAULT_HOME_PATH;
    const redirectPath = resolvePostAuthRedirect(to, from, fallbackHome);

    return resolveRouteWithFallback(router, redirectPath, fallbackHome);
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

  setupCommonGuard(router);
  setupAccessGuard(router);
}

export { createRouterGuard };
