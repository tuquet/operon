import type {
  NavigationGuard,
  NavigationHookAfter,
  RouteLocationNormalizedLoaded,
  Router,
} from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLayoutHook } from '../index';

const mockPreferences = vi.hoisted(() => ({
  preferences: {
    tabbar: { enable: true },
    transition: { enable: true, name: 'fade-slide' },
  },
  usePreferences: () => ({
    keepAlive: true,
  }),
}));

vi.mock('@operon/preferences', () => mockPreferences);

const routerHolder = vi.hoisted(() => ({
  current: undefined as Router | undefined,
}));

vi.mock('vue-router', () => ({
  useRouter: () => routerHolder.current,
}));

function createRouterMock() {
  let afterHook: NavigationHookAfter | undefined;
  let beforeGuard: NavigationGuard | undefined;

  const router = {
    afterEach: vi.fn((hook: NavigationHookAfter) => {
      afterHook = hook;
    }),
    beforeEach: vi.fn((guard: NavigationGuard) => {
      beforeGuard = guard;
    }),
  } as unknown as Router;

  return {
    router,
    triggerBefore: (to: any, from: any) => beforeGuard?.(to, from, vi.fn()),
    triggerAfter: (to: any, from: any) => afterHook?.(to, from),
  };
}

describe('useLayoutHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns configured transition name for normal route navigation', () => {
    const { router, triggerBefore } = createRouterMock();
    routerHolder.current = router;

    const { getTransitionName } = useLayoutHook();

    const fromRoute = {
      path: '/dashboard',
      matched: [{ path: '/dashboard' }],
      meta: {},
    } as any;
    const toRoute = {
      path: '/tenants',
      matched: [{ path: '/tenants' }],
      meta: {},
    } as any;

    triggerBefore(toRoute, fromRoute);

    expect(getTransitionName(toRoute)).toBe('fade-slide');
  });

  it('suppresses transition when navigating on the same path (e.g. query tab changes)', () => {
    const { router, triggerBefore } = createRouterMock();
    routerHolder.current = router;

    const { getTransitionName } = useLayoutHook();

    const fromRoute = {
      path: '/tenants/detail/1',
      fullPath: '/tenants/detail/1?tab=overview',
      matched: [{ path: '/tenants/detail/1' }],
      meta: {},
    } as any;
    const toRoute = {
      path: '/tenants/detail/1',
      fullPath: '/tenants/detail/1?tab=members',
      matched: [{ path: '/tenants/detail/1' }],
      meta: {},
    } as any;

    // Simulate switching subtabs on tenant detail page
    triggerBefore(toRoute, fromRoute);

    expect(getTransitionName(toRoute)).toBeUndefined();
  });

  it('suppresses transition when route has meta.ignoreTransition', () => {
    const { router } = createRouterMock();
    routerHolder.current = router;

    const { getTransitionName } = useLayoutHook();

    const route = {
      path: '/special',
      meta: { ignoreTransition: true },
    } as RouteLocationNormalizedLoaded;

    expect(getTransitionName(route)).toBeUndefined();
  });

  it('resumes transition for subsequent different path navigation', async () => {
    vi.useFakeTimers();
    const { router, triggerBefore, triggerAfter } = createRouterMock();
    routerHolder.current = router;

    const { getTransitionName } = useLayoutHook();

    // 1. Same-path query change
    triggerBefore(
      { path: '/page', fullPath: '/page?tab=2', matched: [{ path: '/page' }] },
      { path: '/page', fullPath: '/page?tab=1', matched: [{ path: '/page' }] },
    );
    expect(getTransitionName({ path: '/page' } as any)).toBeUndefined();

    triggerAfter({ path: '/page' }, { path: '/page' });
    vi.runAllTimers();

    // 2. Different path navigation
    triggerBefore(
      {
        path: '/settings',
        fullPath: '/settings',
        matched: [{ path: '/settings' }],
      },
      { path: '/page', fullPath: '/page?tab=2', matched: [{ path: '/page' }] },
    );
    expect(getTransitionName({ path: '/settings' } as any)).toBe('fade-slide');
    vi.useRealTimers();
  });
});
