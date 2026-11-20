import type { ResolvedConfig } from 'vite';

import { describe, expect, it, vi } from 'vitest';

import {
  FORM_FIELD_SLOT_MIGRATION_WARNING,
  viteFormFieldSlotMigrationWarningPlugin,
} from './form-field-slot-migration-warning';

describe('form field slot migration warning plugin', () => {
  it('warns in the development terminal without injecting browser code', () => {
    const plugin = viteFormFieldSlotMigrationWarningPlugin();
    const warning = vi.fn();

    expect(plugin.apply).toBe('serve');
    expect(plugin.configResolved).toBeTypeOf('function');
    if (typeof plugin.configResolved !== 'function') return;

    plugin.configResolved.call(
      {} as never,
      { logger: { warn: warning } } as unknown as ResolvedConfig,
    );

    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(FORM_FIELD_SLOT_MIGRATION_WARNING);
    expect(plugin.transformIndexHtml).toBeUndefined();
    expect(FORM_FIELD_SLOT_MIGRATION_WARNING).toContain('`v-bind="slotProps"`');
    expect(FORM_FIELD_SLOT_MIGRATION_WARNING).toContain(
      '`v-bind="slotProps.componentProps"`',
    );
  });
});
