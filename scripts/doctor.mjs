import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `Usage: node scripts/doctor.mjs [--json] [-h|--help]`;

function runCheck(cmd, cwd = ROOT) {
  const res = spawnSync(cmd, { cwd, encoding: 'utf8', shell: true, windowsHide: true });
  return { ok: res.status === 0, out: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim() };
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return console.log(HELP);

  const checks = [];
  const add = (name, status, detail, fix = '') => checks.push({ name, status, detail, fix });

  const sub = runCheck('git submodule status');
  const subLines = sub.ok ? sub.out.split(/\r?\n/).filter(Boolean) : [];
  const uninit = subLines.filter((l) => l.startsWith('-')).length;
  const dirty = subLines.filter((l) => l.startsWith('+')).length;
  if (!sub.ok || uninit) add('submodules', 'FAIL', sub.ok ? `${uninit} uninitialized` : 'git failed', 'git submodule update --init --recursive');
  else add('submodules', dirty ? 'WARN' : 'OK', `${subLines.length} ready${dirty ? `, ${dirty} modified` : ''}`);

  const rustPin = fs.readFileSync(path.join(ROOT, 'core/Cargo.toml'), 'utf8').match(/^\s*rust-toolchain\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const rustc = runCheck('rustc --version', path.join(ROOT, 'core'));
  if (!rustc.ok) add('rustc', 'FAIL', 'missing', 'Install Rust via rustup');
  else add('rustc', rustPin && !rustc.out.includes(rustPin) ? 'WARN' : 'OK', `${rustc.out} (pin: ${rustPin || 'none'})`);

  const rustTools = runCheck('cargo clippy --version', path.join(ROOT, 'core')).ok && runCheck('cargo fmt --version', path.join(ROOT, 'core')).ok;
  add('rust-tools', rustTools ? 'OK' : 'FAIL', rustTools ? 'clippy + rustfmt' : 'missing', 'rustup component add clippy rustfmt');

  const wantNode = fs.readFileSync(path.join(ROOT, 'console/.node-version'), 'utf8').trim();
  const sameMajor = process.version.replace(/^v/, '').split('.')[0] === wantNode.replace(/^v/, '').split('.')[0];
  add('node', sameMajor ? 'OK' : 'WARN', `${process.version} (.node-version: v${wantNode})`);

  const pnpm = runCheck('pnpm --version');
  add('pnpm', pnpm.ok ? 'OK' : 'FAIL', pnpm.ok ? `v${pnpm.out}` : 'missing', 'corepack enable');

  const hasModules = fs.existsSync(path.join(ROOT, 'console/node_modules'));
  add('console-deps', hasModules ? 'OK' : 'FAIL', hasModules ? 'present' : 'missing', 'pnpm --dir console install --frozen-lockfile');

  const hasEnv = fs.existsSync(path.join(ROOT, '.env'));
  add('.env', hasEnv ? 'OK' : 'WARN', hasEnv ? 'present' : 'missing', 'cp .env.example .env');

  const docker = runCheck('docker --version');
  add('docker', docker.ok ? 'OK' : 'WARN', docker.ok ? docker.out : 'not installed');

  const gh = runCheck('gh auth status');
  add('gh-auth', gh.ok ? 'OK' : 'WARN', gh.ok ? 'authenticated' : 'not logged in', 'gh auth login');

  const [p1080, p8118] = await Promise.all([checkPort(1080), checkPort(8118)]);
  add('proxy-tunnel', p1080 && p8118 ? 'OK' : 'WARN', `1080=${p1080 ? 'up' : 'down'}, 8118=${p8118 ? 'up' : 'down'}`, 'tunnel on');

  if (args.includes('--json')) return console.log(JSON.stringify({ checks }, null, 2));

  for (const c of checks) {
    console.log(`[${c.status}]`.padEnd(6), c.name.padEnd(13), c.detail + (c.fix && c.status !== 'OK' ? ` -> ${c.fix}` : ''));
  }
  process.exit(checks.some((c) => c.status === 'FAIL') ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
