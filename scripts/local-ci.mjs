import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGS_DIR = path.join(ROOT, '.logs');

const CONSOLE_ENV = {
  CI: 'true',
  NO_COLOR: '1',
  TURBO_OUTPUT_LOGS: 'errors-only',
};

/** Build CI step definitions for a target suite. */
function buildSuites(withInstall) {
  const consoleSteps = [
    ...(withInstall ? [['pnpm install', 'pnpm install --frozen-lockfile']] : []),
    ['release:check', 'pnpm release:check'],
    ['check:architecture', 'pnpm check:architecture'],
    ['check:circular', 'pnpm check:circular'],
    ['check:type', 'pnpm check:type'],
    ['lint', 'pnpm lint'],
    ['check:i18n', 'pnpm check:i18n'],
    ['test:unit', 'pnpm test:unit'],
    ['check:dep', 'pnpm check:dep'],
  ];

  return {
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
      env: CONSOLE_ENV,
      steps: consoleSteps.map(([name, cmd]) => [name, cmd]),
    },
    docker: {
      cwd: ROOT,
      steps: [['docker compose', 'docker compose config -q']],
    },
  };
}

function readGitMeta() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    return `${branch} @ ${sha}`;
  } catch {
    return 'unknown';
  }
}

/** Warn if local rustc version differs from core/Cargo.toml CI pin. */
function checkRustPin(logStream) {
  try {
    const cargoToml = fs.readFileSync(path.join(ROOT, 'core', 'Cargo.toml'), 'utf8');
    const pin = cargoToml.match(/^\s*rust-toolchain\s*=\s*"([^"]+)"/m)?.[1];
    if (!pin) return;
    const active = execSync('rustc --version', { cwd: path.join(ROOT, 'core'), encoding: 'utf8' }).trim();
    const msg = active.includes(pin)
      ? `Rust: ${active} (matches CI pin ${pin})\n`
      : `WARN: local '${active}' differs from core/Cargo.toml CI pin '${pin}'\n`;
    process.stdout.write(msg);
    logStream.write(msg);
  } catch {
    // Let cargo step report missing toolchain cleanly.
  }
}

/** Run one shell command while streaming output to console and logStream. */
function runStep(name, command, cwd, env, logStream) {
  const banner = `\n> [${name}] ${command}\n`;
  process.stdout.write(banner);
  logStream.write(banner);

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });
    child.on('error', (err) => {
      const msg = `${err.message}\n`;
      process.stderr.write(msg);
      logStream.write(msg);
      resolve({ name, code: 1, seconds: (Date.now() - startedAt) / 1000 });
    });
    child.on('close', (code) => {
      resolve({ name, code: code ?? 1, seconds: (Date.now() - startedAt) / 1000 });
    });
  });
}

/** Execute all steps in a suite, stopping on the first step failure. */
async function runSuite(suiteName, suite) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = path.join(LOGS_DIR, `ci-${suiteName}.log`);
  const logStream = fs.createWriteStream(logPath, { encoding: 'utf8' });

  const header = [
    `=== local-ci: ${suiteName} ===`,
    `Time: ${new Date().toISOString()}`,
    `Git:  ${readGitMeta()}`,
    `Log:  ${path.relative(ROOT, logPath)}`,
    '',
  ].join('\n');
  process.stdout.write(header);
  logStream.write(header);
  if (suiteName === 'core') checkRustPin(logStream);

  const results = [];
  let failedCode = 0;
  for (const [name, command] of suite.steps) {
    const res = await runStep(name, command, suite.cwd, suite.env, logStream);
    results.push(res);
    if (res.code !== 0) {
      failedCode = res.code;
      break;
    }
  }

  const totalSec = results.reduce((sum, r) => sum + r.seconds, 0);
  const summaryLines = [
    `\n--- Summary: ${suiteName} (${totalSec.toFixed(1)}s) ---`,
    ...results.map((r) =>
      r.code === 0
        ? `[PASS] ${r.name} (${r.seconds.toFixed(1)}s)`
        : `[FAIL] ${r.name} (exit ${r.code}, ${r.seconds.toFixed(1)}s)`
    ),
    '',
  ];
  const summary = summaryLines.join('\n');
  process.stdout.write(summary);
  logStream.write(summary);
  await new Promise((resolve) => logStream.end(resolve));

  return { suiteName, code: failedCode, seconds: totalSec, logPath: path.relative(ROOT, logPath) };
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('-'));
  const withInstall = args.includes('--install');
  const suites = buildSuites(withInstall);
  const validTargets = [...Object.keys(suites), 'all'];

  if (!target || !validTargets.includes(target)) {
    console.error(`Usage: node scripts/local-ci.mjs <${validTargets.join('|')}> [--install]`);
    process.exit(2);
  }

  const queue = target === 'all' ? ['core', 'console', 'docker'] : [target];
  const suiteResults = [];
  for (const name of queue) {
    suiteResults.push(await runSuite(name, suites[name]));
  }

  if (queue.length > 1) {
    console.log('\n=== local-ci: all ===');
    for (const r of suiteResults) {
      const tag = r.code === 0 ? 'PASS' : `FAIL (exit ${r.code})`;
      console.log(`[${tag}] ${r.suiteName} (${r.seconds.toFixed(1)}s) -> ${r.logPath}`);
    }
  }

  const firstFailure = suiteResults.find((r) => r.code !== 0);
  process.exit(firstFailure ? firstFailure.code : 0);
}

main();
