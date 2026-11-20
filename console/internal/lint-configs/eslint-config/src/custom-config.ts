import type { Linter } from 'eslint';

const restrictedImportIgnores = ['**/vite.config.mts'];

const customConfig: Linter.Config[] = [
  // Internal shadcn-ui components are auto-generated; avoid excessive restrictions
  {
    files: ['packages/@core/ui-kit/shadcn-ui/**/**'],
    rules: {
      'vue/require-default-prop': 'off',
    },
  },
  {
    files: [
      'apps/**/**',
      'packages/effects/**/**',
      'packages/utils/**/**',
      'packages/types/**/**',
      'packages/locales/**/**',
    ],
    ignores: restrictedImportIgnores,
    rules: {
      'perfectionist/sort-interfaces': 'off',
    },
  },
  {
    // Basic internal rules for apps
    files: ['apps/**/**'],
    ignores: restrictedImportIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#/api/*'],
              message:
                'The #/api package cannot be imported, please use the @core package itself',
            },
            {
              group: ['#/layouts/*'],
              message:
                'The #/layouts package cannot be imported, please use the @core package itself',
            },
            {
              group: ['#/locales/*'],
              message:
                'The #/locales package cannot be imported, please use the @core package itself',
            },
            {
              group: ['#/stores/*'],
              message:
                'The #/stores package cannot be imported, please use the @core package itself',
            },
          ],
        },
      ],
    },
  },
  {
    // @core internal components must not import packages from @operon/*
    files: ['packages/@core/**/**'],
    ignores: restrictedImportIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@operon/*', '**/apps/**'],
              message:
                'The @core package cannot import the @operon package, please use the @core package itself',
            },
          ],
        },
      ],
    },
  },
  {
    // @core/shared internal components must not import packages from @operon/* or @operon-core/*
    files: ['packages/@core/base/**/**'],
    ignores: restrictedImportIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@operon/*', '@operon-core/*', '**/apps/**'],
              message:
                'The @operon-core/shared package cannot import the @operon package, please use the @core/shared package itself',
            },
          ],
        },
      ],
    },
  },

  {
    // Must not import packages from @operon/*
    files: [
      'packages/types/**/**',
      'packages/utils/**/**',
      'packages/icons/**/**',
      'packages/constants/**/**',
      'packages/styles/**/**',
      'packages/stores/**/**',
      'packages/preferences/**/**',
      'packages/locales/**/**',
    ],
    ignores: restrictedImportIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@operon/*', '**/apps/**'],
              message:
                'The @operon package cannot be imported, please use the @core package itself',
            },
          ],
        },
      ],
    },
  },
  ...['automation', 'system', 'tenants'].map((app): Linter.Config => ({
    files: [`apps/${app}/**/*`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#/api/*', '#/layouts/*', '#/locales/*', '#/stores/*'],
              message: 'Use the public module entry point.',
            },
            {
              group: ['shell', 'automation', 'system', 'tenants'].flatMap(
                (target) =>
                  target === app
                    ? []
                    : [
                        `@operon/${target}`,
                        `@operon/${target}/**`,
                        `**/${target}/**`,
                      ],
              ),
              message:
                'Business applications communicate through @operon/kernel; cross-app imports are forbidden.',
            },
          ],
        },
      ],
    },
  })),
  {
    files: [
      'packages/effects/**/*',
      'packages/kernel/**/*',
      'packages/local-db/**/*',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/apps/**',
                '@operon/shell',
                '@operon/system',
                '@operon/automation',
                '@operon/tenants',
                '@operon/shell/**',
                '@operon/system/**',
                '@operon/automation/**',
                '@operon/tenants/**',
              ],
              message: 'Shared packages must not import applications.',
            },
          ],
        },
      ],
    },
  },
  // Backend mock code; does not require strict rules
  {
    files: ['apps/backend-mock/**/**', 'docs/**/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/**/playwright.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['internal/**/**', 'scripts/**/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['packages/@core/base/shared/src/utils/inference.ts'],
    rules: {
      'vue/prefer-import-from-vue': 'off',
    },
  },
];

export { customConfig };
