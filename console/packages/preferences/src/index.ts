import type {
  CustomPreferencesRecord,
  Preferences,
  PreferencesExtension,
} from '@operon-core/preferences';
import type { DeepPartial } from '@operon-core/typings';

/**
 * If you want all apps to use the same default preferences, you can define them here
 * instead of modifying the default preferences in @operon-core/preferences.
 * @param preferences
 * @returns
 */

function defineOverridesPreferences(preferences: DeepPartial<Preferences>) {
  return preferences;
}

function definePreferencesExtension<
  TCustomPreferences extends object = CustomPreferencesRecord,
>(extension: PreferencesExtension<TCustomPreferences>) {
  return extension;
}

/** Application copyright preferences for app overrides */
const appCopyrightPreferences = {
  companyName: 'Operon',
  companySiteLink: 'https://operon.com',
  date: '2026',
  enable: true,
  icp: '',
  icpLink: '',
  settingShow: true,
} satisfies DeepPartial<Preferences>['copyright'];

export {
  appCopyrightPreferences,
  defineOverridesPreferences,
  definePreferencesExtension,
};

export * from '@operon-core/preferences';
