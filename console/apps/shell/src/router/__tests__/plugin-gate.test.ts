import type { RouteRecordRaw } from 'vue-router';

import { describe, expect, it, vi } from 'vitest';

import { filterRoutesByPlugins } from '../plugin-gate';
import automationRoutes from '../routes/modules/automation';

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('filterRoutesByPlugins', () => {
  it('should return empty array for empty routes input', () => {
    expect(filterRoutesByPlugins([], ['identity'])).toEqual([]);
    expect(
      filterRoutesByPlugins(null as unknown as RouteRecordRaw[], ['identity']),
    ).toEqual([]);
  });

  it('should retain routes without meta or without meta.plugin', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/dashboard',
        name: 'Dashboard',
        children: [
          {
            path: 'analytics',
            name: 'Analytics',
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const result = filterRoutesByPlugins(routes, ['identity']);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Dashboard');
    expect(result[0]?.children).toHaveLength(1);
  });

  it('should retain route if required plugin is installed', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/automation',
        name: 'Automation',
        meta: { plugin: 'operon' },
        children: [
          {
            path: 'devices',
            name: 'AutomationDevices',
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const result = filterRoutesByPlugins(routes, ['identity', 'operon']);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Automation');
    expect(result[0]?.children).toHaveLength(1);
  });

  it('should omit route if required plugin is not installed', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/automation',
        name: 'Automation',
        meta: { plugin: 'operon' },
        children: [
          {
            path: 'workflows',
            name: 'Workflows',
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const result = filterRoutesByPlugins(routes, ['identity']);
    expect(result).toHaveLength(0);
  });

  it('should filter individual child routes based on their plugin requirement', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/system',
        name: 'System',
        meta: { plugin: 'identity' },
        children: [
          {
            path: 'plugins',
            name: 'Plugins',
            meta: { plugin: 'identity' },
          },
          {
            path: 'plans',
            name: 'Plans',
            meta: { plugin: 'licensing' },
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    // Case 1: licensing is NOT installed
    const withoutLicensing = filterRoutesByPlugins(routes, ['identity']);
    expect(withoutLicensing).toHaveLength(1);
    expect(withoutLicensing[0]?.children).toHaveLength(1);
    expect(withoutLicensing[0]?.children?.[0]?.name).toBe('Plugins');

    // Case 2: licensing IS installed
    const withLicensing = filterRoutesByPlugins(routes, [
      'identity',
      'licensing',
    ]);
    expect(withLicensing).toHaveLength(1);
    expect(withLicensing[0]?.children).toHaveLength(2);
    expect(withLicensing[0]?.children?.[1]?.name).toBe('Plans');
  });

  it('should prune parent route if it has no component and all its children were filtered out', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/system',
        name: 'System',
        // No component specified (layout parent)
        children: [
          {
            path: 'plans',
            name: 'Plans',
            meta: { plugin: 'licensing' },
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const result = filterRoutesByPlugins(routes, ['identity']);
    expect(result).toHaveLength(0);
  });

  it('should retain parent route if it has a component even when all children were filtered', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/standalone',
        name: 'Standalone',
        component: () => Promise.resolve({}),
        children: [
          {
            path: 'sub',
            name: 'Sub',
            meta: { plugin: 'missing-plugin' },
          },
        ],
      } as unknown as RouteRecordRaw,
    ];

    const result = filterRoutesByPlugins(routes, ['identity']);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Standalone');
    expect(result[0]?.children).toHaveLength(0);
  });

  it('should gate operon child routes inside unified /automation module', () => {
    const withOperon = filterRoutesByPlugins(automationRoutes, [
      'identity',
      'operon',
    ]);
    expect(withOperon).toHaveLength(1);
    expect(withOperon[0]?.children?.map((c) => c.name)).toEqual([
      'AutomationOverview',
      'AutomationBrowsers',
    ]);

    const withoutOperon = filterRoutesByPlugins(automationRoutes, ['identity']);
    expect(withoutOperon).toHaveLength(0);
  });
});
