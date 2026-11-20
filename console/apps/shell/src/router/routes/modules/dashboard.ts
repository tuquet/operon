import type { RouteRecordRaw } from 'vue-router';

import { DEFAULT_HOME_PATH } from '@operon/constants';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      hideChildrenInMenu: true,
      icon: 'lucide:layout-dashboard',
      order: -1,
      platform: 'all',
      plugin: 'identity',
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    redirect: DEFAULT_HOME_PATH,
    children: [
      {
        name: 'Overview',
        path: 'overview',
        component: () => import('#/views/dashboard/overview/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:home',
          title: $t('page.dashboard.overview'),
        },
      },
      {
        name: 'Analytics',
        path: 'analytics',
        component: () => import('#/views/dashboard/analytics/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:area-chart',
          title: $t('page.dashboard.analytics'),
        },
      },
    ],
  },
];

export default routes;
