import type { Router } from 'vue-router';

import type { Recordable, UserInfo } from '@operon/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@operon/constants';
import { preferences } from '@operon/preferences';
import {
  resetAllStores,
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@operon/stores';

import { toast } from '@operon-core/shadcn-ui';

import { defineStore } from 'pinia';

import {
  clearAccessCache,
  getAccessCodes,
  getCurrentUser,
  login,
  logout as logoutApi,
} from '#/api';
import { $t } from '#/locales';
import { router as appRouter } from '#/router';
import { bootstrapLocalOperatorSession, generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';
import { captureError, setBugsinkUser } from '#/utils/bugsink';
import { sanitizeRedirectPath } from '#/utils/security';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const tabbarStore = useTabbarStore();
  const router = useRouter() || appRouter;

  const loginLoading = ref(false);
  const pendingRedirectPath = ref<null | string>(null);

  function setPendingRedirect(path: null | string) {
    pendingRedirectPath.value = path;
  }

  async function commitSessionTokens(
    accessToken: string,
    refreshToken?: null | string,
  ): Promise<null | UserInfo> {
    accessStore.setAccessToken(accessToken);
    if (refreshToken) {
      accessStore.setRefreshToken(refreshToken);
    }

    const [userInfo, accessCodes] = await Promise.all([
      fetchUserInfo(),
      getAccessCodes(),
    ]);

    if (userInfo) {
      userStore.setUserInfo(userInfo);
      setBugsinkUser(userInfo);
    }
    accessStore.setAccessCodes(accessCodes);
    return userInfo;
  }

  async function completeOAuthSession(options: {
    accessToken: string;
    redirect?: null | string;
    refreshToken?: null | string;
    targetRouter?: Router;
  }): Promise<null | UserInfo> {
    const userInfo = await commitSessionTokens(
      options.accessToken,
      options.refreshToken,
    );

    toast.success($t('authentication.loginSuccessDesc'), {
      description: $t('authentication.githubLoginSuccess'),
      duration: 3000,
    });

    const defaultHome = userInfo?.homePath || preferences.app.defaultHomePath;
    const targetPath = options.redirect
      ? sanitizeRedirectPath(options.redirect, defaultHome)
      : defaultHome;

    await (options.targetRouter || router).push(targetPath);
    return userInfo;
  }

  /**
   * Asynchronously handle the login process
   * @param params Login form parameters
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // Asynchronously handle user login and obtain accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { accessToken, refreshToken } = await login(params);

      // On successful accessToken retrieval
      if (accessToken) {
        userInfo = await commitSessionTokens(accessToken, refreshToken);

        const { accessibleMenus, accessibleRoutes } = await generateAccess({
          roles: userInfo?.roles || ['superadmin'],
          router,
          routes: accessRoutes,
        });
        accessStore.setAccessMenus(accessibleMenus);
        accessStore.setAccessRoutes(accessibleRoutes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
          const nextPath = pendingRedirectPath.value;
          pendingRedirectPath.value = null;
          // Navigate to pending cloud-protected route or refresh current view with new token
          await (nextPath && nextPath !== router.currentRoute.value.fullPath
            ? router.push(sanitizeRedirectPath(nextPath, DEFAULT_HOME_PATH))
            : tabbarStore.refresh(router));
        } else if (onSuccess) {
          await onSuccess?.();
        } else {
          const redirectParam = router.currentRoute.value.query?.redirect as
            | string
            | undefined;
          const defaultHome =
            userInfo?.homePath || preferences.app.defaultHomePath;
          const targetPath = redirectParam
            ? sanitizeRedirectPath(redirectParam, defaultHome)
            : defaultHome;

          await router.push(targetPath);
        }

        if (userInfo?.realName) {
          toast.success($t('authentication.loginSuccess'), {
            description: `${$t('authentication.loginSuccessDesc')}: ${userInfo?.realName}`,
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      captureError(error, {
        action: 'authLogin',
        username: params?.username,
      });
      toast.error($t('authentication.passwordErrorTip'), {
        description:
          error?.message || 'Login failed. Please check your credentials.',
        duration: 4000,
      });
      throw error;
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    clearAccessCache();
    setBugsinkUser(null);
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    await bootstrapLocalOperatorSession(router, accessRoutes);
    const defaultHome = preferences.app.defaultHomePath || DEFAULT_HOME_PATH;
    if (redirect || router.currentRoute.value.path === LOGIN_PATH) {
      await router.replace(defaultHome);
    }
  }

  /**
   * Single canonical handler when both accessToken and refreshToken are expired/invalid.
   * Both Web and Desktop allow unauthenticated sessions; login remains strictly user-initiated.
   */
  async function handleSessionExpired(): Promise<'modal' | 'redirect'> {
    clearAccessCache();
    setBugsinkUser(null);
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);
    return 'modal';
  }

  async function fetchUserInfo() {
    const userInfo = await getCurrentUser();
    userStore.setUserInfo(userInfo);
    setBugsinkUser(userInfo);
    return userInfo;
  }

  function $reset() {
    clearAccessCache();
    setBugsinkUser(null);
    loginLoading.value = false;
    pendingRedirectPath.value = null;
  }

  return {
    $reset,
    authLogin,
    commitSessionTokens,
    completeOAuthSession,
    fetchUserInfo,
    handleSessionExpired,
    loginLoading,
    logout,
    setPendingRedirect,
  };
});
