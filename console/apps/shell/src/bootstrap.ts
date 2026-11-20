import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@operon/access';
import { registerLoadingDirective } from '@operon/common-ui/es/loading';
import { preferences } from '@operon/preferences';
import { initStores } from '@operon/stores';
import '@operon/styles';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';
import { addBreadcrumb, initBugsink, setBugsinkTag } from './utils/bugsink';

function registerEnvironmentTelemetry(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const isPwa = window.matchMedia('(display-mode: standalone)').matches;
  setBugsinkTag('pwa', isPwa ? 'true' : 'false');
  setBugsinkTag('screen', `${window.innerWidth}x${window.innerHeight}`);
  setBugsinkTag('online', navigator.onLine ? 'true' : 'false');

  const handleConnectivity = (
    online: boolean,
    level: 'info' | 'warning',
    message: string,
  ) => {
    setBugsinkTag('online', online ? 'true' : 'false');
    addBreadcrumb({ category: 'network', level, message });
  };

  window.addEventListener('online', () =>
    handleConnectivity(true, 'info', 'Browser connection restored (online)'),
  );
  window.addEventListener('offline', () =>
    handleConnectivity(false, 'warning', 'Browser connection lost (offline)'),
  );
}

async function bootstrap(namespace: string) {
  // Initialize component adapter
  await initComponentAdapter();

  // Initialize form components
  await initSetupVbenForm();

  // Set default modal configuration
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // Set default drawer configuration
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // Register v-loading directive
  registerLoadingDirective(app, {
    loading: 'loading', // Customize directive name here or provide false to omit registration
    spinning: 'spinning',
  });

  // Configure Pinia store before router to ensure active Pinia during navigation guards
  await initStores(app, { namespace });

  // Setup internationalization (i18n)
  await setupI18n(app);

  // Configure router and guards
  app.use(router);

  // Initialize Bugsink (Sentry-compatible) error tracking
  initBugsink(app, router);
  registerEnvironmentTelemetry();

  // Register access control directives
  registerAccessDirective(app);

  // Dynamically update document title
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const translatedTitle =
        typeof routeTitle === 'string' ? $t(routeTitle) : '';
      const pageTitle =
        (translatedTitle ? `${translatedTitle} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  await router.isReady();

  app.mount('#app');
}

export { bootstrap };
