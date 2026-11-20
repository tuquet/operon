import type { RouteRecordRaw } from 'vue-router';

import { filterRouteTree } from './route-filter';

/**
 * Filter route tree by checking meta.plugin against installed system plugins.
 * - If a route requires a plugin (route.meta.plugin) that is not in `installedPlugins`, it is omitted.
 * - Children are filtered recursively.
 * - If a parent route has no own component and all its children were filtered out, it is pruned.
 *
 * @param routes - List of RouteRecordRaw objects
 * @param installedPlugins - Array of plugin IDs that are currently installed (e.g. ['identity', 'operon'])
 */
export function filterRoutesByPlugins(
  routes: RouteRecordRaw[],
  installedPlugins: string[],
): RouteRecordRaw[] {
  return filterRouteTree(routes, (route) => {
    const requiredPlugin = (
      route.meta as undefined | { plugin?: string | string[] }
    )?.plugin;
    if (!requiredPlugin) {
      return true;
    }
    return Array.isArray(requiredPlugin)
      ? requiredPlugin.some((p) => installedPlugins.includes(p))
      : installedPlugins.includes(requiredPlugin);
  });
}
