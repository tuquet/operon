/**
 * Supported languages registry (core default languages).
 *
 * Interface values serve solely as documentation labels; the type system consumes only keys.
 * To extend languages without mutating core, create a d.ts file in the application and augment:
 * Extend via declaration merging:
 *
 * ```ts
 * declare module '@operon-core/typings' {
 *   interface SupportedLanguages {
 *     'zh-TW': 'Traditional Chinese';
 *   }
 * }
 * ```
 *
 * `SupportedLanguagesType` union will automatically include new languages,
 * propagating type constraints across preferences, locales, constants, etc.
 * Register runtime language list via `setSupportLanguages`.
 */
export interface SupportedLanguages {
  'en-US': 'English';
  'vi-VN': 'Tiếng Việt';
  'zh-CN': 'Chinese (Simplified)';
}

/**
 * Supported languages union type
 */
export type SupportedLanguagesType = keyof SupportedLanguages;
