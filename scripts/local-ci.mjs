import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGS_DIR = path.join(ROOT, '.logs');

const SUITES = {
  core: {
    cwd: path.join(ROOT, 'core'),
    steps: [
      ['cargo fmt', 'cargo fmt --all -- --check'],
      ['cargo clippy', 'cargo clippy --workspace --all-targets -- -D warnings'],
      ['cargo test', 'cargo test --workspace --lib --bins --tests'],
    ],
  },
  console: {
    cwd: path.join(ROOT, 'console'),
    env: { CI: 'true', NO_COLOR: '1', TURBO_OUTPUT_LOGS: 'errors-only' },
    steps: [
      ['release:check', 'pnpm release:check'],
      ['check:architecture', 'pnpm check:architecture'],
      ['check:circular', 'pnpm check:circular'],
      ['check:type', 'pnpm check:type'],
      ['lint', 'pnpm lint'],
      ['check:i18n', 'pnpm check:i18n'],
      ['test:unit', 'pnpm test:unit'],
      ['check:dep', 'pnpm check:dep'],
    ],
  },
  docker: {
    cwd: ROOT,
    steps: [['docker compose', 'docker compose config -q']],
  },
};

const HELP = `Usage: node scripts/local-ci.mjs <core|console|docker|all|logs> [--install] [-h|--help]`;

function readGitMeta() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    return `${branch} @ ${sha}`;
  } catch {
    return 'unknown';
  }
}

function runStep(name, command, cwd, env, logStream) {
  const banner = `\n> [${name}] ${command}\n`;
  process.stdout.write(banner);
  logStream.write(banner);

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, env: { ...process.env, ...env }, shell: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.on('data', (c) => { process.stdout.write(c); logStream.write(c); });
    child.stderr.on('data', (c) => { process.stderr.write(c); logStream.write(c); });
    child.on('error', (err) => {
      process.stderr.write(`${err.message}\n`);
      logStream.write(`${err.message}\n`);
      resolve({ name, code: 1, seconds: (Date.now() - startedAt) / 1000 });
    });
    child.on('close', (code) => resolve({ name, code: code ?? 1, seconds: (Date.now() - startedAt) / 1000 }));
  });
}

async function runSuite(name, steps, cwd, env) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = path.join(LOGS_DIR, `ci-${name}.log`);
  const logStream = fs.createWriteStream(logPath, { encoding: 'utf8' });
  const header = `=== local-ci: ${name} (${new Date().toISOString()}, ${readGitMeta()}) ===\n`;
  process.stdout.write(header);
  logStream.write(header);

  const results = [];
  let failedCode = 0;
  for (const [step, command] of steps) {
    const res = await runStep(step, command, cwd, env, logStream);
    results.push(res);
    if (res.code !== 0) { failedCode = res.code; break; }
  }

  const total = results.reduce((s, r) => s + r.seconds, 0);
  const summary = `\n--- Summary: ${name} (${total.toFixed(1)}s) ---\n` +
    results.map((r) => `[${r.code === 0 ? 'PASS' : `FAIL ${r.code}`}] ${r.name} (${r.seconds.toFixed(1)}s)`).join('\n') + '\n';
  process.stdout.write(summary);
  logStream.write(summary);
  await new Promise((r) => logStream.end(r));
  return { name, code: failedCode, seconds: total, logPath: path.relative(ROOT, logPath) };
}

function showLogs() {
  if (!fs.existsSync(LOGS_DIR)) return console.log('No .logs directory.');
  const files = fs.readdirSync(LOGS_DIR).filter((f) => /^ci-.*\.log$/.test(f)).sort();
  if (!files.length) return console.log('No ci-*.log files found.');
  for (const file of files) {
    const lines = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').split(/\r?\n/);
    const idx = lines.findIndex((l) => l.startsWith('--- Summary:'));
    console.log(`\n=== ${file} ===`);
    if (lines[0]) console.log(lines[0]);
    for (const line of (idx >= 0 ? lines.slice(idx) : lines.slice(-8)).filter(Boolean)) console.log(line);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return console.log(HELP);

  const target = args.find((a) => !a.startsWith('-'));
  const valid = [...Object.keys(SUITES), 'all', 'logs'];
  if (!target || !valid.includes(target)) {
    console.error(HELP);
    process.exit(2);
  }
  if (target === 'logs') return showLogs();

  const queue = target === 'all' ? ['core', 'console', 'docker'] : [target];
  const results = [];
  for (const name of queue) {
    const suite = SUITES[name];
    const steps = name === 'console' && args.includes('--install')
      ? [['pnpm install', 'pnpm install --frozen-lockfile'], ...suite.steps]
      : suite.steps;
    results.push(await runSuite(name, steps, suite.cwd, suite.env));
  }

  if (queue.length > 1) {
    console.log('\n=== local-ci: all ===');
    for (const r of results) console.log(`[${r.code === 0 ? 'PASS' : `FAIL ${r.code}`}] ${r.name} (${r.seconds.toFixed(1)}s) -> ${r.logPath}`);
  }
  const fail = results.find((r) => r.code !== 0);
  process.exit(fail ? fail.code : 0);
}

main();
