import type { RouteRecordRaw } from 'vue-router';

import { setupAppLocales } from './locales';

/** Routes are shared by standalone development and the host shell. */
export const automationManifest = {
  id: 'automation',
  defaultPath: 'overview',
  setupLocales: setupAppLocales,
  routes(t: (key: string) => string): RouteRecordRaw[] {
    return [
      {
        name: 'AutomationOverview',
        path: 'overview',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'local_operator'],
          icon: 'lucide:activity',
          plugin: 'operon',
          title: t('page.automation.overview'),
        },
      },
      {
        name: 'AutomationBrowsers',
        path: 'browsers',
        component: () => import('./views/browsers.vue'),
        meta: {
          authority: ['superadmin', 'local_operator'],
          icon: 'lucide:globe',
          plugin: 'operon',
          title: t('page.automation.browsers'),
        },
      },
    ];
  },
};
