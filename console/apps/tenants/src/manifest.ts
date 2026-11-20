import type { RouteRecordRaw } from 'vue-router';

import { setupAppLocales } from './locales';

/** Routes are shared by standalone development and the host shell. */
export const tenantsManifest = {
  id: 'tenants',
  defaultPath: '',
  setupLocales: setupAppLocales,
  routes(t: (key: string) => string): RouteRecordRaw[] {
    return [
      {
        name: 'Tenants',
        path: '',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'tenants:read'],
          icon: 'lucide:building-2',
          title: t('page.tenants.title'),
        },
      },
      {
        name: 'TenantDetail',
        path: ':id',
        component: () => import('./views/detail.vue'),
        meta: {
          authority: ['superadmin', 'tenants:read'],
          hideInMenu: true,
          icon: 'lucide:layout-grid',
          title: t('page.tenants.detail'),
        },
      },
    ];
  },
};
