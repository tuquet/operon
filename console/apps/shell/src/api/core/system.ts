import type { SystemPluginStatus } from '@operon/constants';

import { CANONICAL_PLUGIN_IDS, SYSTEM_PLUGIN_STATUS } from '@operon/constants';

import { supabaseRequest } from './supabase-client';

export interface SystemPlugin {
  dependencies?: string[];
  description: null | string;
  id: string;
  installed_at: string;
  is_core: boolean;
  is_system?: boolean;
  manifest: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  name: string;
  schema_name: null | string;
  status: string | SystemPluginStatus;
  version: string;
}

const CORE_PLUGIN_IDS = new Set<string>(CANONICAL_PLUGIN_IDS);

/**
 * Checks if a plugin ID belongs to the core platform plugins.
 */
export function isCorePlugin(id: string): boolean {
  if (!id) return false;
  return CORE_PLUGIN_IDS.has(id.toLowerCase());
}

/**
 * Maps raw public.system_plugins record to typed SystemPlugin.
 */
export function mapRawPlugin(raw: Record<string, unknown>): SystemPlugin {
  const pluginId = String(raw.id ?? '');
  const core = isCorePlugin(pluginId);
  return {
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
    description: (raw.description as string) ?? null,
    id: pluginId,
    installed_at: (raw.installed_at as string) || new Date().toISOString(),
    is_core: core,
    is_system: core,
    manifest:
      raw.manifest && typeof raw.manifest === 'object'
        ? (raw.manifest as Record<string, unknown>)
        : {},
    metadata:
      raw.metadata && typeof raw.metadata === 'object'
        ? (raw.metadata as Record<string, unknown>)
        : {},
    name: (raw.name as string) || pluginId || 'Unnamed Plugin',
    schema_name: (raw.schema_name as string) ?? null,
    status: (raw.status as string) || SYSTEM_PLUGIN_STATUS.INSTALLED,
    version: (raw.version as string) || '1.0.0',
  };
}

/**
 * Fetches platform system plugins from public.system_plugins (used for Analytics KPIs).
 */
export async function listSystemPlugins(): Promise<SystemPlugin[]> {
  try {
    const data = await supabaseRequest<Record<string, unknown>[]>(
      '/rest/v1/system_plugins?select=*&order=installed_at.asc',
    );
    if (!Array.isArray(data)) return [];
    return data.map((row) => mapRawPlugin(row));
  } catch (error: unknown) {
    const err = error as { isAuthError?: boolean; message?: string };
    if (!err?.isAuthError) {
      console.error(
        '[System] Failed to load system plugins:',
        err?.message || err,
      );
    }
    return [];
  }
}
