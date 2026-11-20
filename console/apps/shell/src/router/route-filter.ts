import type { RouteRecordRaw } from 'vue-router';

/**
 * Recursively filters a Vue Router route tree using a predicate.
 * Layout parents (routes without an own `component`) whose children are all
 * filtered out are automatically pruned.
 */
export function filterRouteTree(
  routes: RouteRecordRaw[],
  predicate: (route: RouteRecordRaw) => boolean,
): RouteRecordRaw[] {
  if (!Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  const result: RouteRecordRaw[] = [];

  for (const route of routes) {
    if (!predicate(route)) {
      continue;
    }

    const cloned = { ...route };
    if (Array.isArray(cloned.children) && cloned.children.length > 0) {
      cloned.children = filterRouteTree(cloned.children, predicate);
      if (cloned.children.length === 0 && !cloned.component) {
        continue;
      }
    }

    result.push(cloned);
  }

  return result;
}
