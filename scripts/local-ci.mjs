import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
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

/** Print summaries and tail lines from existing .logs/ci-*.log files. */
function showLogs() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log('No .logs directory yet.');
    return;
  }
  const files = fs.readdirSync(LOGS_DIR).filter((f) => /^ci-.*\.log$/.test(f)).sort();
  if (files.length === 0) {
    console.log('No ci-*.log files found in .logs/.');
    return;
  }
  for (const file of files) {
    const content = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');
    const summaryIdx = lines.findIndex((l) => l.startsWith('--- Summary:'));
    const headerLines = lines.slice(0, 4).filter(Boolean);
    const failed = lines.some((l) => l.startsWith('[FAIL]'));
    console.log(`\n=== ${file} ===`);
    for (const h of headerLines) console.log(h);
    if (summaryIdx >= 0) {
      if (failed) {
        const tail = lines.slice(Math.max(0, summaryIdx - 15), summaryIdx).filter(Boolean);
        console.log('... last lines before failure ...');
        for (const l of tail) console.log(l);
      }
      for (const s of lines.slice(summaryIdx).filter(Boolean)) console.log(s);
    } else {
      console.log('(incomplete log — tail:)');
      for (const l of lines.slice(-10).filter(Boolean)) console.log(l);
    }
  }
}

/** Prompt TTY user to pick a CI action when invoked without arguments. */
async function promptTarget() {
  const options = [
    ['1', 'core', 'Run core (fmt, clippy, test)'],
    ['2', 'console', 'Run console (quality + unit tests)'],
    ['3', 'docker', 'Run docker (compose config -q)'],
    ['4', 'all', 'Run all (core -> console -> docker)'],
    ['5', 'logs', 'Inspect recent .logs/ci-*.log'],
    ['0', '', 'Cancel'],
  ];
  console.log('=== local-ci ===');
  for (const [key, , label] of options) console.log(`  [${key}] ${label}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question('\nSelect option: ')).trim();
    const match = options.find(([key]) => key === answer);
    if (!match || !match[1]) {
      console.log('Cancelled.');
      return null;
    }
    return match[1];
  } catch {
    console.log('\nCancelled.');
    return null;
  } finally {
    rl.close();
  }
}

const HELP_TEXT = `Usage: node scripts/local-ci.mjs [target] [options]

Targets:
  core        Run Rust fmt (--check), clippy (-D warnings), cargo test
  console     Run console-quality checks + unit tests
  docker      Run docker compose config -q
  all         Run core -> console -> docker without masking failures
  logs        Print summaries and failure tails from .logs/ci-*.log
  (none)      Open interactive menu when running in a TTY

Options:
  --install   Run 'pnpm install --frozen-lockfile' before console checks
  -h, --help  Show this help message`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  let target = args.find((a) => !a.startsWith('-'));
  const withInstall = args.includes('--install');
  const suites = buildSuites(withInstall);
  const validTargets = [...Object.keys(suites), 'all', 'logs'];

  if (!target && process.stdin.isTTY) {
    target = await promptTarget();
    if (!target) process.exit(0);
  }

  if (!target || !validTargets.includes(target)) {
    console.error(HELP_TEXT);
    process.exit(2);
  }

  if (target === 'logs') {
    showLogs();
    process.exit(0);
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
