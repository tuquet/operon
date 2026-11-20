import type { OxlintConfig } from 'oxlint';

const typescript: OxlintConfig = {
  rules: {
    // Migrated from @typescript-eslint strict preset (non-type-aware, natively supported by oxlint)
    // no-array-constructor / no-useless-constructor already covered by core rules in javascript configuration.
    'typescript/ban-ts-comment': 'error',
    'typescript/no-duplicate-enum-values': 'error',
    'typescript/no-dynamic-delete': 'error',
    'typescript/no-empty-object-type': 'error',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-extraneous-class': 'error',
    'typescript/no-invalid-void-type': 'error',
    'typescript/no-misused-new': 'error',
    'typescript/no-non-null-asserted-nullish-coalescing': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-this-alias': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-declaration-merging': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/no-var-requires': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/prefer-literal-enum-member': 'error',
    'typescript/prefer-namespace-keyword': 'error',
    'typescript/triple-slash-reference': 'error',
    'typescript/unified-signatures': 'error',

    'typescript/await-thenable': 'off',
    'typescript/consistent-return': 'off',
    'typescript/no-base-to-string': 'off',
    'typescript/no-duplicate-type-constituents': 'off',
    'typescript/no-floating-promises': 'off',
    'typescript/no-misused-spread': 'off',
    'typescript/no-redundant-type-constituents': 'off',
    'typescript/no-unnecessary-boolean-literal-compare': 'off',
    'typescript/no-unnecessary-template-expression': 'off',
    'typescript/no-unnecessary-type-arguments': 'off',
    'typescript/no-unnecessary-type-assertion': 'off',
    'typescript/no-unnecessary-type-conversion': 'off',
    'typescript/no-unnecessary-type-parameters': 'off',
    'typescript/no-unsafe-enum-comparison': 'off',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/no-useless-default-assignment': 'off',
    'typescript/restrict-template-expressions': 'off',
    'typescript/unbound-method': 'off',
  },
};

export { typescript };
