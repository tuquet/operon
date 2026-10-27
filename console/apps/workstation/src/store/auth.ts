import type { Recordable, UserInfo } from '@operon/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@operon/constants';
import { preferences } from '@operon/preferences';
import {
  resetAllStores,
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@operon/stores';

import { toast } from '@operon-core/shadcn-ui';

import { defineStore } from 'pinia';

import { clearAccessCache, getAccessCodes, getCurrentUser, login } from '#/api';
import { $t } from '#/locales';
import { router as appRouter } from '#/router';
import { captureError, setBugsinkUser } from '#/utils/bugsink';
import { sanitizeRedirectPath } from '#/utils/security';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const tabbarStore = useTabbarStore();
  const router = useRouter() || appRouter;

  const loginLoading = ref(false);

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
        accessStore.setAccessToken(accessToken);
        if (refreshToken) {
          accessStore.setRefreshToken(refreshToken);
        }

        // Fetch user info and store into accessStore
        const [fetchUserInfoResult, accessCodes] = await Promise.all([
          fetchUserInfo(),
          getAccessCodes(),
        ]);

        userInfo = fetchUserInfoResult;

        userStore.setUserInfo(userInfo);
        setBugsinkUser(userInfo);
        accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
          // Reload current route view so tables/metrics re-fetch with the new token
          await tabbarStore.refresh(router);
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
      await logout();
    } catch {
      // Ignore network errors on logout
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    // On the login page the current route is the login page itself, so carrying it as
    // `redirect` would nest one more encoded layer on every repeat.
    const currentRoute = router.currentRoute.value;
    const alreadyOnLogin = currentRoute.path === LOGIN_PATH;

    // Redirect to login page carrying previous target route if applicable
    await router.replace({
      path: LOGIN_PATH,
      query:
        redirect && !alreadyOnLogin
          ? { redirect: encodeURIComponent(currentRoute.fullPath) }
          : {},
    });
  }

  /**
   * Single canonical handler when both accessToken and refreshToken are expired/invalid.
   * Respects `preferences.app.loginExpiredMode` ('modal' vs 'page').
   */
  async function handleSessionExpired(): Promise<'modal' | 'redirect'> {
    clearAccessCache();
    setBugsinkUser(null);
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);

    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
      return 'modal';
    }

    toast.warning($t('authentication.loginAgainTitle'), {
      description: $t('authentication.loginAgainSubTitle'),
      duration: 4000,
    });

    await logout(true);
    return 'redirect';
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
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    handleSessionExpired,
    loginLoading,
    logout,
  };
});
