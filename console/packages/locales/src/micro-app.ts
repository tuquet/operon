import type { App } from 'vue';

import type { SupportedLanguagesType } from './typing';

import {
  loadLocalesMapFromDir,
  registerLocaleMessages,
  setupI18n,
} from './i18n';

export interface CreateMicroAppLocalesOptions {
  getDefaultLocale?: () => SupportedLanguagesType;
}

/**
 * Creates scoped `setupAppLocales` and `setupStandaloneI18n` helpers for a micro-app
 * from its local `import.meta.glob('./langs/**\/*.json')` module map.
 */
export function createMicroAppLocales(
  appId: string,
  modules: Record<string, () => Promise<unknown>>,
  options?: CreateMicroAppLocalesOptions,
) {
  const localesMap = loadLocalesMapFromDir(
    /\.\/langs\/([^/]+)\/(.*)\.json$/,
    modules,
  );

  async function loadMessages(lang: SupportedLanguagesType) {
    const appLocaleMessages = await localesMap[lang]?.();
    return appLocaleMessages?.default;
  }

  async function setupAppLocales() {
    await registerLocaleMessages(appId, loadMessages);
  }

  async function setupStandaloneI18n(app: App) {
    await setupI18n(app, {
      defaultLocale: options?.getDefaultLocale?.(),
      loadMessages,
      missingWarn: !import.meta.env.PROD,
    });
  }

  return {
    setupAppLocales,
    setupStandaloneI18n,
  };
}
