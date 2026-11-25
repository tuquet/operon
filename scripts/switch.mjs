import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE_DIR = path.join(ROOT, 'core');
const IS_WIN = process.platform === 'win32';
const EXT = IS_WIN ? '.exe' : '';
const OPERON_HOME = process.env.OPERON_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.operon');
const BIN_DIR = path.join(OPERON_HOME, 'bin');
const PRIMARY_BIN = path.join(BIN_DIR, `operon${EXT}`);
const ALIAS_BIN = path.join(BIN_DIR, `opn${EXT}`);
const BACKUP_DIR = path.join(BIN_DIR, '.release');
const BACKUP_BIN = path.join(BACKUP_DIR, `operon${EXT}`);
const MODE_FILE = path.join(BIN_DIR, '.mode');

const HELP = 'Usage: node scripts/switch.mjs <dev|release|status> [--build] [-h|--help]';

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readMode() {
  try {
    return fs.readFileSync(MODE_FILE, 'utf8').trim() || 'release';
  } catch {
    return 'release';
  }
}

function resolveDevBinary(shouldBuild) {
  if (shouldBuild) {
    console.log('[switch] Building debug operon binary...');
    const res = spawnSync('cargo', ['build', '--manifest-path', 'core/Cargo.toml', '--bin', 'operon'], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  let hostTriple = '';
  try {
    const out = execFileSync('rustc', ['-vV'], { cwd: CORE_DIR, encoding: 'utf8', windowsHide: true });
    hostTriple = out.match(/^host:\s*(\S+)/m)?.[1] ?? '';
  } catch {}

  const candidates = [
    hostTriple ? path.join(CORE_DIR, 'target', hostTriple, 'debug', `operon${EXT}`) : '',
    path.join(CORE_DIR, 'target', 'debug', `operon${EXT}`),
  ].filter(Boolean);

  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function stopRunningDaemon() {
  for (const bin of [PRIMARY_BIN, ALIAS_BIN]) {
    if (!fs.existsSync(bin)) continue;
    spawnSync(bin, ['worker', 'stop', '--force'], { stdio: 'ignore', windowsHide: true });
  }
  if (IS_WIN) {
    for (let i = 0; i < 12; i++) {
      const ps = spawnSync('tasklist', ['/NH'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      const out = (ps.stdout || '').toLowerCase();
      if (!out.includes('operon.exe') && !out.includes('opn.exe')) break;
      sleepMs(250);
    }
  }
}

function retryOnBusy(fn) {
  for (let i = 0; ; i++) {
    try {
      return fn();
    } catch (err) {
      if (i >= 15 || !['EBUSY', 'EPERM', 'EACCES'].includes(err?.code)) throw err;
      sleepMs(250);
    }
  }
}

function swapIn(targetPath, writeTarget) {
  const oldPath = `${targetPath}.old`;
  try { fs.rmSync(oldPath, { force: true, maxRetries: 4, retryDelay: 150 }); } catch {}
  if (fs.existsSync(targetPath)) {
    retryOnBusy(() => fs.renameSync(targetPath, oldPath));
  }
  try {
    retryOnBusy(writeTarget);
  } catch (err) {
    if (fs.existsSync(oldPath) && !fs.existsSync(targetPath)) {
      try { fs.renameSync(oldPath, targetPath); } catch {}
    }
    throw err;
  }
  try { fs.rmSync(oldPath, { force: true, maxRetries: 4, retryDelay: 150 }); } catch {}
}

function syncAlias() {
  swapIn(ALIAS_BIN, () => {
    if (IS_WIN) {
      try {
        fs.linkSync(PRIMARY_BIN, ALIAS_BIN);
      } catch {
        fs.copyFileSync(PRIMARY_BIN, ALIAS_BIN);
      }
    } else {
      fs.symlinkSync(`operon${EXT}`, ALIAS_BIN);
    }
  });
}

function installBinary(srcPath) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const tmpBin = `${PRIMARY_BIN}.tmp`;
  fs.copyFileSync(srcPath, tmpBin);
  if (!IS_WIN) fs.chmodSync(tmpBin, 0o755);
  swapIn(PRIMARY_BIN, () => fs.renameSync(tmpBin, PRIMARY_BIN));
  syncAlias();
}

function showStatus() {
  const mode = readMode();
  const active = fs.existsSync(PRIMARY_BIN) ? PRIMARY_BIN : fs.existsSync(ALIAS_BIN) ? ALIAS_BIN : 'none';
  let ver = 'not installed';
  if (active !== 'none') {
    const res = spawnSync(active, ['--version'], { encoding: 'utf8', windowsHide: true });
    ver = res.status === 0 ? res.stdout.trim() : 'error';
  }
  console.log(`mode:    ${mode}`);
  console.log(`bin dir: ${BIN_DIR}`);
  console.log(`active:  ${active} (${ver})`);
  console.log(`backup:  ${fs.existsSync(BACKUP_BIN) ? BACKUP_BIN : 'none'}`);
}

function switchToDev(shouldBuild) {
  const devBin = resolveDevBinary(shouldBuild || !resolveDevBinary(false));
  if (!devBin) throw new Error('Debug operon binary not found after build.');

  stopRunningDaemon();
  if (readMode() !== 'dev' && !fs.existsSync(BACKUP_BIN)) {
    const existing = fs.existsSync(PRIMARY_BIN) ? PRIMARY_BIN : fs.existsSync(ALIAS_BIN) ? ALIAS_BIN : null;
    if (existing) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      fs.copyFileSync(existing, BACKUP_BIN);
    }
  }

  installBinary(devBin);
  fs.writeFileSync(MODE_FILE, 'dev\n');
  console.log(`[switch] Switched to DEV (${devBin})`);
  showStatus();
}

function switchToRelease() {
  if (!fs.existsSync(BACKUP_BIN)) {
    console.error('[switch] No backed-up release binary found. Reinstall via install.ps1 / install.sh.');
    process.exit(1);
  }
  stopRunningDaemon();
  installBinary(BACKUP_BIN);
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  fs.writeFileSync(MODE_FILE, 'release\n');
  console.log('[switch] Restored RELEASE binary');
  showStatus();
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

const shouldBuild = args.includes('--build');
const cmd = args.find((a) => !a.startsWith('-')) || 'status';

if (cmd === 'status') showStatus();
else if (cmd === 'dev') switchToDev(shouldBuild);
else if (cmd === 'release' || cmd === 'prod') switchToRelease();
else {
  console.error(`Unknown mode '${cmd}'.\n${HELP}`);
  process.exit(1);
}
