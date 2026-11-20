/**
 * Canonical PostgREST / Supabase Database Schemas
 */
export const SUPABASE_SCHEMA = {
  BILLING: 'billing',
  EVENTS: 'events',
  MEDIA: 'media',
  MEDUSA: 'medusa',
  OPERON: 'operon',
  PUBLIC: 'public',
  SECRETS: 'secrets',
} as const;

export type SupabaseSchema =
  (typeof SUPABASE_SCHEMA)[keyof typeof SUPABASE_SCHEMA];

export const SUPABASE_SCHEMA_VALUES = Object.values(
  SUPABASE_SCHEMA,
) as readonly SupabaseSchema[];

/**
 * Canonical Plugin IDs (matching id/supabase/plugins and system_plugins.id)
 */
export const CANONICAL_PLUGINS = {
  DISPATCH: 'dispatch',
  IDENTITY: 'identity',
  LICENSING: 'licensing',
  OPERON: 'operon',
  STORE: 'store',
  VAULT: 'vault',
} as const;

export type CanonicalPluginId =
  (typeof CANONICAL_PLUGINS)[keyof typeof CANONICAL_PLUGINS];

export const CANONICAL_PLUGIN_IDS = Object.values(
  CANONICAL_PLUGINS,
) as readonly CanonicalPluginId[];

/**
 * Canonical Browser LocalStorage Keys for Admin
 */
export const STORAGE_KEYS = {
  ACTIVE_TENANT_ID: 'OPERON_ACTIVE_TENANT_ID',
  AUTH_BANNER_MODE: 'operon:auth-banner-mode',
  GUEST_ORDERS: 'OPERON_GUEST_ORDERS',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
