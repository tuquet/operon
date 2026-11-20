/**
 * System Plugin Installation Status (`public.system_plugins.status`)
 */
export const SYSTEM_PLUGIN_STATUS = {
  DISABLED: 'disabled',
  INSTALLED: 'installed',
  PENDING: 'pending',
} as const;

export type SystemPluginStatus =
  (typeof SYSTEM_PLUGIN_STATUS)[keyof typeof SYSTEM_PLUGIN_STATUS];

export const SYSTEM_PLUGIN_STATUS_VALUES = Object.values(
  SYSTEM_PLUGIN_STATUS,
) as readonly SystemPluginStatus[];

/**
 * System Plugin Category (`core` vs `extension`)
 */
export const SYSTEM_PLUGIN_CATEGORY = {
  CORE: 'core',
  EXTENSION: 'extension',
} as const;

export type SystemPluginCategory =
  (typeof SYSTEM_PLUGIN_CATEGORY)[keyof typeof SYSTEM_PLUGIN_CATEGORY];

export const SYSTEM_PLUGIN_CATEGORY_VALUES = Object.values(
  SYSTEM_PLUGIN_CATEGORY,
) as readonly SystemPluginCategory[];
