import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';

import { createMockKernel, KERNEL_INJECTION_KEY } from '@operon/kernel';
import { initPreferences } from '@operon/preferences';
import '@operon/styles';

import { createPinia } from 'pinia';

import { $t, setupStandaloneI18n } from './locales';
import { playgroundManifest } from './manifest';

export async function bootstrap(namespace = 'operon-playground-dev') {
  await initPreferences({
    namespace,
  });

  const app = createApp({ render: () => h(RouterView) });
  await setupStandaloneI18n(app);

  const pinia = createPinia();
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        component: { render: () => h(RouterView) },
        redirect: `/${playgroundManifest.defaultPath}`,
        children: playgroundManifest.routes($t),
      },
    ],
  });

  const mockKernel = createMockKernel();
  app.provide(KERNEL_INJECTION_KEY, mockKernel);

  app.use(pinia);
  app.use(router);
  await router.isReady();
  app.mount('#app');
}
