import type { VNode } from 'vue';
import type {
  RouteLocationNormalizedLoaded,
  RouteLocationNormalizedLoadedGeneric,
} from 'vue-router';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { preferences, usePreferences } from '@operon/preferences';

/**
 * Transform component and attach name automatically
 * @param component
 * @param route
 */
export function transformComponent(
  component: VNode,
  route: RouteLocationNormalizedLoadedGeneric,
) {
  // Component view not found; return fallback view if set, otherwise throw error
  if (!component) {
    console.error(
      'Component view not found，please check the route configuration',
    );
    return undefined;
  }

  const routeName = route.name as string;
  // Return directly if component lacks name
  if (!routeName) {
    return component;
  }
  const componentName = (component?.type as any)?.name;

  // Return directly if name is already set
  if (componentName) {
    return component;
  }

  // Return directly if componentName matches routeName
  if (componentName === routeName) {
    return component;
  }

  // Set name
  component.type ||= {};
  (component.type as any).name = routeName;

  return component;
}

/**
 * Layout composables
 */
export function useLayoutHook() {
  const { keepAlive } = usePreferences();

  let router: ReturnType<typeof useRouter> | undefined;
  try {
    router = useRouter();
  } catch {
    // Router may not be injected in unit test environments
  }

  const isSamePathNavigation = ref(false);

  if (router) {
    router.beforeEach((to, from) => {
      // Intra-page navigation: if navigating within the same route path
      // (such as query string or hash changes for tabs/filters), suppress transition animation
      const isInitialNav = !from.matched || from.matched.length === 0;
      isSamePathNavigation.value = !isInitialNav && from.path === to.path;
    });

    router.afterEach(() => {
      if (isSamePathNavigation.value) {
        // Reset after microtask DOM patching so subsequent route transitions work normally
        setTimeout(() => {
          isSamePathNavigation.value = false;
        }, 0);
      }
    });
  }

  /**
   * Whether to use animations
   */
  const getEnabledTransition = computed(() => {
    const { transition } = preferences;
    const transitionName = transition.name;
    return transitionName && transition.enable;
  });

  /**
   * Get route transition animation
   * @param route
   */
  function getTransitionName(route?: RouteLocationNormalizedLoaded) {
    // Suppress animation when navigating on the same route path (e.g. query tab changes)
    if (isSamePathNavigation.value) {
      return undefined;
    }

    // Suppress animation if explicitly requested in route meta
    if (route?.meta?.ignoreTransition) {
      return undefined;
    }

    // Do not use animation if disabled in preferences
    const { tabbar, transition } = preferences;
    const transitionName = transition.name;
    if (!transitionName || !transition.enable) {
      return;
    }

    // If tabs disabled or caching disabled, use global transition config
    if (!tabbar.enable || !keepAlive) {
      return transitionName;
    }

    // Pages already open and loaded skip transition animation
    return transitionName;
  }

  return {
    getEnabledTransition,
    getTransitionName,
  };
}
