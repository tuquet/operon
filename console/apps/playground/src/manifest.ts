import type { RouteRecordRaw } from 'vue-router';

import { setupAppLocales } from './locales';

/**
 * Manifest definitions for @operon/playground
 */
export const playgroundManifest = {
  id: 'playground',
  name: 'Playground',
  defaultPath: 'overview',
  setupLocales: setupAppLocales,
  routes(t: (key: string) => string): RouteRecordRaw[] {
    return [
      {
        name: 'PlaygroundOverview',
        path: 'overview',
        component: () => import('./views/overview.vue'),
        meta: {
          authority: ['superadmin', 'local_operator'],
          icon: 'lucide:layers',
          plugin: 'operon',
          title: t('page.playground.overview'),
        },
      },
      {
        name: 'PlaygroundTasks',
        path: 'tasks',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'local_operator'],
          icon: 'lucide:list-todo',
          plugin: 'operon',
          title: t('page.playground.tasks'),
        },
      },
    ];
  },
};
