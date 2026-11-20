import { describe, expect, it } from 'vitest';

// @ts-expect-error The checker is a native Node ESM script.
import { importSpecifiers, violatesBoundary } from '../check-architecture.mjs';

describe('application boundaries', () => {
  it('blocks cross-app and shared-to-app imports on either platform', () => {
    expect(
      violatesBoundary('apps/system/src/view.ts', 'apps/shell/src/api.ts'),
    ).toBe(true);
    expect(
      violatesBoundary(
        String.raw`apps\system\src\view.ts`,
        String.raw`apps\tenants\src`,
      ),
    ).toBe(true);
    expect(violatesBoundary('packages/utils/src/index.ts', 'apps/shell')).toBe(
      true,
    );
    expect(violatesBoundary('apps/shell/src/router.ts', 'apps/system')).toBe(
      false,
    );
    expect(violatesBoundary('apps/system/src/view.ts', 'packages/kernel')).toBe(
      false,
    );
    expect(
      violatesBoundary('apps/system/src/view.ts', 'apps/system/src/store.ts'),
    ).toBe(false);
  });

  it('finds imports after generic TypeScript arrow functions', () => {
    expect(
      importSpecifiers(
        'const identity = <T>(value: T) => value; import("@operon/shell");',
        'module.ts',
      ),
    ).toEqual(['@operon/shell']);
  });

  it('finds imports, re-exports, dynamic imports and import types inside Vue scripts', () => {
    const source = `<script setup lang="ts">
      import { api } from '../../shell/src/api';
      export { item } from '@operon/tenants';
      const view = () => import('@operon/shell');
      type Host = import('@operon/shell').Host;
      const value = require('@operon/system');
    </script><template><p>import('@operon/ignored')</p></template>`;
    expect(importSpecifiers(source, 'view.vue')).toEqual([
      '../../shell/src/api',
      '@operon/tenants',
      '@operon/shell',
      '@operon/shell',
      '@operon/system',
    ]);
  });
});
