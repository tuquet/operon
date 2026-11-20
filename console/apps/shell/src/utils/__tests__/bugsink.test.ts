import * as Sentry from '@sentry/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addNetworkBreadcrumb,
  captureError,
  captureMessage,
  initBugsink,
  isBugsinkReady,
  sanitizeUrl,
} from '../bugsink';

vi.mock('@sentry/vue', () => {
  return {
    addBreadcrumb: vi.fn(),
    browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    init: vi.fn(),
    setTag: vi.fn(),
    setUser: vi.fn(),
  };
});

describe('bugsink telemetry utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeUrl', () => {
    it('redacts sensitive query parameters', () => {
      const url =
        'https://operon.com/api/v1/auth?access_token=secret123&refresh_token=refresh456&role=admin';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toContain('access_token=%5BREDACTED%5D');
      expect(sanitized).toContain('refresh_token=%5BREDACTED%5D');
      expect(sanitized).toContain('role=admin');
    });

    it('redacts apikey, password, and cccd parameters in relative paths', () => {
      const path =
        '/rest/v1/users?apikey=sb_secret&password=p1&cccd=001200000000&sort=asc';
      const sanitized = sanitizeUrl(path);
      expect(sanitized).toContain('apikey=%5BREDACTED%5D');
      expect(sanitized).toContain('password=%5BREDACTED%5D');
      expect(sanitized).toContain('cccd=%5BREDACTED%5D');
      expect(sanitized).toContain('sort=asc');
    });

    it('returns empty string for empty inputs', () => {
      expect(sanitizeUrl('')).toBe('');
    });
  });

  describe('addNetworkBreadcrumb', () => {
    it('creates breadcrumb with sanitized url and uppercase method', () => {
      addNetworkBreadcrumb({
        durationMs: 42,
        method: 'get',
        status: 200,
        url: '/api/v1/tenants?key=secret_value&limit=10',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          data: expect.objectContaining({
            duration_ms: 42,
            method: 'GET',
            status_code: 200,
            url: expect.stringContaining('key=%5BREDACTED%5D'),
          }),
          level: 'info',
          type: 'http',
        }),
      );
    });

    it('sets level to warning for 4xx and 5xx statuses', () => {
      addNetworkBreadcrumb({
        durationMs: 120,
        method: 'post',
        status: 500,
        url: '/api/v1/checkout',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warning',
        }),
      );
    });
  });

  describe('captureError deduplication and early buffering', () => {
    it('deduplicates identical Error instances', () => {
      const dummyApp = { config: {}, use: vi.fn() } as any;
      initBugsink(dummyApp, undefined, {
        dsn: 'https://operon@test-relay.example.com/1',
      });

      const err = new Error('Test unique error');
      captureError(err, { test: 1 });
      captureError(err, { test: 2 });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('captures informational message', () => {
      const dummyApp = { config: {}, use: vi.fn() } as any;
      initBugsink(dummyApp, undefined, {
        dsn: 'https://operon@test-relay.example.com/1',
      });

      captureMessage('Notice message', 'warning', { foo: 'bar' });
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Notice message', {
        extra: { foo: 'bar' },
        level: 'warning',
      });
    });
  });

  describe('initBugsink', () => {
    it('initializes Sentry when DSN is provided', () => {
      const dummyApp = { config: {}, use: vi.fn() } as any;
      const testDsn = 'https://operon@test-error-relay.example.com/1';
      initBugsink(dummyApp, undefined, { dsn: testDsn });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          app: dummyApp,
          dsn: testDsn,
          sampleRate: 1,
        }),
      );
      expect(isBugsinkReady()).toBe(true);
    });

    it('does not initialize Sentry when explicitly disabled', () => {
      const dummyApp = { config: {}, use: vi.fn() } as any;
      initBugsink(dummyApp, undefined, { enabled: false });

      expect(Sentry.init).not.toHaveBeenCalled();
    });
  });
});
