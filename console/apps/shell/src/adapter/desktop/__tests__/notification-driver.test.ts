// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getNotificationPlatform, isPwaEnvironment } from '#/utils/platform';

import {
  PwaNotificationDriver,
  TauriNotificationDriver,
  WebNotificationDriver,
} from '../drivers/notification-driver';
import {
  getNotificationDriver,
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
  setNotificationDriver,
} from '../notification';

describe('cross-platform notification drivers (web / pwa / tauri)', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    vi.restoreAllMocks();
    setNotificationDriver(null);
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    delete (window as unknown as Record<string, unknown>).__TAURI__;
  });

  afterEach(() => {
    setNotificationDriver(null);
    window.matchMedia = originalMatchMedia;
    globalThis.Notification = originalNotification;
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });

  describe('platform detection', () => {
    it('defaults to web when neither Tauri nor PWA standalone', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
      expect(isPwaEnvironment()).toBe(false);
      expect(getNotificationPlatform()).toBe('web');
    });

    it('detects pwa when display-mode is standalone', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
      })) as any;
      expect(isPwaEnvironment()).toBe(true);
      expect(getNotificationPlatform()).toBe('pwa');
    });

    it('detects tauri even if standalone media matches', () => {
      (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
      expect(isPwaEnvironment()).toBe(false);
      expect(getNotificationPlatform()).toBe('tauri');
    });
  });

  describe('WebNotificationDriver', () => {
    it('dispatches Notification when granted', async () => {
      const ctorSpy = vi.fn();
      const MockNotification = vi.fn().mockImplementation(function (
        this: any,
        title: string,
        opts?: NotificationOptions,
      ) {
        ctorSpy(title, opts);
        this.addEventListener = vi.fn();
      }) as any;
      MockNotification.permission = 'granted';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
      globalThis.Notification = MockNotification;

      const driver = new WebNotificationDriver();
      expect(driver.platform).toBe('web');
      expect(driver.isSupported()).toBe(true);
      expect(await driver.getPermission()).toBe('granted');

      const sent = await driver.send({
        body: 'Hello Web',
        tag: 'web-tag',
        title: 'Web Alert',
      });
      expect(sent).toBe(true);
      expect(ctorSpy).toHaveBeenCalledWith(
        'Web Alert',
        expect.objectContaining({ body: 'Hello Web', tag: 'web-tag' }),
      );
    });

    it('returns false when permission is denied', async () => {
      const MockNotification = vi.fn() as any;
      MockNotification.permission = 'denied';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');
      globalThis.Notification = MockNotification;

      const driver = new WebNotificationDriver();
      expect(await driver.send({ title: 'Blocked' })).toBe(false);
    });
  });

  describe('PwaNotificationDriver', () => {
    it('uses ServiceWorkerRegistration.showNotification when available', async () => {
      const showNotification = vi.fn().mockResolvedValue(undefined);
      const MockNotification = vi.fn() as any;
      MockNotification.permission = 'granted';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
      globalThis.Notification = MockNotification;

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: vi.fn().mockResolvedValue({ showNotification }),
          ready: Promise.resolve({ showNotification }),
        },
      });

      const driver = new PwaNotificationDriver();
      expect(driver.platform).toBe('pwa');
      expect(driver.isSupported()).toBe(true);

      const sent = await driver.send({
        body: 'Background sync complete',
        link: '/automation',
        title: 'PWA Alert',
      });

      expect(sent).toBe(true);
      expect(showNotification).toHaveBeenCalledWith(
        'PWA Alert',
        expect.objectContaining({
          body: 'Background sync complete',
          data: { link: '/automation' },
          icon: '/pwa-192x192.png',
        }),
      );
    });
  });

  describe('TauriNotificationDriver', () => {
    it('reports unsupported outside Tauri environment', async () => {
      const driver = new TauriNotificationDriver();
      expect(driver.platform).toBe('tauri');
      expect(driver.isSupported()).toBe(false);
      expect(await driver.getPermission()).toBe('unsupported');
      expect(await driver.requestPermission()).toBe('unsupported');
      expect(await driver.send({ title: 'Desktop' })).toBe(false);
    });
  });

  describe('driver selection and custom injection', () => {
    it('selects custom driver when injected via setNotificationDriver', async () => {
      const customDriver = {
        getPermission: vi.fn().mockResolvedValue('granted'),
        isSupported: vi.fn().mockReturnValue(true),
        platform: 'pwa' as const,
        requestPermission: vi.fn().mockResolvedValue('granted'),
        send: vi.fn().mockResolvedValue(true),
      };

      setNotificationDriver(customDriver);
      expect(getNotificationDriver()).toBe(customDriver);
      expect(await getNotificationPermission()).toBe('granted');
      expect(await requestNotificationPermission()).toBe('granted');
      expect(await sendDesktopNotification({ title: 'Test' })).toBe(true);
      expect(customDriver.send).toHaveBeenCalledWith({ title: 'Test' });
    });
  });
});
