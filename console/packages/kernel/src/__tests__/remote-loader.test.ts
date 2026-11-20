import type { MicroAppManifest } from '../remote-loader';

import { describe, expect, it, vi } from 'vitest';

import { createRemoteRoute } from '../remote-loader';

describe('createRemoteRoute', () => {
  const dummyManifest: MicroAppManifest = {
    id: 'dummy',
    name: 'Dummy App',
    defaultPath: 'overview',
    routes: (t) => [
      {
        path: 'overview',
        name: 'DummyOverview',
        component: () =>
          Promise.resolve({ default: { name: 'DummyComponent' } }),
        meta: { title: t('dummy.title') },
      },
      {
        path: 'static-stub',
        name: 'DummyStatic',
        meta: { title: t('dummy.static') },
      },
    ],
  };

  it('returns native lazy loader functions for Vue Router and preserves route metadata', async () => {
    const wrappedRoutes = createRemoteRoute({
      appId: 'dummy',
      devPort: 9999,
      manifest: dummyManifest,
      t: (key) => key,
    });

    expect(wrappedRoutes).toHaveLength(2);
    expect(wrappedRoutes[0]?.name).toBe('DummyOverview');
    expect(wrappedRoutes[0]?.path).toBe('overview');
    expect(wrappedRoutes[0]?.meta?.title).toBe('dummy.title');
    const loader = wrappedRoutes[0]?.component as
      | (() => Promise<unknown>)
      | undefined;
    expect(typeof loader).toBe('function');
    if (!loader) {
      throw new Error('Lazy route loader is not defined');
    }

    const resolved = await loader();
    expect(resolved).toEqual({ default: { name: 'DummyComponent' } });

    // Static route without component is preserved as-is
    expect(wrappedRoutes[1]?.name).toBe('DummyStatic');
    expect(wrappedRoutes[1]?.component).toBeUndefined();
  });

  it('falls back to bundled component when opted-in dev server is offline', async () => {
    const wrappedRoutes = createRemoteRoute({
      appId: 'dummy',
      devPort: 9999,
      manifest: dummyManifest,
      t: (key) => key,
      preferDynamic: true,
      timeoutMs: 100,
    });

    const loader = wrappedRoutes[0]?.component as
      | (() => Promise<unknown>)
      | undefined;
    expect(typeof loader).toBe('function');
    if (!loader) {
      throw new Error('Lazy route loader is not defined');
    }

    const resolved = await loader();
    expect(resolved).toEqual({ default: { name: 'DummyComponent' } });
  });

  it('invokes manifest.setupLocales in parallel when lazy route activates', async () => {
    const setupLocales = vi.fn(async () => undefined);
    const wrappedRoutes = createRemoteRoute({
      appId: 'dummy',
      manifest: {
        ...dummyManifest,
        setupLocales,
      },
      t: (key) => key,
    });

    expect(setupLocales).not.toHaveBeenCalled();

    const loader = wrappedRoutes[0]?.component as
      | (() => Promise<unknown>)
      | undefined;
    expect(typeof loader).toBe('function');
    await loader?.();

    expect(setupLocales).toHaveBeenCalledTimes(1);
  });
});
