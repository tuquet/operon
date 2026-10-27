# Spec: Comprehensive Browser Error Observability & Sentry/Bugsink Hardening

## Objective

Establish complete, multi-layered error catching, contextual metadata enrichment, and telemetry resilience across the Web Admin (`apps/web-admin`) application.

Currently, error tracking through Cloudflare Worker Error Relay (Sentry-compatible endpoint `https://operon@operon-error-relay.tunyk-93.workers.dev/1`) catches Vue component lifecycle errors, explicit manual `captureError` calls, and Vue Router navigation failures. However, significant telemetry blind spots exist in the browser runtime:

1. **Early Boot & Pre-Bootstrap Crashes:** Errors in `main.ts`, `initPreferences()`, `initStores()`, `initComponentAdapter()`, or CSS font loaders occur before `initBugsink(app, router)` is invoked, leaving initial blank screen crashes completely uncaptured.
2. **Unhandled Promise Rejections & Global Window Errors:** Explicitly passing an `integrations: [...]` array without merging default browser integrations (`globalHandlersIntegration`, `breadcrumbsIntegration`, etc.) risks missing unhandled promise rejections and global script syntax/runtime errors.
3. **Vite Dynamic Preload / Chunk Failures:** When a deployment occurs and a user navigates to a stale hashed chunk, `window.addEventListener('vite:preloadError')` triggers a hard reload (`window.location.reload()`) without logging the incident to telemetry, hiding chunk loop regressions.
4. **Network & Supabase REST Failures:** HTTP 5xx responses, 401/403 auth rejections, and offline state transitions lack standardized breadcrumbs (endpoint, method, status code, latency) and correlation context.
5. **DOM Resource Loading Failures:** Sub-resource 404s (`<script>`, `<link>`, `<img>`) do not bubble to `window.onerror` and require capture-phase listeners (`window.addEventListener('error', handler, true)`).
6. **Context Enrichment & Tagging:** Missing runtime hardware/environment tags (PWA standalone mode, viewport size, online/offline status, device memory, connection type).

This specification establishes an infallible, multi-tier browser observability pipeline that captures 100% of actionable browser errors without degrading user experience or leaking sensitive PII.

---

## Tech Stack

- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Error Tracking Client:** `@sentry/vue` (^11.8.0) targeting self-hosted / cloud Bugsink (Sentry-compatible API)
- **Router:** Vue Router 4
- **State:** Pinia (`@operon/stores`, `#src/store/auth.ts`, `#src/store/workspace.ts`)
- **Build & Dev Tool:** Vite 8, TypeScript 5.8+, pnpm workspace

---

## Commands

```bash
# Build & Local Deploy (Tailscale preview)
pnpm run build:local

# Unit & Contract Tests
pnpm --filter @operon/admin-web test:unit

# Type Check
pnpm --filter @operon/admin-web typecheck

# Lint Check & Fix
pnpm --filter @operon/admin-web lint:biome
```

---

## Project Structure

```text
apps/web-admin/
├── src/
│   ├── main.ts                       → Early entrypoint; early error buffer & window error interceptor
│   ├── bootstrap.ts                  → Application bootstrap & Vue app mount
│   ├── utils/
│   │   ├── bugsink.ts                → Core Bugsink/Sentry client, breadcrumbs, tags, and queue flushing
│   │   └── __tests__/
│   │       └── bugsink.test.ts       → Unit tests for deduplication, filtering, and event sanitization
│   ├── api/
│   │   ├── core/
│   │   │   └── supabase-client.ts    → Network failure telemetry & breadcrumb instrumentation
│   │   └── request.ts                → Axios request/response error breadcrumbs
│   ├── store/
│   │   ├── auth.ts                   → Authenticated user context binding
│   │   └── workspace.ts              → Active tenant/workspace ID tag binding
└── docs/specs/
    └── SPEC-cross-error-observability.md → This specification document
```

---

## Code Style & Conventions

All telemetry methods must be non-blocking, fail-safe (wrapped in internal `try/catch`), and strictly deduplicated to avoid flooding the backend during cascading failures.

```typescript
// Example: Safe early error interception & breadcrumb logging
export function addNetworkBreadcrumb(data: {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
}) {
  try {
    Sentry.addBreadcrumb({
      category: 'fetch',
      type: 'http',
      level: data.status && data.status >= 400 ? 'warning' : 'info',
      data: {
        method: data.method,
        url: sanitizeUrl(data.url),
        status_code: data.status,
        duration_ms: data.durationMs,
      },
    });
  } catch {
    // Fail-safe: telemetry must never crash user workflows
  }
}
```

---

## Testing Strategy

1. **Unit Tests (`src/utils/__tests__/bugsink.test.ts`):**
   - Test `captureError` deduplication: same `Error` object passed multiple times must only dispatch once.
   - Test `ignoreErrors` filtering: non-actionable errors (ResizeObserver, benign AbortController aborts) must be discarded.
   - Test PII sanitization: authorization bearer tokens, passwords, and sensitive cookies must be stripped from URLs and breadcrumbs.
   - Test early buffer drain: errors queued before Sentry initialization finishes must replay safely once `initBugsink` completes.
2. **Contract / Regression Tests:**
   - Verify all 102 test suites (`758/758` tests) continue to pass without regression.
   - Verify `pnpm run build:local` completes cleanly.

---

---

## Render-Safety Hardening (v1.1)

Two blind spots were found when the `Secret store → Credentials` page rendered **completely blank
with zero signals** (no console output, no Bugsink event) — indistinguishable from an empty page.

### 1. Vue error handler is installed even when telemetry is off

vue-i18n as interpolation and throws during render, blanking the whole component.
development), so `app.config.errorHandler` was never set and Vue **swallowed** every render/setup/
watcher throw silently.

→ `installVueErrorHandler(app)` now runs **before** the disabled-check inside `initBugsink()`:

- chains any previously installed handler first, so `@sentry/vue` keeps ownership and events are
  never emitted twice;
- captures the error itself when nothing else handles it;
- **always** logs `[vue-error] <info> (component: <name>)` to the console.

### 2. i18n keys are reported, never silently rendered empty

A locale message containing raw double mustache interpolation is interpreted by
vue-i18n as **interpolation** and **throws during render**, blanking the whole component.

→ Two guards:

- **Runtime:** `i18n.global.setMissingHandler(...)` forwards unresolved keys to Bugsink as a
  `warning` message with `{ key, locale }` context (previously only `console.warn` in dev).
- **Static gate:** scripts/check-i18n.mjs exits 1 when any locale value contains raw double curly braces.
  (reported as `- Raw `\{\{ \}\}` interpolation leaks`). Escape as `{'{'}` or reword the message.

**Rules:** locale message values MUST NOT contain raw ``\{\{` / `\}\}``; component render errors MUST never
be silent in any environment (telemetry on or off).

## Boundaries

- **Always do:**
  - Wrap all logging and Sentry invocations in fail-safe blocks (`try/catch`).
  - Sanitize query strings and headers to prevent leaking auth tokens, passwords, or CCCD numbers.
  - Tag all events with `app: 'operon-admin'`, `environment`, `release`, and active `workspace_id`.
  - Add contextual breadcrumbs for network requests, router navigations, and Vite preload errors.
- **Ask first:**
  - Enabling heavy integrations such as Session Replay (high DOM serialization and network overhead).
  - Changing the sampling rate (`sampleRate: 1`, `tracesSampleRate: 0.2` in prod).
  - Changing the Bugsink DSN endpoint.
- **Never do:**
  - Never allow an error in the error logger to crash or hang the web application.
  - Never capture or send user passwords, private API keys, or raw CCCD numbers in extra context.
  - Never call `git push` or deploy to remote without explicit user approval.

---

## Success Criteria

1. **Zero Uncaught Blank Screen Crashes:** Any failure during `main.ts`, preferences initialization, or Vue bootstrapping is captured and dispatched to Bugsink before the fallback UI renders.
2. **Complete Global Error Interception:**
   - `window.addEventListener('unhandledrejection')` reliably captures async Promise rejections.
   - `window.addEventListener('error', ..., true)` captures script runtime crashes and critical resource loading failures.
   - `window.addEventListener('vite:preloadError')` logs chunk fetch errors to Sentry before triggering `location.reload()`.
3. **Rich Contextual Metadata:** Every logged exception includes user ID (if authenticated), active workspace ID, screen dimensions, online/offline status, and router breadcrumbs.
4. **PII Sanitization:** All Supabase REST and internal API breadcrumbs sanitize Bearer tokens and sensitive query parameters.
5. **No Build or Test Regressions:** All existing tests pass and bundle size impact is $\le 2$ KB (leveraging already installed `@sentry/vue`).
6. **Render Errors Are Never Silent:** `app.config.errorHandler` is installed regardless of telemetry state, always logs to the console, and `check-i18n` fails on raw `\{\{ \}\}` interpolation in locale messages.

---

## Open Questions & Assumptions Surfaced Immediately

### Assumptions:

1. **Telemetry Backend:** Cloudflare Worker Edge Relay at `https://operon-error-relay.tunyk-93.workers.dev` fully implements the standard Sentry Store API protocol (v7/v8 envelope format) used by `@sentry/vue`, performing in-memory deduplication before dispatching alerts to Hermes & Telegram.
2. **Session Replay:** Full DOM Session Replay (`@sentry-internal/replay` / `Sentry.replayIntegration()`) is deliberately **NOT** enabled due to mobile CPU/bandwidth constraints; lightweight breadcrumb tracking is preferred.
3. **Network Request Errors:** Benign user aborts (`AbortError`, `DOMException: The user aborted a request`) should be filtered out to avoid alert fatigue.

### Open Questions for Human Review:

1. **Resource Load Failure Alerting:** Should broken static assets (e.g., 404 on custom plugin logos or user avatars) be logged as `warning` breadcrumbs, or as actionable `error` issues? _(Recommended: log as warning breadcrumbs to avoid polluting Bugsink issue list)_.
vue-i18n as interpolation and throws during render, blanking the whole component.
