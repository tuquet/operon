export interface Env {
  WEBHOOK_SECRET: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

// In-memory cache per Edge worker instance to deduplicate errors within 60s
const recentErrors = new Map<string, number>()

function getDedupeKey(project: string, type: string, value: string, location: string): string {
  return `${project}:${type}:${value.slice(0, 80)}:${location}`
}

function cleanCache() {
  const now = Date.now()
  for (const [key, ts] of recentErrors.entries()) {
    if (now - ts > 60_000) {
      recentErrors.delete(key)
    }
  }
}

async function sendTelegramAlert(token: string, chatId: string, errorData: any) {
  const message = `🚨 <b>[Operon Error Alert - Edge Relay]</b>\n\n` +
    `📦 <b>Project:</b> <code>${errorData.project}</code>\n` +
    `⚠️ <b>Type:</b> <code>${errorData.type}</code>\n` +
    `💬 <b>Message:</b> <code>${errorData.value}</code>\n` +
    `📍 <b>Location:</b> <code>${errorData.location}</code>\n` +
    `🌐 <b>URL:</b> ${errorData.url}\n` +
    `🕒 <b>Time:</b> ${new Date().toISOString()}`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'operon-error-relay' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Accept Sentry envelope endpoint (/api/{projectId}/envelope/)
    if (request.method === 'POST') {
      try {
        const bodyText = await request.text()
        const pathParts = url.pathname.split('/').filter(Boolean)
        const projectId = pathParts[1] || 'default'

        // Parse Sentry Envelope lines (newline separated JSONs)
        const lines = bodyText.split('\n')
        let eventPayload: any = null

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)
            if (parsed.exception || parsed.message || parsed.level) {
              eventPayload = parsed
              break
            }
          } catch {}
        }

        if (eventPayload) {
          const exc = eventPayload.exception?.values?.[0] || {}
          const errorType = exc.type || 'Error'
          const errorValue = exc.value || eventPayload.message || 'Unknown error'
          const frame = exc.stacktrace?.frames?.[exc.stacktrace?.frames?.length - 1] || {}
          const location = frame.filename ? `${frame.filename}:${frame.lineno || '?'}` : (eventPayload.culprit || 'unknown')
          const project = eventPayload.tags?.app || `operon-project-${projectId}`
          const userUrl = eventPayload.request?.url || 'N/A'

          // Check deduplication (anti-spam edge cache)
          cleanCache()
          const dedupeKey = getDedupeKey(project, errorType, errorValue, location)
          const now = Date.now()

          if (!recentErrors.has(dedupeKey)) {
            recentErrors.set(dedupeKey, now)

            const errorData = {
              project,
              type: errorType,
              value: errorValue,
              location,
              url: userUrl,
            }

            // Dispatch alert directly via Edge (Zero RAM on VPS)
            ctx.waitUntil(sendTelegramAlert(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, errorData).catch(console.error))
          }
        }

        // Return Sentry event ID immediately
        return new Response(JSON.stringify({ id: crypto.randomUUID() }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
}
