import type { Router, RouteRecordRaw } from 'vue-router';

import type { ExRouteRecordRaw, MenuRecordRaw } from '@operon-core/typings';
import type { RouteMeta } from '@operon-core/typings/vue-router';

import { filterTree, mapTree, sortTree } from '@operon-core/shared/utils';

/**
 * Generate menu list based on routes
 * @param routes - Route configuration list
 * @param router - Vue Router instance
 * @returns Generated menu list
 */
function generateMenus(
  routes: RouteRecordRaw[],
  router: Router,
): MenuRecordRaw[] {
  // Convert route list to an object map keyed by name
  const finalRoutesMap: { [key: string]: string } = Object.fromEntries(
    router.getRoutes().map(({ name, path }) => [name, path]),
  );

  let menus = mapTree<ExRouteRecordRaw, MenuRecordRaw>(routes, (route) => {
    // Get final route path
    const path = finalRoutesMap[route.name as string] ?? route.path ?? '';

    const {
      meta = {} as RouteMeta,
      name: routeName,
      redirect,
      children = [],
    } = route;
    const {
      activeIcon,
      badge,
      badgeType,
      badgeVariants,
      hideChildrenInMenu = false,
      icon,
      link,
      order,
      title = '',
      query,
    } = meta;

    // Ensure menu name is not empty
    const name = (title || routeName || '') as string;

    // Handle child menus
    const resultChildren = hideChildrenInMenu
      ? []
      : ((children as MenuRecordRaw[]) ?? []);

    // Set parent-child relationship for child menus
    if (resultChildren.length > 0) {
      resultChildren.forEach((child) => {
        child.parents = [...(route.parents ?? []), path];
        child.parent = path;
      });
    }

    // Determine final path
    const resultPath = hideChildrenInMenu ? redirect || path : link || path;

    return {
      activeIcon,
      badge,
      badgeType,
      badgeVariants,
      icon,
      name,
      query,
      order,
      parent: route.parent,
      parents: route.parents,
      path: resultPath,
      show: !meta.hideInMenu,
      children: resultChildren,
    };
  });

  // Sort menus, avoiding order=0 being replaced with 999
  menus = sortTree(menus, (a, b) => (a?.order ?? 999) - (b?.order ?? 999));

  // Filter out hidden menu items
  return filterTree(menus, (menu) => !!menu.show);
}

export { generateMenus };
