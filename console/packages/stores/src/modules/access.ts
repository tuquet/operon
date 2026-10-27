import type { RouteRecordRaw } from 'vue-router';

import type { MenuRecordRaw } from '@operon-core/typings';

import { acceptHMRUpdate, defineStore } from 'pinia';

type AccessToken = null | string;

interface AccessState {
  /**
   * Permission codes
   */
  accessCodes: string[];
  /**
   * Accessible menu list
   */
  accessMenus: MenuRecordRaw[];
  /**
   * Accessible route list
   */
  accessRoutes: RouteRecordRaw[];
  /**
   * Authentication accessToken
   */
  accessToken: AccessToken;
  /**
   * Whether access permissions have been verified
   */
  isAccessChecked: boolean;
  /**
   * Screen lock status
   */
  isLockScreen: boolean;
  /**
   * Screen lock password
   */
  lockScreenPassword?: string;
  /**
   * Whether session has expired
   */
  loginExpired: boolean;
  /**
   * Authentication refreshToken
   */
  refreshToken: AccessToken;
}

/**
 * Access control store
 */
export const useAccessStore = defineStore('core-access', {
  actions: {
    getMenuByPath(path: string) {
      function findMenu(
        menus: MenuRecordRaw[],
        path: string,
      ): MenuRecordRaw | undefined {
        for (const menu of menus) {
          if (menu.path === path) {
            return menu;
          }
          if (menu.children) {
            const matched = findMenu(menu.children, path);
            if (matched) {
              return matched;
            }
          }
        }
      }
      return findMenu(this.accessMenus, path);
    },
    lockScreen(password: string) {
      this.isLockScreen = true;
      this.lockScreenPassword = password;
    },
    setAccessCodes(codes: string[]) {
      this.accessCodes = codes;
    },
    setAccessMenus(menus: MenuRecordRaw[]) {
      this.accessMenus = menus;
    },
    setAccessRoutes(routes: RouteRecordRaw[]) {
      this.accessRoutes = routes;
    },
    setAccessToken(token: AccessToken) {
      this.accessToken = token;
    },
    setIsAccessChecked(isAccessChecked: boolean) {
      this.isAccessChecked = isAccessChecked;
    },
    setLoginExpired(loginExpired: boolean) {
      this.loginExpired = loginExpired;
    },
    setRefreshToken(token: AccessToken) {
      this.refreshToken = token;
    },
    unlockScreen() {
      this.isLockScreen = false;
      this.lockScreenPassword = undefined;
    },
  },
  persist: {
    // Persistence
    pick: [
      'accessToken',
      'refreshToken',
      'accessCodes',
      'isLockScreen',
      'lockScreenPassword',
    ],
  },
  state: (): AccessState => ({
    accessCodes: [],
    accessMenus: [],
    accessRoutes: [],
    accessToken: null,
    isAccessChecked: false,
    isLockScreen: false,
    lockScreenPassword: undefined,
    loginExpired: false,
    refreshToken: null,
  }),
});

// Hot module replacement (HMR) support
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useAccessStore, hot));
}
