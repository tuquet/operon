import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const webAdminDir = path.join(repoRoot, 'apps', 'workstation');

const PORT = Number(process.env.VITE_PORT || 5666);
const HOST = '127.0.0.1';
const TARGET_URL = process.env.TARGET_URL || `http://${HOST}:${PORT}`;

/**
 * Resolve standard Chrome/Chromium/Edge binary across Windows & Linux.
 * Note: Intentionally avoids anti-detect stealth browsers (~/.operon/browser/runtimes)
 * because stealth builds suppress CDP Runtime.consoleAPICalled events at the Blink C++ layer.
 */
function resolveStandardBrowserPath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates =
    process.platform === 'win32'
      ? [
          path.join(
            process.env.PROGRAMFILES || 'C:/Program Files',
            'Google/Chrome/Application/chrome.exe',
          ),
          path.join(
            process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)',
            'Google/Chrome/Application/chrome.exe',
          ),
          path.join(
            process.env.LOCALAPPDATA || '',
            'Google/Chrome/Application/chrome.exe',
          ),
          path.join(
            process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)',
            'Microsoft/Edge/Application/msedge.exe',
          ),
          path.join(
            process.env.PROGRAMFILES || 'C:/Program Files',
            'Microsoft/Edge/Application/msedge.exe',
          ),
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/microsoft-edge',
        ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Clean up stale Vite temporary dep directories left behind by force-killed processes on Windows.
 */
function cleanStaleViteTempDirs() {
  const viteCacheDir = path.join(webAdminDir, 'node_modules', '.vite');
  if (!fs.existsSync(viteCacheDir)) return;
  try {
    for (const entry of fs.readdirSync(viteCacheDir)) {
      if (entry.startsWith('deps_temp_')) {
        fs.rmSync(path.join(viteCacheDir, entry), {
          force: true,
          recursive: true,
        });
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if a local TCP port is already accepting connections.
 */
function isPortListening(port, host = HOST) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function createSuperadminJwt() {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      app_metadata: { platform_role: 'superadmin' },
      email: 'admin@operon.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: 'authenticated',
      sub: '00000000-0000-0000-0000-000000000001',
      user_metadata: { full_name: 'Superadmin' },
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function isIgnoredBenignMessage(entry) {
  const text = entry.text || '';
  const url = entry.url || '';

  // 1. Expected PNA loopback daemon probe when local Rust daemon (:8765) is offline
  if (
    url.includes('127.0.0.1:8765') ||
    text.includes('127.0.0.1:8765') ||
    (text.includes('ERR_CONNECTION_REFUSED') && url.includes(':8765'))
  ) {
    return true;
  }

  // 2. Third-party Cloudflare Turnstile iframe postMessage / challenge on localhost dev
  if (
    text.includes('Cloudflare Turnstile') ||
    url.includes('challenges.cloudflare.com') ||
    text.includes(
      "The target origin provided ('https://challenges.cloudflare.com')",
    ) ||
    /updating from\s+\d+\s+to\s+\d+/i.test(text) ||
    text.includes('updating from')
  ) {
    return true;
  }

  // 3. Built-in upstream @operon/vite-config serve-time migration notice banner
  if (
    text.includes(
      'Named field slot control bindings moved to `slotProps.componentProps`',
    )
  ) {
    return true;
  }

  // 4. Headless Chromium WebGL driver notices
  if (
    text.includes('GL Driver Message') ||
    text.includes('GPU stall due to ReadPixels') ||
    text.includes('[.WebGL')
  ) {
    return true;
  }

  // 5. Headless test synthetic token / offline backend probes (Supabase auth / mock JWT token exchange)
  if (
    url.includes('/auth/v1/user') ||
    url.includes('/rest/v1/permissions') ||
    url.includes('/auth/v1/token?grant_type=refresh_token') ||
    text.includes('auth/v1/user') ||
    text.includes('rest/v1/permissions') ||
    text.includes('grant_type=refresh_token')
  ) {
    return true;
  }

  return false;
}

async function runConsoleGate() {
  const startTime = Date.now();
  let viteServer = null;
  let browser = null;

  const alreadyRunning = await isPortListening(PORT);
  if (alreadyRunning) {
    console.log(`ℹ️  Reusing active Vite dev server at ${TARGET_URL}`);
  } else {
    cleanStaleViteTempDirs();
    console.log(
      `🚀 Starting headless Vite dev server for @operon/workstation on port ${PORT}...`,
    );
    process.chdir(webAdminDir);
    viteServer = await createServer({
      configFile: path.join(webAdminDir, 'vite.config.ts'),
      logLevel: 'error',
      mode: 'development',
      root: webAdminDir,
      server: {
        host: HOST,
        port: PORT,
        strictPort: true,
        warmup: { clientFiles: [] },
      },
    });
    await viteServer.listen();
    console.log(`✅ Vite dev server listening at ${TARGET_URL}`);
  }

  const executablePath = resolveStandardBrowserPath();
  console.log(
    `🌐 Launching headless Chromium (${executablePath || 'Playwright bundled'})...`,
  );

  const issues = [];
  const verifiedRoutes = [];

  try {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { height: 900, width: 1440 },
    });
    const page = await context.newPage();

    // If cold-started, perform a quick warmup navigation so Vite finishes initial dep optimization
    if (viteServer) {
      await page.goto(`${TARGET_URL}/auth/login`, {
        timeout: 90_000,
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(3000);
    }

    let currentRoute = 'init';

    page.on('console', (msg) => {
      const type = msg.type();
      if (type !== 'warning' && type !== 'error') {
        return;
      }
      const loc = msg.location();
      const entry = {
        kind: `console.${type}`,
        lineNumber: loc.lineNumber || null,
        route: currentRoute,
        text: msg.text(),
        url: loc.url || null,
      };
      if (!isIgnoredBenignMessage(entry)) {
        issues.push(entry);
      }
    });

    page.on('pageerror', (err) => {
      issues.push({
        kind: 'pageerror',
        route: currentRoute,
        stack: err.stack || null,
        text: `${err.name}: ${err.message}`,
      });
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        const entry = {
          kind: `http.${res.status()}`,
          route: currentRoute,
          text: `${res.request().method()} ${res.url()} -> ${res.status()} ${res.statusText()}`,
          url: res.url(),
        };
        if (!isIgnoredBenignMessage(entry)) {
          issues.push(entry);
        }
      }
    });

    async function checkViteOverlay() {
      const overlayText = await page.evaluate(() => {
        const el = document.querySelector('vite-error-overlay');
        return el?.shadowRoot?.textContent?.trim() || null;
      });
      if (overlayText) {
        issues.push({
          kind: 'vite-error-overlay',
          route: currentRoute,
          text: overlayText.slice(0, 400),
        });
      }
    }

    async function visitFullLoad(routePath, waitMs = 1500) {
      currentRoute = routePath;
      await page.goto(`${TARGET_URL}${routePath}`, {
        timeout: 35_000,
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(waitMs);
      await checkViteOverlay();
      verifiedRoutes.push(routePath);
      console.log(`  ✓ ${routePath}`);
    }

    // 1. Public Auth Routes
    await visitFullLoad('/auth/login', 2000);
    await visitFullLoad('/auth/register', 1500);
    await visitFullLoad('/auth/forget-password', 1200);
    await visitFullLoad('/auth/reset-password', 1200);
    await visitFullLoad('/auth/callback', 1200);

    // 2. Mock Supabase REST & Auth for Superadmin Protected Route Traversal
    await page.route('https://*.supabase.co/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const { pathname } = url;

      if (pathname === '/auth/v1/user') {
        return route.fulfill({
          body: JSON.stringify({
            app_metadata: { platform_role: 'superadmin' },
            email: 'admin@operon.com',
            id: '00000000-0000-0000-0000-000000000001',
            user_metadata: { full_name: 'Superadmin' },
          }),
          contentType: 'application/json',
          status: 200,
        });
      }

      if (pathname.startsWith('/rest/v1/system_plugins')) {
        return route.fulfill({
          body: JSON.stringify([
            {
              id: 'core-iam',
              is_core: true,
              name: 'Core IAM',
              status: 'installed',
              version: '1.0.0',
            },
            {
              id: 'workers',
              is_core: true,
              name: 'Workers & Fleet Engine',
              status: 'installed',
              version: '1.0.0',
            },
            {
              id: 'automation',
              is_core: false,
              name: 'Automa Engine',
              status: 'installed',
              version: '1.0.0',
            },
            {
              id: 'subscriptions',
              is_core: false,
              name: 'Billing & Plans',
              status: 'installed',
              version: '1.0.0',
            },
          ]),
          contentType: 'application/json',
          status: 200,
        });
      }

      if (pathname.startsWith('/rest/v1/permissions')) {
        return route.fulfill({
          body: JSON.stringify([
            {
              description: 'Read tenants',
              id: 'tenants:read',
              module: 'tenants',
            },
            {
              description: 'Read devices',
              id: 'workers:devices:read',
              module: 'workers',
            },
            {
              description: 'Read browsers',
              id: 'workers:browsers:read',
              module: 'workers',
            },
            {
              description: 'Read proxies',
              id: 'workers:proxies:read',
              module: 'workers',
            },
            {
              description: 'Read workflows',
              id: 'automation:workflows:read',
              module: 'automation',
            },
            {
              description: 'Read jobs',
              id: 'automation:jobs:read',
              module: 'automation',
            },
            {
              description: 'Read logs',
              id: 'automation:logs:read',
              module: 'automation',
            },
            {
              description: 'Read plugins',
              id: 'plugins:read',
              module: 'system',
            },
            {
              description: 'Read subscriptions',
              id: 'subscriptions:read',
              module: 'billing',
            },
          ]),
          contentType: 'application/json',
          status: 200,
        });
      }

      const accept = req.headers().accept || '';
      if (accept.includes('application/vnd.pgrst.object+json')) {
        return route.fulfill({
          body: JSON.stringify({
            completed_tasks: 1,
            created_at: new Date().toISOString(),
            failed_tasks: 0,
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Default Workspace',
            plan_id: 'pro',
            slug: 'default-workspace',
            status: 'active',
            total_tasks: 1,
          }),
          contentType: 'application/json',
          status: 200,
        });
      }

      return route.fulfill({
        body: JSON.stringify([]),
        contentType: 'application/json',
        headers: { 'Content-Range': '0-0/0' },
        status: 200,
      });
    });

    const jwt = createSuperadminJwt();
    currentRoute = '/dashboard/analytics';
    await page.goto(
      `${TARGET_URL}/auth/callback#access_token=${jwt}&refresh_token=mock_refresh`,
      { timeout: 35_000, waitUntil: 'domcontentloaded' },
    );
    await page.waitForTimeout(2500);
    await checkViteOverlay();
    verifiedRoutes.push('/dashboard/analytics');
    console.log('  ✓ /dashboard/analytics');

    const protectedRoutes = [
      '/tenants',
      '/tenants/00000000-0000-0000-0000-000000000001',
      '/automation/devices',
      '/automation/browsers',
      '/automation/proxies',
      '/automation/workflows',
      '/automation/runs',
      '/automation/runs/00000000-0000-0000-0000-000000000001',
      '/system/plugins',
      '/system/plans',
      '/system/users',
      '/system/audit-logs',
      '/system/subscriptions',
      '/system/roles',
      '/profile',
      '/auth/desktop',
    ];

    for (const routePath of protectedRoutes) {
      currentRoute = routePath;
      await page.evaluate((p) => {
        window.history.pushState({}, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, routePath);
      await page.waitForTimeout(1000);
      await checkViteOverlay();
      verifiedRoutes.push(routePath);
      console.log(`  ✓ ${routePath}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    if (viteServer) {
      await viteServer.close();
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (issues.length > 0) {
    console.error(
      `\n❌ [CONSOLE GATE FAILED] Detected ${issues.length} runtime console/page issue(s) across ${verifiedRoutes.length} routes (${elapsed}s):`,
    );
    for (const [idx, issue] of issues.entries()) {
      console.error(
        `  ${idx + 1}. [${issue.kind}] (${issue.route}) ${issue.text}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `\n✅ [CONSOLE GATE PASSED] ${verifiedRoutes.length}/22 routes verified headlessly in ${elapsed}s | 0 console warnings | 0 console errors | 0 page errors`,
  );
}

runConsoleGate().catch((error) => {
  console.error('💥 [CONSOLE GATE FATAL]', error);
  process.exit(1);
});
