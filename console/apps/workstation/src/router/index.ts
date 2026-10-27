import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import { resetStaticRoutes } from '@operon/utils';

import { createRouterGuard } from './guard';
import { routes } from './routes';

/**
 * Create vue-router instance
 */
const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_HISTORY === 'hash'
      ? createWebHashHistory(import.meta.env.VITE_BASE)
      : createWebHistory(import.meta.env.VITE_BASE),
  // Initial route list to be mounted into router
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash && !to.hash.includes('=')) {
      return { behavior: 'smooth', el: to.hash };
    }
    // If navigating on the same path (e.g. query string tab or filter changes),
    // preserve current scroll position instead of resetting to top: 0
    if (from?.matched?.length && to.path === from.path) {
      return false;
    }
    return { left: 0, top: 0 };
  },
  // Prohibit trailing slash if strict
  // strict: true,
});

const resetRoutes = () => resetStaticRoutes(router, routes);

// Initialize router guards
createRouterGuard(router);

// Handle dynamic chunk loading errors from new releases/stale caches
router.onError((error) => {
  console.error('[Router Error]', error);
  if (
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed')
  ) {
    window.location.reload();
  }
});

export { resetRoutes, router };
