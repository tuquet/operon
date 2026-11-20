import { defineConfig as defineOxfmtConfig } from 'oxfmt';

type OxfmtConfig = Parameters<typeof defineOxfmtConfig>[0];

/**
 * oxfmt configuration file, see link below
 * https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
 */
const oxfmtConfig: OxfmtConfig = defineOxfmtConfig({
  /**
   * Line width for oxfmt, matching prettier's 80
   * Default：100
   */
  printWidth: 80,
  /**
   * Indent width
   * Default：2
   */
  tabWidth: 2,
  /**
   * Markdown, MDX, and YAML prose wrap formatting
   * type: always | never | preserve
   * Default: preserve
   */
  proseWrap: 'never',
  /**
   * Add semicolons at ends of statements
   * Default：true
   */
  semi: true,
  /**
   * Use single quotes
   * Default：false
   */
  singleQuote: true,
  /**
   * Quote object properties
   * Default：as-needed
   */
  quoteProps: 'as-needed',
  /**
   * Put > of multi-line elements at the end of the last line instead of alone on the next line
   * Default：false
   */
  bracketSameLine: false,
  /**
   * Add spaces inside object literal braces
   * Default：true
   */
  bracketSpacing: true,
  /**
   * Always use parentheses around arrow function parameters
   * type: always | avoid
   * Default：always
   */
  arrowParens: 'always',
  /**
   * Configure package.json sorting (oxfmt does not yet support pnpm-workspace)
   * Currently using eslint with eslint-plugin-pnpm and eslint-plugin-yml for package.json and pnpm-workspace.yaml, but sorting styles slightly differ
   * Default：true
   */
  sortPackageJson: false,
  /**
   * Configure import sorting; currently using eslint-plugin-perfectionist, but oxfmt does not support exports etc.
   * and customGroups does not support ts-equals-import
   * Default：false
   */
  sortImports: false,
  /**
   * Trailing commas in multi-line structures
   * Default：all
   */
  trailingComma: 'all',
  /**
   * End of line format
   * type: lf | crlf | cr
   * Default: lf
   */
  endOfLine: 'lf',
  /**
   * Insert a newline at the end of file
   * Default：true
   */
  insertFinalNewline: true,
  /**
   * Control embedded language formatting such as CSS-in-JS or JS-in-Vue
   * Default：auto
   */
  embeddedLanguageFormatting: 'auto',
  /**
   * Whitespace sensitivity for Vue/HTML/Angular/Handlebars (oxfmt now formats <template>)
   * type: css | strict | ignore
   * Default：css
   */
  htmlWhitespaceSensitivity: 'css',
  /**
   * Temporarily disabled due to extensive changes; can enable later. Supports Vue but conflicts with current eslint-plugin-better-tailwindcss formatting
   * eslint-plugin-better-tailwindcss configured in oxlint is temporarily inactive in vue files, but works in ts
   * Default: false
   */
  // sortTailwindcss: {
  //   functions: ['clsx', 'cn', 'cva', 'tw'],
  //   stylesheet: './internal/tailwind-config/src/theme.css',
  //   preserveWhitespace: true,
  // },
  overrides: [
    {
      files: [
        '*.json',
        '*.json5',
        '*.jsonc',
        '*.code-workspace',
        '**/*.json',
        '**/*.json5',
        '**/*.jsonc',
        '**/*.code-workspace',
      ],
      options: {
        trailingComma: 'none',
        quoteProps: 'preserve',
        singleQuote: false,
      },
    },
  ],
});

function defineConfig(config: OxfmtConfig = {}): OxfmtConfig {
  return defineOxfmtConfig({
    ...oxfmtConfig,
    ...config,
  });
}

export { defineConfig, oxfmtConfig };
export type { OxfmtConfig };
