import type { App } from 'vue'

export const DEFAULT_BUGSINK_DSN = 'https://operon@operon-error-relay.tunyk-93.workers.dev/1'

const IGNORED_PATTERNS = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Network request failed',
  'AbortError',
  'Failed to fetch dynamically imported module',
]

const capturedErrors = new WeakSet<object>()

interface ParsedDsn {
  endpoint: string
  dsn: string
}

function parseBugsinkDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const projectId = url.pathname.replace(/^\/+/, '')
    if (!publicKey || !projectId)
      return null
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${publicKey}&sentry_client=operon-bugsink/1.0.0`
    return { dsn, endpoint }
  }
  catch {
    return null
  }
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID().replace(/-/g, '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function parseStackFrames(stack?: string) {
  if (!stack)
    return []
  return stack
    .split('\n')
    .slice(1, 25)
    .map((line) => {
      const trimmed = line.trim()
      const match = trimmed.match(/^at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?$/)
      if (!match)
        return { filename: trimmed, function: '<anonymous>' }
      return {
        colno: Number(match[4]),
        filename: match[2],
        function: match[1] || '<anonymous>',
        in_app: !match[2].includes('node_modules'),
        lineno: Number(match[3]),
      }
    })
    .reverse()
}

function sendEnvelope(parsed: ParsedDsn, payload: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof fetch === 'undefined')
    return
  const eventId = (payload.event_id as string) || createEventId()
  const header = JSON.stringify({
    dsn: parsed.dsn,
    event_id: eventId,
    sent_at: new Date().toISOString(),
  })
  const itemHeader = JSON.stringify({ type: 'event' })
  const body = `${header}\n${itemHeader}\n${JSON.stringify({ ...payload, event_id: eventId })}`

  fetch(parsed.endpoint, {
    body,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    keepalive: true,
    method: 'POST',
    mode: 'cors',
  }).catch(() => {})
}

export function captureError(error: unknown, context?: Record<string, unknown>, dsn = DEFAULT_BUGSINK_DSN) {
  try {
    if (typeof window === 'undefined')
      return
    if (error && typeof error === 'object') {
      if (capturedErrors.has(error))
        return
      capturedErrors.add(error)
    }

    const parsed = parseBugsinkDsn(dsn)
    if (!parsed)
      return

    const errObj = error instanceof Error ? error : new Error(String(error))
    if (IGNORED_PATTERNS.some(p => errObj.message?.includes(p)))
      return

    sendEnvelope(parsed, {
      environment: import.meta.env.MODE || (import.meta.env.PROD ? 'production' : 'development'),
      event_id: createEventId(),
      exception: {
        values: [
          {
            stacktrace: { frames: parseStackFrames(errObj.stack) },
            type: errObj.name || 'Error',
            value: errObj.message || String(error),
          },
        ],
      },
      extra: context,
      level: 'error',
      platform: 'javascript',
      request: {
        headers: { 'User-Agent': navigator.userAgent },
        url: window.location.href,
      },
      tags: { app: 'specter-docs' },
      timestamp: Date.now() / 1000,
    })
  }
  catch {}
}

export function initBugsink(app: App, dsn?: string) {
  if (typeof window === 'undefined')
    return
  const resolvedDsn = dsn || import.meta.env.VITE_BUGSINK_DSN || DEFAULT_BUGSINK_DSN

  const prevErrorHandler = app.config.errorHandler
  app.config.errorHandler = (err, instance, info) => {
    captureError(err, { component: instance?.$options?.name, info, phase: 'vue_error_handler' }, resolvedDsn)
    prevErrorHandler?.(err, instance, info)
  }

  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message), {
      colno: event.colno,
      filename: event.filename,
      lineno: event.lineno,
      phase: 'window_onerror',
    }, resolvedDsn)
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason || new Error('Unhandled Promise rejection'), {
      phase: 'unhandled_rejection',
    }, resolvedDsn)
  })
}
