import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runCheck(cmd, args, cwd = ROOT) {
  const res = spawnSync([cmd, ...args].join(' '), {
    cwd,
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  return {
    ok: res.status === 0,
    out: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim(),
  };
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function dirSizeMb(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) total += fs.statSync(full).size;
    }
  }
  return Math.round(total / (1024 * 1024));
}

async function main() {
  const asJson = process.argv.includes('--json');
  const checks = [];
  const add = (name, status, detail, fix = '') => checks.push({ name, status, detail, fix });

  // 1. Submodules
  const sub = runCheck('git', ['submodule', 'status']);
  if (!sub.ok) {
    add('submodules', 'FAIL', sub.out || 'git submodule status failed', 'git submodule update --init --recursive');
  } else {
    const lines = sub.out.split(/\r?\n/).filter(Boolean);
    const uninit = lines.filter((l) => l.startsWith('-'));
    const dirty = lines.filter((l) => l.startsWith('+'));
    if (uninit.length > 0) add('submodules', 'FAIL', `${uninit.length} uninitialized`, 'git submodule update --init --recursive');
    else if (dirty.length > 0) add('submodules', 'WARN', `${lines.length} ready, ${dirty.length} modified pointer(s)`);
    else add('submodules', 'OK', `${lines.length} clean & initialized`);
  }

  // 2. Rust toolchain & pin
  const cargoToml = fs.readFileSync(path.join(ROOT, 'core', 'Cargo.toml'), 'utf8');
  const rustPin = cargoToml.match(/^\s*rust-toolchain\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const rustc = runCheck('rustc', ['--version'], path.join(ROOT, 'core'));
  if (!rustc.ok) add('rustc', 'FAIL', 'rustc not found', 'Install Rust via rustup');
  else if (rustPin && !rustc.out.includes(rustPin)) add('rustc', 'WARN', `${rustc.out} (CI pin: ${rustPin})`);
  else add('rustc', 'OK', `${rustc.out} (matches CI pin ${rustPin})`);

  const clippy = runCheck('cargo', ['clippy', '--version'], path.join(ROOT, 'core'));
  const fmt = runCheck('cargo', ['fmt', '--version'], path.join(ROOT, 'core'));
  add('rust-tools', clippy.ok && fmt.ok ? 'OK' : 'FAIL', `clippy=${clippy.ok}, rustfmt=${fmt.ok}`, 'rustup component add clippy rustfmt');

  // 3. Node, pnpm & console workspace deps
  const wantNode = fs.readFileSync(path.join(ROOT, 'console', '.node-version'), 'utf8').trim();
  const wantMajor = wantNode.replace(/^v/, '').split('.')[0];
  const nodeMajor = process.version.replace(/^v/, '').split('.')[0];
  add('node', nodeMajor === wantMajor ? 'OK' : 'WARN', `${process.version} (.node-version: v${wantNode})`);

  const pnpm = runCheck('pnpm', ['--version']);
  add('pnpm', pnpm.ok ? 'OK' : 'FAIL', pnpm.ok ? `v${pnpm.out}` : 'pnpm not found', 'corepack enable || npm i -g pnpm');

  const hasNodeModules = fs.existsSync(path.join(ROOT, 'console', 'node_modules'));
  add('console-deps', hasNodeModules ? 'OK' : 'FAIL', hasNodeModules ? 'console/node_modules present' : 'missing', 'pnpm --dir console install --frozen-lockfile');

  // 4. Env, Docker, GitHub CLI & proxy tunnels
  const hasEnv = fs.existsSync(path.join(ROOT, '.env'));
  add('.env', hasEnv ? 'OK' : 'WARN', hasEnv ? 'present' : 'missing at root', 'Copy-Item .env.example .env');

  const docker = runCheck('docker', ['--version']);
  add('docker', docker.ok ? 'OK' : 'WARN', docker.ok ? docker.out : 'not installed');

  const gh = runCheck('gh', ['auth', 'status']);
  add('gh-auth', gh.ok ? 'OK' : 'WARN', gh.ok ? 'authenticated' : 'not logged in', 'gh auth login');

  const [socksUp, httpUp] = await Promise.all([checkPort(1080), checkPort(8118)]);
  add('proxy-tunnel', socksUp && httpUp ? 'OK' : 'WARN', `1080=${socksUp ? 'up' : 'down'}, 8118=${httpUp ? 'up' : 'down'}`, 'tunnel on (required before git spush)');

  // 5. Rust target footprint
  let targetDir = path.join(ROOT, 'core', 'target');
  if (!fs.existsSync(targetDir)) targetDir = path.join(ROOT, 'target');
  const mb = dirSizeMb(targetDir);
  add('rust-target', mb > 10240 ? 'WARN' : 'OK', `${path.relative(ROOT, targetDir)}: ${mb} MB`, mb > 10240 ? 'cargo clean --manifest-path core/Cargo.toml' : '');

  if (asJson) {
    console.log(JSON.stringify({ checks }, null, 2));
  } else {
    console.log('=== Operon Environment Doctor ===');
    for (const c of checks) {
      const tag = `[${c.status}]`.padEnd(6);
      console.log(`${tag} ${c.name.padEnd(14)} ${c.detail}`);
      if (c.fix && c.status !== 'OK') console.log(`       -> fix: ${c.fix}`);
    }
  }

  const hasFailure = checks.some((c) => c.status === 'FAIL');
  process.exit(hasFailure ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
