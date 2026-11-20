import { $t } from '@operon/locales';
import { initPreferences, updatePreferences } from '@operon/preferences';
import { unmountGlobalLoading } from '@operon/utils';

import { initDesktopLoggingAndShortcuts } from './adapter/desktop';
import {
  overridesPreferences,
  typographyPreferencesExtension,
} from './preferences';
import {
  captureError,
  captureMessage,
  initEarlyErrorInterception,
} from './utils/bugsink';
import { assertValidEnvironment } from './utils/env-validator';

// Early intercept all unhandled promise rejections and global runtime/resource errors
if (typeof window !== 'undefined') {
  initEarlyErrorInterception();
  initDesktopLoggingAndShortcuts();

  // Auto-reload on stale chunk failures after new deployments with telemetry and reload loop protection
  window.addEventListener('vite:preloadError', (event: any) => {
    event.preventDefault();
    try {
      const targetUrl =
        event?.payload?.url || event?.target?.src || window.location.href;
      captureMessage(
        `Vite preload chunk failure: ${event?.payload?.message || event?.message || 'dynamic chunk load failed'}`,
        'warning',
        {
          phase: 'vite_preload_error',
          target_url: targetUrl,
        },
      );
    } catch {
      // Fail-safe
    }

    const lastReloadKey = 'opn:last_preload_reload';
    const lastReload = sessionStorage.getItem(lastReloadKey);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10_000) {
      sessionStorage.setItem(lastReloadKey, String(now));
      window.location.reload();
    }
  });
}

/**
 * Mount and render pages after application initialization finishes
 */
async function initApplication() {
  // Fast-Fail validation of required environment configuration before any modules load
  assertValidEnvironment();

  // Unique namespace identifier for app preferences, storage key prefix, and isolated data
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  try {
    // Initialize app preferences with typography extension
    await initPreferences({
      extension: typographyPreferencesExtension,
      namespace,
      overrides: overridesPreferences,
    });
    if (overridesPreferences.app) {
      updatePreferences({
        app: {
          enableRefreshToken: overridesPreferences.app.enableRefreshToken,
          loginExpiredMode: overridesPreferences.app.loginExpiredMode,
        },
      });
    }

    // Bootstrap and mount Vue application logic and views
    const { bootstrap } = await import('./bootstrap');
    await bootstrap(namespace);
  } catch (error) {
    console.error('[Admin] Failed to initialize application:', error);
    try {
      captureError(error, { phase: 'application_bootstrap' });
    } catch {
      // ignore
    }
    const appEl = document.querySelector('#app');
    if (appEl && !appEl.innerHTML.trim()) {
      appEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:sans-serif;color:#333;text-align:center;">
          <h2 style="font-size:22px;margin-bottom:12px;">${$t('authentication.appLoadErrorTitle')}</h2>
          <p style="color:#666;max-width:480px;margin-bottom:20px;font-size:14px;">${$t('authentication.appLoadErrorDesc')}</p>
          <button onclick="window.location.reload(true)" style="padding:10px 20px;background:#09090b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">
            ${$t('authentication.appReloadBtn')}
          </button>
        </div>
      `;
    }
  } finally {
    // Remove and unmount global loading indicator
    unmountGlobalLoading();
  }
}

initApplication();
