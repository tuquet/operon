#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

if (args.includes('-h') || args.includes('--help')) {
  console.log(`Usage: node scripts/db-reset.mjs [options]

Reset local Operon SQLite tables (browsers, tasks, jobs, logs) and seed deterministic UI acceptance fixtures.
Uses live daemon API when :8765 is running (emitting SSE live-reload events), or runs core offline seeder.

Options:
  -w, --workspace <id>  Target workspace ID (default: local-default)
      --all             Clear all workspaces before seeding target workspace
      --offline         Bypass daemon API and run offline SQLite seeder directly
      --port <port>     Daemon port (default: 8765)
  -h, --help            Show help`);
  process.exit(0);
}

let workspaceId = 'local-default';
let clearAll = false;
let offline = false;
let port = Number(process.env.OPERON_PORT || 8765);

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if ((arg === '--workspace' || arg === '-w') && args[i + 1]) {
    workspaceId = args[i + 1];
    i += 1;
  } else if (arg === '--all') {
    clearAll = true;
  } else if (arg === '--offline') {
    offline = true;
  } else if (arg === '--port' && args[i + 1]) {
    port = Number(args[i + 1]) || 8765;
    i += 1;
  }
}

async function tryResetViaDaemon() {
  const baseUrl = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const health = await fetch(`${baseUrl}/api/v1/health`, {
      signal: controller.signal,
    });
    if (!health.ok) return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  const res = await fetch(`${baseUrl}/api/v1/system/db/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, clearAll }),
  });

  if (res.status === 404) {
    console.warn(
      `[db-reset] Daemon on :${port} is running an older build without /api/v1/system/db/reset; falling back to offline seeder...`,
    );
    return null;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  if (!offline) {
    const live = await tryResetViaDaemon();
    if (live) {
      console.log(`[db-reset] Reset via live daemon (:${port}): ${live.message}`);
      console.log(JSON.stringify(live.summary, null, 2));
      return;
    }
  }

  console.log('[db-reset] Running offline SQLite reset & seed via core...');
  const cargoArgs = [
    'run',
    '--manifest-path',
    path.join(ROOT, 'core', 'Cargo.toml'),
    '-p',
    'operon',
    '--example',
    'db_reset',
    '--',
    '--workspace',
    workspaceId,
  ];
  if (clearAll) {
    cargoArgs.push('--all');
  }

  const res = spawnSync('cargo', cargoArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exit(res.status ?? 1);
}

main().catch((err) => {
  console.error(`[db-reset] Failed: ${err?.message || err}`);
  process.exit(1);
});
