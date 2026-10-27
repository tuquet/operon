import type { App, ComponentPublicInstance } from 'vue';
import type { Router } from 'vue-router';

import * as Sentry from '@sentry/vue';

export interface BugsinkConfig {
  dsn?: string;
  enabled?: boolean;
  environment?: string;
  release?: string;
}

/**
 * Default Bugsink DSN resolved strictly from environment
 */
export const DEFAULT_BUGSINK_DSN =
  (import.meta.env.VITE_BUGSINK_DSN as string) || '';

const capturedErrors = new WeakSet<object>();

interface BufferedEvent {
  context?: Record<string, any>;
  error?: unknown;
  level?: Sentry.SeverityLevel;
  message?: string;
  type: 'error' | 'message';
}

let isInitialized = false;
let earlyInterceptionSetup = false;
const earlyBuffer: BufferedEvent[] = [];

/**
 * Check whether Bugsink / Sentry error tracking is disabled for current environment
 */
export function isTelemetryDisabled(customConfig?: BugsinkConfig): boolean {
  if (customConfig?.enabled === false) return true;
  if (customConfig?.enabled === true) return false;
  if (import.meta.env.VITE_BUGSINK_ENABLED === 'false') return true;
  if (import.meta.env.VITE_BUGSINK_ENABLED === 'true') return false;
  // Automatically disable in development environment
  return Boolean(import.meta.env.DEV && import.meta.env.MODE === 'development');
}

/**
 * Check if Bugsink/Sentry has finished initializing
 */
export function isBugsinkReady(): boolean {
  return isInitialized;
}

/**
 * Guarantee Vue-level errors (render / setup / watcher / i18n throws) are never
 * swallowed silently.
 *
 * Telemetry is intentionally disabled in some environments (e.g. development), and a
 * dropped render error previously produced a blank page with **no** console output and
 * **no** Sentry event — indistinguishable from an empty component. This handler always
 * surfaces the error in the console and forwards it to telemetry when available,
 * chaining any previously installed handler so events are never emitted twice.
 */
export function installVueErrorHandler(app: App) {
  const previous = app.config.errorHandler;

  app.config.errorHandler = (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string,
  ) => {
    const component =
      (instance?.$options as undefined | { name?: string })?.name ?? 'unknown';

    // Forward first: an installed integration (e.g. @sentry/vue) keeps ownership of
    // the event, so we only capture ourselves when nothing else handles it.
    if (previous) {
      previous(err, instance, info);
    } else if (isBugsinkReady()) {
      captureError(err, { component, vue_info: String(info) });
    }

    // Always visible in the console — a swallowed render error must never be silent.
    console.error(`[vue-error] ${info} (component: ${component})`, err);
  };
}

/**
 * Sanitize URLs to redact sensitive query parameters (tokens, keys, secrets)
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const isAbsolute =
      rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
    const url = new URL(
      rawUrl,
      typeof window === 'undefined'
        ? 'http://localhost'
        : window.location.origin,
    );
    const sensitiveKeys = [
      'token',
      'access_token',
      'refresh_token',
      'apikey',
      'key',
      'secret',
      'password',
      'code',
      'cccd',
    ];
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return isAbsolute ? url.toString() : url.pathname + url.search;
  } catch {
    return rawUrl;
  }
}

/**
 * Early error interception setup before Vue or Sentry boots
 */
export function initEarlyErrorInterception() {
  if (typeof window === 'undefined' || earlyInterceptionSetup) {
    return;
  }
  if (isTelemetryDisabled()) {
    return;
  }
  earlyInterceptionSetup = true;

  // 1. Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason =
        event.reason ||
        new Error(`Unhandled rejection: ${String(event.reason)}`);
      captureError(reason, {
        phase: 'unhandled_promise_rejection',
      });
    } catch {
      // Fail-safe
    }
  });

  // 2. Global Script Runtime and Sub-Resource Loading Errors (capture phase)
  window.addEventListener(
    'error',
    (event) => {
      try {
        if (event.error) {
          captureError(event.error, {
            colno: event.colno,
            filename: event.filename,
            lineno: event.lineno,
            phase: 'window_global_error',
          });
        } else if (event.target && event.target !== window) {
          // Sub-resource loading failure (e.g. 404 for img, script, link)
          const target = event.target as HTMLElement;
          const tagName = target.tagName?.toLowerCase();
          const sourceUrl = (target as any).src || (target as any).href;
          if (sourceUrl) {
            addBreadcrumb({
              category: 'resource',
              level: 'warning',
              message: `Resource 404/load error: <${tagName}> ${sanitizeUrl(sourceUrl)}`,
            });
          }
        }
      } catch {
        // Fail-safe
      }
    },
    true,
  );
}

/**
 * Initialize Bugsink (Sentry-compatible) error logging for Vue 3 application
 */
export function initBugsink(
  app: App,
  router?: Router,
  customConfig?: BugsinkConfig,
) {
  // Install the Vue error handler BEFORE any early return: even with telemetry
  // disabled we must never swallow render errors silently.
  installVueErrorHandler(app);

  if (isTelemetryDisabled(customConfig)) {
    return;
  }

  const dsn =
    customConfig?.dsn ||
    import.meta.env.VITE_BUGSINK_DSN ||
    DEFAULT_BUGSINK_DSN;

  if (!dsn) {
    return;
  }

  const environment =
    customConfig?.environment ||
    import.meta.env.MODE ||
    (import.meta.env.PROD ? 'production' : 'development');

  const release =
    customConfig?.release || import.meta.env.VITE_APP_VERSION || '5.8.0';

  try {
    Sentry.init({
      app,
      dsn,
      environment,
      release,
      integrations: (defaultIntegrations) => {
        return router
          ? [
              ...defaultIntegrations,
              Sentry.browserTracingIntegration({ router }),
            ]
          : defaultIntegrations;
      },
      // 100% of errors are captured
      sampleRate: 1,
      // Sample 20% of transactions in production to conserve bandwidth, 100% in development
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
      // Filter out non-actionable or transient browser exceptions
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Network request failed',
        'AbortError',
        'Failed to fetch dynamically imported module',
      ],
      beforeSend(event) {
        // Tag events specifically as Admin client
        event.tags = {
          ...event.tags,
          app: 'operon-admin',
        };

        // Redact any sensitive tokens from URL
        if (event.request?.url) {
          event.request.url = sanitizeUrl(event.request.url);
        }

        // Redact sensitive URLs from breadcrumbs
        if (event.breadcrumbs) {
          for (const b of event.breadcrumbs) {
            if (b.data?.url && typeof b.data.url === 'string') {
              b.data.url = sanitizeUrl(b.data.url);
            }
          }
        }

        return event;
      },
    });

    isInitialized = true;

    // Drain any events queued before initialization completed
    while (earlyBuffer.length > 0) {
      const item = earlyBuffer.shift();
      if (!item) break;
      try {
        if (item.type === 'error' && item.error) {
          Sentry.captureException(item.error, { extra: item.context });
        } else if (item.type === 'message' && item.message) {
          Sentry.captureMessage(item.message, {
            extra: item.context,
            level: item.level,
          });
        }
      } catch {
        // Fail-safe
      }
    }

    if (router) {
      router.onError((error, to, from) => {
        captureError(error, {
          from: from?.fullPath,
          phase: 'router_navigation',
          to: to?.fullPath,
        });
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('opn:workspace-changed', ((
        event: CustomEvent<{ tenantId?: string }>,
      ) => {
        if (event.detail?.tenantId) {
          setBugsinkTag('workspace_id', event.detail.tenantId);
        }
      }) as EventListener);
    }
  } catch (error) {
    console.warn('[Bugsink] Failed to initialize error tracker:', error);
  }
}

/**
 * Manually capture an exception and send to Bugsink (deduplicated per Error instance)
 */
export function captureError(error: unknown, context?: Record<string, any>) {
  try {
    if (isTelemetryDisabled()) {
      return;
    }

    if (error && typeof error === 'object') {
      if (capturedErrors.has(error)) {
        return;
      }
      capturedErrors.add(error);
    }

    if (!isInitialized) {
      earlyBuffer.push({ context, error, type: 'error' });
      return;
    }

    Sentry.captureException(error, {
      extra: context,
    });
  } catch {
    // Fail-safe: error logging must never crash the UI
  }
}

/**
 * Manually send an informational or warning message to Bugsink
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>,
) {
  try {
    if (isTelemetryDisabled()) {
      return;
    }

    if (!isInitialized) {
      earlyBuffer.push({ context, level, message, type: 'message' });
      return;
    }

    Sentry.captureMessage(message, {
      extra: context,
      level,
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Record a breadcrumb in the active Sentry scope
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  try {
    Sentry.addBreadcrumb(breadcrumb);
  } catch {
    // Fail-safe
  }
}

/**
 * Record an HTTP network breadcrumb with sanitized URL
 */
export function addNetworkBreadcrumb(data: {
  durationMs?: number;
  method: string;
  status?: number;
  url: string;
}) {
  try {
    addBreadcrumb({
      category: 'http',
      data: {
        duration_ms: data.durationMs,
        method: data.method.toUpperCase(),
        status_code: data.status,
        url: sanitizeUrl(data.url),
      },
      level: data.status && data.status >= 400 ? 'warning' : 'info',
      type: 'http',
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Associate authenticated user metadata with Bugsink error reports
 */
export function setBugsinkUser(
  user: null | {
    email?: string;
    realName?: string;
    roles?: string[];
    userId?: string;
    username?: string;
  },
) {
  try {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({
      email: user.email,
      id: user.userId,
      username: user.username || user.realName,
    });
    if (user.roles?.length) {
      Sentry.setTag('user_role', user.roles.join(','));
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Attach a custom tag to the active Bugsink scope
 */
export function setBugsinkTag(key: string, value: null | string | undefined) {
  try {
    Sentry.setTag(key, value ?? undefined);
  } catch {
    // Fail-safe
  }
}

export { Sentry };
