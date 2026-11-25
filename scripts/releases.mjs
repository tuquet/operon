import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function readLocalVersions() {
  const cliCargo = fs.readFileSync(path.join(ROOT, 'core/crates/cli/Cargo.toml'), 'utf8');
  const cliVersion = cliCargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? 'unknown';
  const consoleVer = readJson('console/release/version.json').version ?? 'unknown';
  const releaseCfg = readJson('console/release/config.json');
  return {
    repo: releaseCfg.repository,
    stateBranch: releaseCfg.stateBranch,
    cliVersion,
    consoleVersion: consoleVer,
  };
}

function resolveToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    return process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  }
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** Query GitHub REST endpoint via fetch, falling back to `gh api` when corporate CA blocks Node TLS. */
async function ghJson(endpoint, { optional = false, raw = false } = {}) {
  const token = resolveToken();
  const headers = {
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'User-Agent': 'operon-releases-check',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const res = await fetch(`https://api.github.com/${endpoint}`, { headers });
    if (optional && res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub GET ${endpoint}: ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    const causeCode = err?.cause?.code ?? err?.code;
    if (err instanceof TypeError || causeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      try {
        const args = ['api', endpoint, ...(raw ? ['-H', 'Accept: application/vnd.github.raw+json'] : [])];
        const out = execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return JSON.parse(out);
      } catch (ghErr) {
        const stderr = ghErr?.stderr?.toString() ?? '';
        if (optional && stderr.includes('404')) return null;
        throw new Error(stderr.trim() || err.message);
      }
    }
    throw err;
  }
}

function formatRelease(r, latestId) {
  const tag = r.tag_name;
  const date = (r.published_at ?? r.created_at ?? '').slice(0, 10);
  const flags = [
    r.id === latestId ? 'latest' : '',
    r.draft ? 'draft' : '',
    r.prerelease ? 'prerelease' : '',
  ]
    .filter(Boolean)
    .join(',');
  return { tag, date, flags, assets: r.assets?.length ?? 0, url: r.html_url };
}

function printCommands({ repo, stateBranch, cliVersion, consoleVersion, cliLatest, selectedTag }) {
  const base = `https://github.com/${repo}`;
  const cliTarget = selectedTag?.startsWith('v') ? selectedTag : cliLatest?.tag ?? `v${cliVersion}`;
  console.log('\n=== Install / Update Commands ===');
  console.log('CLI (opn - latest):');
  console.log(`  Windows (pwsh):  irm ${base}/releases/latest/download/install.ps1 | iex`);
  console.log(`  macOS / Linux:   curl -fsSL ${base}/releases/latest/download/install.sh | sh`);
  console.log(`  Direct (${cliTarget}): ${base}/releases/tag/${cliTarget}`);
  console.log('\nDesktop (Operon - updater feeds):');
  for (const ch of ['stable', 'beta', 'nightly']) {
    console.log(`  ${ch.padEnd(7)}: https://raw.githubusercontent.com/${repo}/${stateBranch}/updates/${ch}/latest.json`);
  }
  console.log('\nRelease Tag Triggers:');
  console.log(`  CLI release:     git tag v${cliVersion} && git spush origin v${cliVersion}`);
  console.log(`  Desktop release: git tag console-v${consoleVersion} && git spush origin console-v${consoleVersion}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(600);
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

async function createTagWizard(rl, tag) {
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (dirty) {
    console.log('\n[BLOCKED] Root working tree is not clean. Commit or stash changes before tagging:');
    console.log(dirty);
    return;
  }
  const exists = spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { cwd: ROOT, stdio: 'ignore' });
  if (exists.status === 0) {
    console.log(`\n[BLOCKED] Tag '${tag}' already exists locally.`);
    return;
  }
  const tunnelUp = await checkPort(1080);
  if (!tunnelUp) {
    console.log('\n[WARN] SOCKS5 tunnel 127.0.0.1:1080 is offline (`tunnel on` required before `git spush`).');
  }
  console.log(`\nPlanned command:\n  git tag ${tag} && git spush origin ${tag}`);
  const confirm = (await rl.question('Proceed? (y/N): ')).trim().toLowerCase();
  if (confirm !== 'y' && confirm !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  execFileSync('git', ['tag', tag], { cwd: ROOT, stdio: 'inherit' });
  if (!tunnelUp) {
    console.log(`Created local tag '${tag}'. Run 'tunnel on && git spush origin ${tag}' when ready to push.`);
    return;
  }
  execFileSync('git', ['spush', 'origin', tag], { cwd: ROOT, stdio: 'inherit' });
}

async function runInteractiveMenu(meta, cliReleases) {
  const cliTag = `v${meta.cliVersion}`;
  const desktopTag = `console-v${meta.consoleVersion}`;
  console.log('\n=== Actions ===');
  console.log('  [1] Show install / update commands');
  console.log(`  [2] Release CLI tag (${cliTag})`);
  console.log(`  [3] Release Desktop tag (${desktopTag})`);
  console.log('  [0] Exit');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const choice = (await rl.question('\nSelect option: ')).trim();
    if (choice === '1') printCommands({ ...meta, cliLatest: cliReleases[0] });
    else if (choice === '2') await createTagWizard(rl, cliTag);
    else if (choice === '3') await createTagWizard(rl, desktopTag);
    else console.log('Done.');
  } catch {
    console.log('\nCancelled.');
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const showCommands = args.includes('--commands') || args.includes('--install');
  const tagIdx = args.indexOf('--tag');
  const selectedTag = tagIdx >= 0 ? args[tagIdx + 1] : undefined;
  const interactive = args.length === 0 && process.stdin.isTTY;

  const meta = readLocalVersions();
  const [releases, latestCli, registry] = await Promise.all([
    ghJson(`repos/${meta.repo}/releases?per_page=30`),
    ghJson(`repos/${meta.repo}/releases/latest`, { optional: true }),
    ghJson(`repos/${meta.repo}/contents/registry.json?ref=${meta.stateBranch}`, { optional: true, raw: true }),
  ]);

  const cliReleases = releases
    .filter((r) => /^v\d/.test(r.tag_name))
    .map((r) => formatRelease(r, latestCli?.id));
  const desktopReleases = releases
    .filter((r) => r.tag_name.startsWith('console-v'))
    .map((r) => formatRelease(r, null));
  const channels = registry?.channels ?? {};

  if (asJson) {
    console.log(JSON.stringify({ ...meta, channels, cliReleases, desktopReleases }, null, 2));
    return;
  }

  console.log(`=== Releases: ${meta.repo} ===`);
  console.log(`Local versions -> CLI (opn): v${meta.cliVersion} | Desktop (Operon): ${meta.consoleVersion}`);

  console.log('\nCLI releases (v*):');
  if (cliReleases.length === 0) console.log('  (none published yet)');
  else {
    for (const r of cliReleases.slice(0, 10)) {
      console.log(`  ${r.tag.padEnd(20)} ${r.date}  assets=${r.assets}${r.flags ? `  [${r.flags}]` : ''}`);
    }
  }

  console.log(`\nDesktop channels (${meta.stateBranch}):`);
  if (Object.keys(channels).length === 0) console.log('  (no release-state channels yet)');
  else {
    for (const ch of ['stable', 'beta', 'nightly']) {
      const entry = channels[ch];
      console.log(`  ${ch.padEnd(8)} -> ${entry ? `${entry.tag} (${entry.updatedAt?.slice(0, 10) ?? ''})` : '(empty)'}`);
    }
  }

  console.log('\nDesktop releases (console-v*):');
  if (desktopReleases.length === 0) console.log('  (none published yet)');
  else {
    for (const r of desktopReleases.slice(0, 10)) {
      console.log(`  ${r.tag.padEnd(26)} ${r.date}  assets=${r.assets}${r.flags ? `  [${r.flags}]` : ''}`);
    }
  }

  if (showCommands || selectedTag) {
    printCommands({ ...meta, cliLatest: cliReleases[0], selectedTag });
  } else if (interactive) {
    await runInteractiveMenu(meta, cliReleases);
  } else {
    console.log('\nTip: run `node scripts/releases.mjs --commands` for install/update/tag commands.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
