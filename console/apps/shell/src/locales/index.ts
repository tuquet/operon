import type { App } from 'vue';

import type {
  LocaleSetupOptions,
  SupportedLanguagesType,
} from '@operon/locales';

import {
  $t,
  setupI18n as coreSetup,
  i18n,
  loadLocalesMapFromDir,
} from '@operon/locales';
import { preferences } from '@operon/preferences';

import dayjs from 'dayjs';

import { captureMessage } from '../utils/bugsink';

const modules = import.meta.glob('./langs/**/*.json');

const localesMap = loadLocalesMapFromDir(
  /\.\/langs\/([^/]+)\/(.*)\.json$/,
  modules,
);

/**
 * Load application-specific locale messages
 * Can also be adapted to fetch translation data from backend
 * @param lang
 */
async function loadMessages(lang: SupportedLanguagesType) {
  const [appLocaleMessages] = await Promise.all([
    localesMap[lang]?.(),
    loadThirdPartyMessage(lang),
  ]);
  return appLocaleMessages?.default;
}

/**
 * Load third-party component library locale messages
 * @param lang
 */
async function loadThirdPartyMessage(lang: SupportedLanguagesType) {
  await loadDayjsLocale(lang);
}

/**
 * Load Day.js locale
 * @param lang
 */
async function loadDayjsLocale(lang: SupportedLanguagesType) {
  const locale =
    lang === 'vi-VN'
      ? await import('dayjs/locale/vi')
      : await import('dayjs/locale/en');
  if (locale) {
    dayjs.locale(locale);
  }
}

async function setupI18n(app: App, options: LocaleSetupOptions = {}) {
  await coreSetup(app, {
    defaultLocale: preferences.app.locale,
    loadMessages,
    missingWarn: !import.meta.env.PROD,
    ...options,
  });

  // Report unresolved i18n keys to telemetry instead of only warning in the console:
  // a missing key renders an empty string, which looks like a UI bug with no signal.
  i18n.global.setMissingHandler((locale: string, key: string) => {
    // Only namespaced keys (e.g. `page.secrets.title`) are real dictionary lookups.
    // Bare labels passed through `$t` by third-party components (e.g. `Version`,
    // `Total`) are NOT dictionary keys — reporting them floods telemetry with noise.
    if (!key.includes('.')) {
      return;
    }
    if (!import.meta.env.PROD) {
      console.warn(
        `[intlify] Not found '${key}' key in '${locale}' locale messages.`,
      );
    }
    captureMessage(`[i18n] missing key: ${key}`, 'warning', { key, locale });
  });
}

export { $t, setupI18n };
