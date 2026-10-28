import { defineConfig } from '@operon/eslint-config';

export default defineConfig([
  {
    ignores: ['**/src-tauri/**', '**/target/**'],
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/html-closing-bracket-newline': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'vue/no-required-prop-with-default': 'off',
      'vue/one-component-per-file': 'off',
      'vue/require-default-prop': 'off',
      'vue/require-prop-types': 'off',
    },
  },
]);
