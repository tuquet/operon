import type { RouteRecordRaw } from 'vue-router';

import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@operon/constants';
import { preferences } from '@operon/preferences';

import { $t } from '#/locales';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');
/** Global 404 fallback route */
const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

/** Core fundamental routes */
const coreRoutes: RouteRecordRaw[] = [
  /**
   * Root route
   * Uses BasicLayout as the parent container for all pages so child routes do not need BasicLayout.
   * This route is required and must not be altered.
   */
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    redirect: () => preferences.app.defaultHomePath || DEFAULT_HOME_PATH,
    children: [
      {
        component: () => import('#/views/_core/profile/index.vue'),
        meta: {
          hideInBreadcrumb: true,
          hideInMenu: true,
          icon: 'lucide:user',
          title: $t('page.auth.profile'),
        },
        name: 'Profile',
        path: 'profile',
      },
    ],
  },
  {
    component: () => import('#/views/_core/welcome/index.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: $t('page.welcome.title'),
    },
    name: 'Welcome',
    path: '/welcome',
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: {
          title: $t('page.auth.login'),
        },
      },
      {
        name: 'Register',
        path: 'register',
        component: () => import('#/views/_core/authentication/register.vue'),
        meta: {
          title: $t('page.auth.register'),
        },
      },
      {
        name: 'ForgetPassword',
        path: 'forget-password',
        component: () =>
          import('#/views/_core/authentication/forget-password.vue'),
        meta: {
          title: $t('authentication.forgetPassword'),
        },
      },
      {
        name: 'ResetPassword',
        path: 'reset-password',
        component: () =>
          import('#/views/_core/authentication/reset-password.vue'),
        meta: {
          title: $t('authentication.resetPasswordTitle'),
        },
      },
      {
        name: 'AuthCallback',
        path: 'callback',
        component: () => import('#/views/_core/authentication/callback.vue'),
        meta: {
          title: $t('authentication.githubCallbackTitle'),
        },
      },
      {
        name: 'DesktopBridge',
        path: 'desktop',
        component: () =>
          import('#/views/_core/authentication/desktop-bridge.vue'),
        meta: {
          title: $t('authentication.desktopBridgeTitle'),
        },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
