// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseDeepLinkAuthUrl, setupDeepLinkListener } from '../deep-link';
import { showOpenDialog, showSaveDialog } from '../dialog';
import {
  closeWindow,
  isTauriEnvironment,
  isWindowMaximized,
  minimizeWindow,
  revealWindow,
  toggleMaximizeWindow,
} from '../index';
import { sendDesktopNotification } from '../notification';
import { getSecureItem, setSecureItem } from '../storage';
import { checkDesktopUpdate } from '../updater';

const memoryStore = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  writable: true,
  configurable: true,
});

describe('desktop native adapter suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('environment detection & window fallbacks', () => {
    it('detects standard non-Tauri environment correctly', () => {
      expect(isTauriEnvironment()).toBe(false);
    });

    it('safely handles window operations without throwing exceptions', async () => {
      await expect(minimizeWindow()).resolves.toBeUndefined();
      await expect(toggleMaximizeWindow()).resolves.toBe(false);
      await expect(closeWindow()).resolves.toBeUndefined();
      await expect(isWindowMaximized()).resolves.toBe(false);
      await expect(revealWindow()).resolves.toBeUndefined();
    });
  });

  describe('deep linking url parser', () => {
    it('successfully parses valid SSO callback URL', () => {
      const raw =
        'operon://auth/callback?token=test-jwt-token&refresh_token=test-refresh-token&state=xyz123&tenant_id=tenant-uuid-1&machine_name=Workstation-01';

      const payload = parseDeepLinkAuthUrl(raw);
      expect(payload).not.toBeNull();
      expect(payload?.token).toBe('test-jwt-token');
      expect(payload?.refreshToken).toBe('test-refresh-token');
      expect(payload?.state).toBe('xyz123');
      expect(payload?.tenantId).toBe('tenant-uuid-1');
      expect(payload?.machineName).toBe('Workstation-01');
    });

    it('successfully parses Supabase OAuth hash fragment callback URL', () => {
      const raw =
        'operon://auth/callback#access_token=supabase-jwt-token&refresh_token=supabase-refresh-token&token_type=bearer&expires_in=3600';

      const payload = parseDeepLinkAuthUrl(raw);
      expect(payload).not.toBeNull();
      expect(payload?.token).toBe('supabase-jwt-token');
      expect(payload?.refreshToken).toBe('supabase-refresh-token');
    });

    it('returns null for non-operon schemes or missing tokens', () => {
      expect(
        parseDeepLinkAuthUrl('https://console.operon.com/auth/callback'),
      ).toBeNull();
      expect(
        parseDeepLinkAuthUrl('operon://auth/callback?state=xyz'),
      ).toBeNull();
      expect(parseDeepLinkAuthUrl('invalid-url')).toBeNull();
    });

    it('cleans up listener without error', async () => {
      const callback = vi.fn();
      const unlisten = await setupDeepLinkListener(callback);
      expect(typeof unlisten).toBe('function');
      expect(() => unlisten()).not.toThrow();
    });
  });

  describe('native adapters web fallbacks', () => {
    it('falls back safely for native notifications', async () => {
      const result = await sendDesktopNotification({
        title: 'Security Alert',
        body: 'Unauthorized access detected',
      });
      expect(typeof result).toBe('boolean');
    });

    it('returns null safely for native file dialogs', async () => {
      await expect(showSaveDialog()).resolves.toBeNull();
      await expect(showOpenDialog()).resolves.toBeNull();
    });

    it('persists and retrieves data via localStorage fallback', async () => {
      await setSecureItem('test_key', { role: 'operator', level: 5 });
      const stored = await getSecureItem<{ role: string; level: number }>(
        'test_key',
      );

      expect(stored).toEqual({ role: 'operator', level: 5 });

      const missing = await getSecureItem('non_existent', 'default-val');
      expect(missing).toBe('default-val');
    });

    it('handles desktop updater check safely', async () => {
      const status = await checkDesktopUpdate();
      expect(status.available).toBe(false);
    });
  });
});
