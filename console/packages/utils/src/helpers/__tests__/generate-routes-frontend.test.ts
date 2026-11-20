import type { RouteRecordRaw } from 'vue-router';

import { describe, expect, it } from 'vitest';

import {
  generateRoutesByFrontend,
  hasAuthority,
} from '../generate-routes-frontend';

// Mock route data
const mockRoutes = [
  {
    meta: {
      title: 'Test route',
      authority: ['admin', 'user'],
      hideInMenu: false,
    },
    component: { render: () => null },
    path: '/dashboard',
    children: [
      {
        component: { render: () => null },
        path: '/dashboard/overview',
        meta: { title: 'Test route', authority: ['admin'], hideInMenu: false },
      },
      {
        component: { render: () => null },
        path: '/dashboard/stats',
        meta: { title: 'Test route', authority: ['user'], hideInMenu: true },
      },
    ],
  },
  {
    meta: { title: 'Test route', authority: ['admin'], hideInMenu: false },
    component: { render: () => null },
    path: '/settings',
  },
  {
    meta: { title: 'Test route', hideInMenu: false },
    component: { render: () => null },
    path: '/profile',
  },
] as RouteRecordRaw[];

function routeAt(index: number): RouteRecordRaw {
  const route = mockRoutes[index];
  if (!route) throw new Error(`Missing route fixture ${index}`);
  return route;
}

describe('hasAuthority', () => {
  it('should return true if there is no authority defined', () => {
    expect(hasAuthority(routeAt(2), ['admin'])).toBe(true);
  });

  it('should return true if the user has the required authority', () => {
    expect(hasAuthority(routeAt(0), ['admin'])).toBe(true);
  });

  it('should return false if the user does not have the required authority', () => {
    expect(hasAuthority(routeAt(1), ['user'])).toBe(false);
  });
});

describe('generateRoutesByFrontend', () => {
  it('should handle routes without children', async () => {
    const generatedRoutes = await generateRoutesByFrontend(mockRoutes, [
      'user',
    ]);
    expect(generatedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/profile', // This route has no children and should be included
        }),
      ]),
    );
  });

  it('should handle empty roles array', async () => {
    const generatedRoutes = await generateRoutesByFrontend(mockRoutes, []);
    expect(generatedRoutes).toEqual(
      expect.arrayContaining([
        // Only routes without authority should be included
        expect.objectContaining({
          path: '/profile',
        }),
      ]),
    );
    expect(generatedRoutes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/dashboard',
        }),
        expect.objectContaining({
          path: '/settings',
        }),
      ]),
    );
  });

  it('should handle missing meta fields', async () => {
    const routesWithMissingMeta = [
      { path: '/path1' }, // No meta
      { meta: { title: 'Test route' }, path: '/path2' }, // Empty meta
      { meta: { title: 'Test route', authority: ['admin'] }, path: '/path3' }, // Only authority
    ];
    const generatedRoutes = await generateRoutesByFrontend(
      routesWithMissingMeta as RouteRecordRaw[],
      ['admin'],
    );
    expect(generatedRoutes).toEqual([
      { path: '/path1' },
      { meta: { title: 'Test route' }, path: '/path2' },
      { meta: { title: 'Test route', authority: ['admin'] }, path: '/path3' },
    ]);
  });

  it('should not corrupt the source route table across repeated generations', async () => {
    // Repro scenario: low-privilege user logs in first, then routes regenerate with higher privileges in the same session.
    // filterTree previously wrote filtered-out children back to the source route table,
    // causing higher-privilege users to lose access to those routes.
    const routes = [
      {
        meta: { title: 'Test route', authority: ['admin', 'user'] },
        path: '/dashboard',
        children: [
          {
            component: { render: () => null },
            path: '/dashboard/overview',
            meta: { title: 'Test route', authority: ['admin'] },
          },
          {
            component: { render: () => null },
            path: '/dashboard/stats',
            meta: { title: 'Test route', authority: ['user'] },
          },
        ],
      },
    ] as unknown as RouteRecordRaw[];

    await generateRoutesByFrontend(routes, ['user']);
    const asAdmin = await generateRoutesByFrontend(routes, ['admin']);

    expect(asAdmin[0]?.children?.map((child) => child.path)).toEqual([
      '/dashboard/overview',
    ]);
  });
});
