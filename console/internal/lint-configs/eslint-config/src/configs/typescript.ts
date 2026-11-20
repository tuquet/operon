import type { Linter } from 'eslint';

import { interopDefault } from '../util';

/**
 * @typescript-eslint rules have been migrated to oxlint (typescript plugin).
 * Only the TS parser is kept here for other eslint plugins (perfectionist, n, etc.) to parse TS/TSX files.
 * Since type-aware rules are no longer needed, parserOptions.project has been removed for faster eslint parsing.
 *
 * Note: After removing @typescript-eslint, unused-imports/no-unused-vars falls back to core implementation,
 * which fails to recognize parameters in TS type signatures (causing false positives). Therefore, disable this rule for TS/TSX/Vue,
 * and delegate unused variable checks to oxlint's type-aware no-unused-vars.
 */
export async function typescript(): Promise<Linter.Config[]> {
  const parserTs = await interopDefault(import('@typescript-eslint/parser'));

  return [
    {
      files: ['**/*.?([cm])[jt]s?(x)'],
      languageOptions: {
        parser: parserTs,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ecmaVersion: 'latest',
          extraFileExtensions: ['.vue'],
          jsxPragma: 'React',
          sourceType: 'module',
        },
      },
      rules: {
        'unused-imports/no-unused-vars': 'off',
      },
    },
    {
      // Delegate unused variables in Vue `<script>` to oxlint as well, avoiding core rule false positives on TS type signature params
      files: ['**/*.vue'],
      rules: {
        'unused-imports/no-unused-vars': 'off',
      },
    },
  ];
}
