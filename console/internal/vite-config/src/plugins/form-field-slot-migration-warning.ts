import type { Plugin } from 'vite';

const FORM_FIELD_SLOT_MIGRATION_WARNING =
  '[Vben Form] BREAKING CHANGE: Named field slot control bindings moved to `slotProps.componentProps`. Replace `v-bind="slotProps"` with `v-bind="slotProps.componentProps"`. Check component docs.';

function viteFormFieldSlotMigrationWarningPlugin(): Plugin {
  return {
    apply: 'serve',
    configResolved(config) {
      config.logger.warn(FORM_FIELD_SLOT_MIGRATION_WARNING);
    },
    name: 'vite:form-field-slot-migration-warning',
  };
}

export {
  FORM_FIELD_SLOT_MIGRATION_WARNING,
  viteFormFieldSlotMigrationWarningPlugin,
};
