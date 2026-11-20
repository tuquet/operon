import type { SupportedLanguagesType } from '@operon-core/typings';

export type { SupportedLanguagesType };

export type ImportLocaleFn = () => Promise<{
  default: Record<string, any>;
}>;

export type LoadMessageFn = (
  lang: SupportedLanguagesType,
) => Promise<Record<string, any> | undefined>;

export interface LocaleSetupOptions {
  /**
   * Default language
   * @default zh-CN
   */
  defaultLocale?: SupportedLanguagesType;
  /**
   * Load message function
   * @param lang
   * @returns
   */
  loadMessages?: LoadMessageFn;
  /**
   * Whether to warn when the key is not found
   */
  missingWarn?: boolean;
}
