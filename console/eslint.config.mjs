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
]);
