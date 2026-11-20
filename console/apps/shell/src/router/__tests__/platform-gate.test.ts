import type { RouteRecordRaw } from 'vue-router';

import { describe, expect, it } from 'vitest';

import { filterRoutesByPlatform } from '../platform-gate';

describe('filterRoutesByPlatform', () => {
  it('should return empty array for empty routes input', () => {
    expect(filterRoutesByPlatform([], 'desktop')).toEqual([]);
    expect(
      filterRoutesByPlatform(null as unknown as RouteRecordRaw[], 'web'),
    ).toEqual([]);
  });

  it('should include routes with platform: "all" or without platform on both desktop and web', () => {
    const routes: RouteRecordRaw[] = [
      {
        name: 'Automation',
        path: '/automation',
        meta: { platform: 'all' },
      } as unknown as RouteRecordRaw,
      {
        name: 'Secrets',
        path: '/secrets',
        meta: {},
      } as unknown as RouteRecordRaw,
    ];

    const desktopResult = filterRoutesByPlatform(routes, 'desktop');
    expect(desktopResult).toHaveLength(2);

    const webResult = filterRoutesByPlatform(routes, 'web');
    expect(webResult).toHaveLength(2);
  });

  it('should include platform: "desktop" only on desktop', () => {
    const routes: RouteRecordRaw[] = [
      {
        name: 'DesktopTool',
        path: '/desktop-tool',
        meta: { platform: 'desktop' },
      } as unknown as RouteRecordRaw,
      {
        name: 'WebBilling',
        path: '/billing',
        meta: { platform: 'web' },
      } as unknown as RouteRecordRaw,
    ];

    const desktopResult = filterRoutesByPlatform(routes, 'desktop');
    expect(desktopResult).toHaveLength(1);
    expect(desktopResult[0]?.name).toBe('DesktopTool');

    const webResult = filterRoutesByPlatform(routes, 'web');
    expect(webResult).toHaveLength(1);
    expect(webResult[0]?.name).toBe('WebBilling');
  });

  it('should filter children recursively and prune empty layout parents', () => {
    const routes: RouteRecordRaw[] = [
      {
        name: 'WebManagementLayout',
        path: '/manage',
        // No component -> pure layout container
        children: [
          {
            name: 'WebOnlyFeature',
            path: 'feature',
            meta: { platform: 'web' },
          },
        ],
      } as unknown as RouteRecordRaw,
      {
        name: 'HybridLayout',
        path: '/hybrid',
        children: [
          {
            name: 'WebChild',
            path: 'web',
            meta: { platform: 'web' },
          },
          {
            name: 'DesktopChild',
            path: 'desktop',
            meta: { platform: 'desktop' },
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const desktopResult = filterRoutesByPlatform(routes, 'desktop');
    // WebManagementLayout has all children removed and no component -> pruned
    expect(desktopResult).toHaveLength(1);
    expect(desktopResult[0]?.name).toBe('HybridLayout');
    expect(desktopResult[0]?.children).toHaveLength(1);
    expect(desktopResult[0]?.children?.[0]?.name).toBe('DesktopChild');

    const webResult = filterRoutesByPlatform(routes, 'web');
    expect(webResult).toHaveLength(2);
    expect(webResult[0]?.name).toBe('WebManagementLayout');
    expect(webResult[1]?.children).toHaveLength(1);
    expect(webResult[1]?.children?.[0]?.name).toBe('WebChild');
  });
});
