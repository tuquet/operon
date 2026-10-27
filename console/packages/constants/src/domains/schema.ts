/**
 * Canonical PostgREST / Supabase Database Schemas
 */
export const SUPABASE_SCHEMA = {
  AUTOMATION: 'automation',
  BILLING: 'billing',
  BROWSERS: 'browsers',
  COMMERCE: 'commerce',
  EVENTS: 'events',
  MEDIA: 'media',
  PUBLIC: 'public',
  WORKERS: 'workers',
} as const;

export type SupabaseSchema =
  (typeof SUPABASE_SCHEMA)[keyof typeof SUPABASE_SCHEMA];

export const SUPABASE_SCHEMA_VALUES = Object.values(
  SUPABASE_SCHEMA,
) as readonly SupabaseSchema[];

/**
 * Canonical Browser LocalStorage Keys for Admin
 */
export const STORAGE_KEYS = {
  ACTIVE_TENANT_ID: 'OPERON_ACTIVE_TENANT_ID',
  AUTH_BANNER_MODE: 'operon:auth-banner-mode',
  GUEST_ORDERS: 'OPERON_GUEST_ORDERS',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
