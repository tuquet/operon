import type { OxlintConfig } from 'oxlint';

const plugins: OxlintConfig = {
  /**
   * Plugins supported by oxlint; explicitly configure even default-enabled plugins
   * type: eslint | react | unicorn | typescript | oxc |
   * import | jsdoc | jest | vitest | jsx-a11y | nextjs |
   * react-perf | promise | node | vue
   *
   * Default: eslint,typescript,unicorn,oxc
   */
  plugins: [
    'eslint',
    'import',
    'node',
    'oxc',
    'typescript',
    'unicorn',
    'vitest',
    'vue',
  ],
};

export { plugins };
