import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

/**
 * Secret Store routes — the module group mirrors the plugin/schema id (`secrets`) and the
 * child segment mirrors the table (`secrets.credentials`), exactly like
 * `/automation/workflows` (plugin `automation` → table `automation.workflows`).
 * See docs/en/console/specs/SPEC-core-route-foundation.md §5.1 and SPEC-secret-store.
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:key-round',
      order: 40,
      title: $t('page.secrets.title'),
    },
    name: 'Secrets',
    path: '/secrets',
    redirect: '/secrets/credentials',
    children: [
      {
        name: 'SecretsCredentials',
        path: 'credentials',
        component: () => import('#/views/secrets/credentials/index.vue'),
        meta: {
          authority: ['superadmin', 'secrets:credentials:read'],
          icon: 'lucide:key-round',
          plugin: 'secrets',
          title: $t('page.secrets.credentials'),
        },
      },
    ],
  },
];

export default routes;
