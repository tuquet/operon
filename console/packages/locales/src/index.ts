import {
  i18n,
  loadLocaleMessages,
  loadLocalesMap,
  loadLocalesMapFromDir,
  registerLocaleMessages,
  resetRegisteredLocaleMessages,
  setupI18n,
} from './i18n';

const $t = i18n.global.t;
const $te = i18n.global.te;

export {
  createMicroAppLocales,
  type CreateMicroAppLocalesOptions,
} from './micro-app';
export {
  $t,
  $te,
  i18n,
  loadLocaleMessages,
  loadLocalesMap,
  loadLocalesMapFromDir,
  registerLocaleMessages,
  resetRegisteredLocaleMessages,
  setupI18n,
};
export {
  type ImportLocaleFn,
  type LoadMessageFn,
  type LocaleSetupOptions,
  type SupportedLanguagesType,
} from './typing';
export type { CompileError } from '@intlify/core-base';

export { useI18n } from 'vue-i18n';

export type { Locale } from 'vue-i18n';
