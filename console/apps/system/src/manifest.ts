import type { RouteRecordRaw } from 'vue-router';

import { setupAppLocales } from './locales';

/** Routes are shared by standalone development and the host shell. */
export const systemManifest = {
  id: 'system',
  defaultPath: 'overview',
  setupLocales: setupAppLocales,
  routes(t: (key: string) => string): RouteRecordRaw[] {
    return [
      {
        name: 'SystemOverview',
        props: { tab: 'overview' },
        path: 'overview',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'plugins:read'],
          icon: 'lucide:activity',
          plugin: 'identity',
          title: t('page.system.overview'),
        },
      },
      {
        name: 'SystemPlugins',
        props: { tab: 'plugins' },
        path: 'plugins',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'plugins:read'],
          icon: 'lucide:puzzle',
          plugin: 'identity',
          title: t('page.system.plugins'),
        },
      },
      {
        name: 'SystemUsers',
        props: { tab: 'users' },
        path: 'users',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin'],
          icon: 'lucide:users',
          plugin: 'identity',
          title: t('page.system.users'),
        },
      },
      {
        name: 'SystemAuditLogs',
        props: { tab: 'audit' },
        path: 'audit-logs',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin'],
          icon: 'lucide:scroll-text',
          plugin: 'identity',
          title: t('page.system.auditLogs'),
        },
      },
      {
        name: 'SystemRoles',
        props: { tab: 'roles' },
        path: 'roles',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin'],
          icon: 'lucide:key-round',
          plugin: 'identity',
          title: t('page.system.roles'),
        },
      },
    ];
  },
};
