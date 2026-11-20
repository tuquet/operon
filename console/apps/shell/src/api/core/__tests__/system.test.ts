import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabaseRequest } from '../supabase-client';
import { isCorePlugin, listSystemPlugins, mapRawPlugin } from '../system';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn(),
}));

describe('system core api & helpers (Host Shell Analytics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCorePlugin', () => {
    it('should return true for all 6 core kernel plugins', () => {
      expect(isCorePlugin('identity')).toBe(true);
      expect(isCorePlugin('operon')).toBe(true);
      expect(isCorePlugin('licensing')).toBe(true);
      expect(isCorePlugin('dispatch')).toBe(true);
      expect(isCorePlugin('store')).toBe(true);
      expect(isCorePlugin('vault')).toBe(true);
    });

    it('should return false for legacy aliases and custom or empty plugin IDs', () => {
      expect(isCorePlugin('core-iam')).toBe(false);
      expect(isCorePlugin('workers')).toBe(false);
      expect(isCorePlugin('automation')).toBe(false);
      expect(isCorePlugin('subscriptions')).toBe(false);
      expect(isCorePlugin('custom-ai')).toBe(false);
      expect(isCorePlugin('')).toBe(false);
    });
  });

  describe('mapRawPlugin', () => {
    it('should map core plugin correctly', () => {
      const raw = {
        id: 'identity',
        name: 'Identity & Access Management',
        version: '1.0.0',
      };
      const plugin = mapRawPlugin(raw);
      expect(plugin.id).toBe('identity');
      expect(plugin.is_core).toBe(true);
      expect(plugin.is_system).toBe(true);
      expect(plugin.name).toBe('Identity & Access Management');
    });

    it('should map extension plugin with defaults', () => {
      const raw = {
        id: 'third-party-tool',
      };
      const plugin = mapRawPlugin(raw);
      expect(plugin.id).toBe('third-party-tool');
      expect(plugin.is_core).toBe(false);
      expect(plugin.name).toBe('third-party-tool');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('listSystemPlugins', () => {
    it('should fetch plugins from public.system_plugins', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        { id: 'identity', name: 'IAM', version: '1.0.0' },
        { id: 'operon', name: 'Operon Engine', version: '2.0.0' },
      ]);

      const plugins = await listSystemPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins[0]?.id).toBe('identity');
      expect(plugins[1]?.id).toBe('operon');
    });

    it('should return empty array on failure', async () => {
      vi.mocked(supabaseRequest).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const plugins = await listSystemPlugins();
      expect(plugins).toEqual([]);
    });
  });
});
