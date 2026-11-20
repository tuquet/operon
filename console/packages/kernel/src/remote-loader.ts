import type { Component } from 'vue';

export interface MicroAppManifest<TRoute = any> {
  /** Unique micro-app identifier (e.g. 'automation', 'system', 'tenants') */
  id: string;
  /** Human-readable display name */
  name?: string;
  /** Version string */
  version?: string;
  /** Default redirect subpath relative to app root */
  defaultPath: string;
  /** Lazy-loads the micro-app's scoped locale dictionary when its route activates */
  setupLocales?: () => Promise<void>;
  /** Generates route records given an i18n translation function */
  routes: (t: (key: string) => string) => TRoute[];
}

export interface RemoteRouteOptions<TRoute = any> {
  /** Micro-app identifier */
  appId: string;
  /** Dev server port (e.g. 5321) */
  devPort?: number;
  /** Dev server hostname (default: localhost) */
  devHost?: string;
  /** Fallback manifest bundled with the application */
  manifest: MicroAppManifest<TRoute>;
  /** i18n translation function */
  t: (key: string) => string;
  /**
   * Attempt dynamic remote loading from standalone micro-app dev server.
   * Defaults to true only when `VITE_REMOTE_DEV=true`; otherwise uses the
   * workspace-bundled module directly to avoid dead-port connection errors.
   */
  preferDynamic?: boolean;
  /** Timeout in ms for remote dev server probe before falling back. Default: 1500 */
  timeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Remote module timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Creates Vue Router lazy route records (`() => Promise<Component>`) without
 * wrapping in `defineAsyncComponent()` (avoids `[VUE_ROUTER_R0029]`).
 * Supports optional federated dev loading when `preferDynamic` / `VITE_REMOTE_DEV=true` is enabled,
 * with automatic fallback to the workspace-bundled loader.
 */
export function createRemoteRoute<
  TRoute extends Record<string, any> = Record<string, any>,
>(options: RemoteRouteOptions<TRoute>): TRoute[] {
  const envRemoteDev =
    (import.meta as { env?: { VITE_REMOTE_DEV?: string } }).env
      ?.VITE_REMOTE_DEV === 'true';

  const {
    appId,
    devHost = 'localhost',
    devPort,
    manifest,
    preferDynamic = envRemoteDev,
    t,
    timeoutMs = 1500,
  } = options;

  const rawRoutes = manifest.routes(t);

  return rawRoutes.map((route) => {
    if (typeof route.component === 'function') {
      const originalLoader = route.component as () => Promise<Component>;

      const lazyLoader = async (): Promise<Component> => {
        const isDev =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV));

        if (isDev && preferDynamic && devPort) {
          try {
            const remoteUrl = `http://${devHost}:${devPort}/src/remote-entry.ts`;
            const remoteMod = (await withTimeout(
              import(/* @vite-ignore */ remoteUrl),
              timeoutMs,
            )) as Record<string, unknown>;
            const remoteManifest = (remoteMod[`${appId}Manifest`] ||
              remoteMod.default ||
              remoteMod.manifest) as MicroAppManifest<TRoute> | undefined;

            if (remoteManifest && typeof remoteManifest.routes === 'function') {
              const remoteRoutes = remoteManifest.routes(t);
              const matchingRoute = remoteRoutes.find(
                (r) => r.name === route.name || r.path === route.path,
              );
              if (
                matchingRoute &&
                typeof matchingRoute.component === 'function'
              ) {
                const [remoteComponent] = await Promise.all([
                  (matchingRoute.component as () => Promise<Component>)(),
                  (remoteManifest.setupLocales ?? manifest.setupLocales)?.(),
                ]);
                return remoteComponent;
              }
            }
          } catch {
            // Remote dev server offline or timed out; fall through to bundled component
          }
        }

        const [bundledComponent] = await Promise.all([
          originalLoader(),
          manifest.setupLocales?.(),
        ]);
        return bundledComponent;
      };

      return {
        ...route,
        component: lazyLoader,
      };
    }

    return route;
  });
}
