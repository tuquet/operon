import type { Component, DefineComponent } from 'vue';

import type {
  AccessModeType,
  GenerateMenuAndRoutesOptions,
  RouteRecordRaw,
} from '@operon/types';

import { defineComponent, h } from 'vue';

import {
  cloneDeep,
  generateMenus,
  generateRoutesByBackend,
  generateRoutesByFrontend,
  isFunction,
  isString,
  mapTree,
} from '@operon/utils';

async function generateAccessible(
  mode: AccessModeType,
  options: GenerateMenuAndRoutesOptions,
) {
  const { router } = options;

  options.routes = cloneDeep(options.routes);

  // Generate routes
  const accessibleRoutes = await generateRoutes(mode, options);

  const root = router.getRoutes().find((item) => item.path === '/');

  // Get existing route names list
  const names = root?.children?.map((item) => item.name) ?? [];

  // Dynamically add to router instance
  accessibleRoutes.forEach((route) => {
    if (root && !route.meta?.noBasicLayout) {
      // For backwards compatibility: remove component if child routes exist to avoid duplicate BasicLayout wrappers
      // If all first-level custom menus have removed BasicLayout, this condition can be omitted
      if (route.children && route.children.length > 0) {
        delete route.component;
      }
      // If route with this name already exists, do not re-add
      if (names?.includes(route.name)) {
        // Update existing route index to avoid 404 when switching users with top-level menu caching homePath
        const index = root.children?.findIndex(
          (item) => item.name === route.name,
        );
        if (index !== undefined && index !== -1 && root.children) {
          root.children[index] = route;
        }
      } else {
        root.children?.push(route);
      }
    } else {
      router.addRoute(route);
    }
  });

  if (root) {
    if (root.name) {
      router.removeRoute(root.name);
    }
    router.addRoute(root);
  }

  // Generate menus
  const accessibleMenus = generateMenus(accessibleRoutes, options.router);

  return { accessibleMenus, accessibleRoutes };
}

/**
 * Generate routes
 * @param mode
 * @param options
 */
async function generateRoutes(
  mode: AccessModeType,
  options: GenerateMenuAndRoutesOptions,
) {
  const { forbiddenComponent, roles, routes } = options;

  let resultRoutes: RouteRecordRaw[] = routes;
  switch (mode) {
    case 'backend': {
      resultRoutes = await generateRoutesByBackend(options);
      break;
    }
    case 'frontend': {
      resultRoutes = await generateRoutesByFrontend(
        routes,
        roles || [],
        forbiddenComponent,
      );
      break;
    }
    case 'mixed': {
      const [frontend_resultRoutes, backend_resultRoutes] = await Promise.all([
        generateRoutesByFrontend(routes, roles || [], forbiddenComponent),
        generateRoutesByBackend(options),
      ]);
      resultRoutes = mergeRoutesByName(
        backend_resultRoutes,
        frontend_resultRoutes,
      );
      break;
    }
  }

  /**
   * Adjust route tree:
   * 1. Add redirect to routes without one
   * 2. Set lazy-loaded component name to current route name (if keep-alive enabled)
   */
  resultRoutes = mapTree(resultRoutes, (route, parent) => {
    // Rewrap component with matching route name to support keep-alive conditional caching.
    if (
      route.meta?.keepAlive &&
      isFunction(route.component) &&
      route.name &&
      isString(route.name)
    ) {
      const originalComponent = route.component as () => Promise<{
        default: Component | DefineComponent;
      }>;
      route.component = async () => {
        const component = await originalComponent();
        if (!component.default) return component;
        return defineComponent({
          name: route.name as string,
          setup(props, { attrs, slots }) {
            return () => h(component.default, { ...props, ...attrs }, slots);
          },
        });
      };
    }

    // If redirect exists or no children, return directly
    if (route.redirect || !route.children || route.children.length === 0) {
      return route;
    }
    const firstChild = route.children[0];

    if (!firstChild?.path || firstChild.path.startsWith('/')) {
      return route;
    }

    // Fork customization: if first child route is dynamic (:id), the route is a
    // list/detail page rendering its own component; do not redirect to unfilled param,
    // which would produce literal ":id" or 404.
    // See upstream commit f00a8812 fix.
    if (firstChild.path.startsWith(':')) {
      return route;
    }

    // Concatenate child route redirect absolute path.
    // - When parent.redirect is string, it is already cumulative absolute path; replace last segment.
    //   Supports arbitrary levels of deep nesting.
    // - Fork customization: backend menu may pass object redirect ({ name }), which cannot split,
    //   fall back to parent.path concatenation.
    if (parent && parent.redirect && isString(parent.redirect)) {
      const parentSplit = parent.redirect.split('/');
      parentSplit.splice(-1, 2, route.path, firstChild.path);
      const redirectPath = parentSplit.join('/');
      route.redirect = redirectPath;
    } else if (parent && parent.redirect) {
      route.redirect = `${parent.path}/${route.path}/${firstChild.path}`;
    } else {
      route.redirect = `${route.path}/${firstChild.path}`;
    }

    return route;
  });

  return resultRoutes;
}

/**
 * Merge frontend and backend routes based on name
 * @param baseRoutes Backend routes
 * @param extraRoutes Frontend routes
 */
function mergeRoutesByName(
  baseRoutes: RouteRecordRaw[],
  extraRoutes: RouteRecordRaw[],
): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = [];
  const routeMap = new Map<string, RouteRecordRaw>();

  for (const route of baseRoutes) {
    const clone = { ...route } as RouteRecordRaw;
    result.push(clone);
    if (clone.name && isString(clone.name)) {
      routeMap.set(clone.name as string, clone);
    }
  }

  for (const route of extraRoutes) {
    if (
      route.name &&
      isString(route.name) &&
      routeMap.has(route.name as string)
    ) {
      const existing = routeMap.get(route.name as string);
      if (!existing) {
        continue;
      }
      const existingChildren = existing.children ?? [];
      const routeChildren = route.children ?? [];

      const merged = {
        ...route,
        ...existing, // keep backend as base
        meta: {
          ...route.meta,
          ...existing.meta, // backend meta wins on conflicts
        },
      } as RouteRecordRaw;

      if (existingChildren.length > 0 || routeChildren.length > 0) {
        merged.children = mergeRoutesByName(existingChildren, routeChildren);
      }

      Object.assign(existing, merged);
    } else {
      const clone = { ...route } as RouteRecordRaw;
      result.push(clone);
      if (clone.name && isString(clone.name)) {
        routeMap.set(clone.name as string, clone);
      }
    }
  }

  return result;
}

export { generateAccessible };
