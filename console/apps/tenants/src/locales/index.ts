import { $t, createMicroAppLocales } from '@operon/locales';
import { preferences } from '@operon/preferences';

export const { setupAppLocales, setupStandaloneI18n } = createMicroAppLocales(
  'tenants',
  import.meta.glob('./langs/**/*.json'),
  { getDefaultLocale: () => preferences.app.locale },
);

export { $t };
