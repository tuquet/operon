import { $t, createMicroAppLocales } from '@operon/locales';
import { preferences } from '@operon/preferences';

export const { setupAppLocales, setupStandaloneI18n } = createMicroAppLocales(
  'playground',
  import.meta.glob('./langs/**/*.json'),
  { getDefaultLocale: () => preferences.app.locale },
);

export { $t };
