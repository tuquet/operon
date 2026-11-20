import type { RouteRecordRaw } from 'vue-router';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setPlatformOverride } from '#/utils/platform';

import { filterRoutesByPlatform } from '../platform-gate';

describe('platform Route & Guard Policy (Desktop Local-First vs Web Cloud-Central)', () => {
  beforeEach(() => {
    setPlatformOverride(null);
  });

  afterEach(() => {
    setPlatformOverride(null);
  });

  describe('filterRoutesByPlatform', () => {
    const mockRoutes: RouteRecordRaw[] = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        meta: { platform: 'web' },
      } as unknown as RouteRecordRaw,
      {
        name: 'Automation',
        path: '/automation',
        meta: { platform: 'all' },
      } as unknown as RouteRecordRaw,
      {
        name: 'Secrets',
        path: '/secrets',
        meta: { platform: 'all' },
      } as unknown as RouteRecordRaw,
      {
        name: 'Tenants',
        path: '/tenants',
        meta: { platform: 'web' },
      } as unknown as RouteRecordRaw,
      {
        name: 'Commerce',
        path: '/commerce',
        meta: { platform: 'web' },
      } as unknown as RouteRecordRaw,
    ];

    it('on desktop: includes only all & desktop routes (excludes web-only routes)', () => {
      const desktopRoutes = filterRoutesByPlatform(mockRoutes, 'desktop');
      const routeNames = desktopRoutes.map((r) => r.name);

      expect(routeNames).toContain('Automation');
      expect(routeNames).toContain('Secrets');
      expect(routeNames).not.toContain('Dashboard');
      expect(routeNames).not.toContain('Tenants');
      expect(routeNames).not.toContain('Commerce');
    });

    it('on web: includes all & web routes', () => {
      const webRoutes = filterRoutesByPlatform(mockRoutes, 'web');
      const routeNames = webRoutes.map((r) => r.name);

      expect(routeNames).toContain('Dashboard');
      expect(routeNames).toContain('Tenants');
      expect(routeNames).toContain('Commerce');
      expect(routeNames).toContain('Automation');
      expect(routeNames).toContain('Secrets');
    });
  });

  describe('platform Detection SSOT', () => {
    it('should respect dynamic platform override', async () => {
      const { getPlatform, isDesktop, isWeb } =
        await import('#/utils/platform');

      setPlatformOverride('desktop');
      expect(getPlatform()).toBe('desktop');
      expect(isDesktop()).toBe(true);
      expect(isWeb()).toBe(false);

      setPlatformOverride('web');
      expect(getPlatform()).toBe('web');
      expect(isDesktop()).toBe(false);
      expect(isWeb()).toBe(true);
    });
  });
});
