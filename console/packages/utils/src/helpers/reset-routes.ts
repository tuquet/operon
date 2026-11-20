import type { Router, RouteRecordName, RouteRecordRaw } from 'vue-router';

import { traverseTreeValues } from '@operon-core/shared/utils';

/**
 * Reset all routes, except those specified in whitelist
 */
export function resetStaticRoutes(router: Router, routes: RouteRecordRaw[]) {
  // Get names of all static route nodes including children, excluding routes without a name field
  const staticRouteNames = traverseTreeValues<
    RouteRecordRaw,
    RouteRecordName | undefined
  >(routes, (route) => {
    // These routes must specify name to ensure unnamed routes can be properly cleaned up during reset
    if (!route.name) {
      console.warn(
        `The route with the path ${route.path} needs to have the field name specified.`,
      );
    }
    return route.name;
  });

  const { getRoutes, hasRoute, removeRoute } = router;
  const allRoutes = getRoutes();
  allRoutes.forEach(({ name }) => {
    // Delete only if it exists in route table and is not whitelisted
    if (name && !staticRouteNames.includes(name) && hasRoute(name)) {
      removeRoute(name);
    }
  });
}
