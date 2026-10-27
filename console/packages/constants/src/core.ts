import type { SupportedLanguagesType } from '@operon-core/typings';

/**
 * Login page URL path
 */
export const LOGIN_PATH = '/auth/login';

/**
 * Universal sentinel value for "All" filter options across VbenForm / VxeGrid selects
 */
export const FILTER_ALL = 'all' as const;
export type FilterAll = typeof FILTER_ALL;
export type WithFilterAll<T extends string> = FilterAll | T;

/**
 * Language option; value defaults to string to support registering custom languages at runtime (see setSupportLanguages)
 */
export interface LanguageOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

/**
 * Supported languages (default values, can be overridden at runtime via setSupportLanguages).
 * value is constrained to SupportedLanguagesType. When the app extends languages via module augmentation,
 * the default list also accepts new languages, and typos will result in compile-time errors.
 */
export const SUPPORT_LANGUAGES: LanguageOption<SupportedLanguagesType>[] = [
  {
    label: 'English',
    value: 'en-US',
  },
  {
    label: 'Tiếng Việt',
    value: 'vi-VN',
  },
];

// --- Dynamic Language List Management ---
type LanguageListListener = (languages: LanguageOption[]) => void;

// Deep clone language list so external consumers always receive an independent snapshot,
// avoiding bypassing setSupportLanguages to directly mutate internal registry state.
function cloneLanguages(languages: LanguageOption[]): LanguageOption[] {
  return languages.map((language) => ({ ...language }));
}

let currentLanguages: LanguageOption[] = cloneLanguages(SUPPORT_LANGUAGES);
const listeners: LanguageListListener[] = [];

/**
 * Get current dynamic language list
 */
export function getSupportLanguages(): LanguageOption[] {
  return cloneLanguages(currentLanguages);
}

/**
 * Update language list and notify all listeners
 */
export function setSupportLanguages(languages: LanguageOption[]) {
  // Solidify this snapshot first so that even if a listener callback makes a nested call to setSupportLanguages,
  // subsequent listeners still receive this update's list.
  const nextLanguages = cloneLanguages(languages);
  currentLanguages = nextLanguages;
  // Iterate listener snapshot to prevent listeners unsubscribing during callback from skipping subsequent listeners.
  for (const listener of [...listeners]) {
    listener(cloneLanguages(nextLanguages));
  }
}

/**
 * Subscribe to language list changes, returning an unsubscribe function
 */
export function onSupportLanguagesChange(listener: LanguageListListener) {
  listeners.push(listener);
  // Immediately invoke with current value upon subscription for consumer initialization
  listener(cloneLanguages(currentLanguages));
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}
