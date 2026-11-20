import type { RouteRecordRaw } from '@operon/types';

import { describe, expect, it } from 'vitest';

import { generateAccessible } from '../accessible';

// generateAccessible manipulates passed router instance. Cover methods with minimal stub:
// - getRoutes(): returns [] -> no root route '/', triggers router.addRoute branch
// - addRoute/removeRoute: no-op stub
// We only assert auto-generated redirects on accessibleRoutes.
function createRouterStub() {
  return {
    addRoute: () => {},
    getRoutes: () => [],
    removeRoute: () => {},
  } as any;
}

async function generate(routes: RouteRecordRaw[]) {
  const { accessibleRoutes } = await generateAccessible('frontend', {
    router: createRouterStub(),
    routes,
  });
  return accessibleRoutes;
}

function findByName(
  routes: RouteRecordRaw[],
  name: string,
): RouteRecordRaw | undefined {
  for (const route of routes) {
    if (route.name === name) {
      return route;
    }
    if (route.children) {
      const found = findByName(route.children as RouteRecordRaw[], name);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe('generateAccessible - redirect normalization', () => {
  it('does not generate redirect for parent when first child route has dynamic param (:id)', async () => {
    const routes = [
      {
        name: 'DyeSets',
        path: 'dye-sets',
        children: [
          {
            name: 'DyeSetDetail',
            path: ':id',
            meta: { hideInMenu: true, title: 'detail' },
          },
        ],
        meta: { title: 'dye-sets' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    expect(findByName(result, 'DyeSets')?.redirect).toBeUndefined();
  });

  it('does not throw and does not generate redirect when parent has object redirect({name}) and contains :id child route', async () => {
    const routes = [
      {
        name: 'Production',
        path: '/production',
        redirect: { name: 'ProductionTasks' },
        children: [
          {
            name: 'ProductionTasks',
            path: 'production-tasks',
            children: [
              {
                name: 'ProductionTaskDetail',
                path: ':id',
                meta: { hideInMenu: true, title: 'detail' },
              },
              {
                name: 'ProductionTaskMatch',
                path: ':id/match',
                meta: { hideInMenu: true, title: 'match' },
              },
            ],
            meta: { title: 'tasks' },
          },
        ],
        meta: { title: 'production' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    // Top-level object redirect remains unchanged
    expect(findByName(result, 'Production')?.redirect).toEqual({
      name: 'ProductionTasks',
    });
    // Parent of :id first child route does not generate redirect
    expect(findByName(result, 'ProductionTasks')?.redirect).toBeUndefined();
  });

  it('falls back to parent.path concatenation for relative first child route when parent has object redirect', async () => {
    const routes = [
      {
        name: 'Setting',
        path: '/setting',
        redirect: { name: 'SettingService' },
        children: [
          {
            name: 'SettingGroup',
            path: 'group',
            children: [
              {
                name: 'SettingService',
                path: 'service',
                meta: { title: 'service' },
              },
            ],
            meta: { title: 'group' },
          },
        ],
        meta: { title: 'setting' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    expect(findByName(result, 'SettingGroup')?.redirect).toBe(
      '/setting/group/service',
    );
  });

  it('generates correct cumulative absolute redirect for deep nested relative paths step by step', async () => {
    const routes = [
      {
        name: 'Demos',
        path: '/demos',
        children: [
          {
            name: 'NestedDemos',
            path: 'nested',
            children: [
              {
                name: 'Menu1Demo',
                path: 'menu1',
                meta: { title: 'menu1' },
              },
              {
                name: 'Menu2Demo',
                path: 'menu2',
                children: [
                  {
                    name: 'Menu21Demo',
                    path: 'menu2-1',
                    meta: { title: 'menu2-1' },
                  },
                ],
                meta: { title: 'menu2' },
              },
            ],
            meta: { title: 'nested' },
          },
        ],
        meta: { title: 'demos' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    // Demos redirects to first-level child route, child cascades down to leaf
    expect(findByName(result, 'Demos')?.redirect).toBe('/demos/nested');
    expect(findByName(result, 'NestedDemos')?.redirect).toBe(
      '/demos/nested/menu1',
    );
    expect(findByName(result, 'Menu2Demo')?.redirect).toBe(
      '/demos/nested/menu2/menu2-1',
    );
  });

  it('does not generate redirect when first child route is an absolute path (/foo)', async () => {
    const routes = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        children: [
          {
            name: 'Analytics',
            path: '/analytics',
            meta: { title: 'analytics' },
          },
        ],
        meta: { title: 'dashboard' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    expect(findByName(result, 'Dashboard')?.redirect).toBeUndefined();
  });

  it('does not generate redirect when first child route has empty path', async () => {
    const routes = [
      {
        name: 'HideChildrenParent',
        path: 'hide-menu-children',
        children: [
          {
            name: 'HideChildren',
            path: '',
            meta: { title: 'hide' },
          },
        ],
        meta: { title: 'parent' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    expect(findByName(result, 'HideChildrenParent')?.redirect).toBeUndefined();
  });

  it('preserves existing redirect without modification', async () => {
    const routes = [
      {
        name: 'Custom',
        path: '/custom',
        redirect: '/custom/keep',
        children: [
          {
            name: 'CustomChild',
            path: 'child',
            meta: { title: 'child' },
          },
        ],
        meta: { title: 'custom' },
      },
    ] as unknown as RouteRecordRaw[];

    const result = await generate(routes);
    expect(findByName(result, 'Custom')?.redirect).toBe('/custom/keep');
  });
});
