import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@operon/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

/** Dynamic routes */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** External routes list; standalone pages without Layout, e.g. for embedding (hidden from menu) */
const staticRoutes: RouteRecordRaw[] = [];
const externalRoutes: RouteRecordRaw[] = [];

/** Route list composed of core routes, external routes, and 404 fallback;
 *  bypasses permission check (always accessible) */
const routes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...externalRoutes,
  fallbackNotFoundRoute,
];

/** Basic route names list; bypasses permission interceptors */
const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

/** Protected routes requiring permission verification (dynamic + static) */
const accessRoutes = [...dynamicRoutes, ...staticRoutes];
export { accessRoutes, coreRouteNames, routes };
