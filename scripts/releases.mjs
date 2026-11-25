import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const showCommands = args.includes('--commands') || args.includes('--install');
  const tagIdx = args.indexOf('--tag');
  const selectedTag = tagIdx >= 0 ? args[tagIdx + 1] : undefined;

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
  } else {
    console.log('\nTip: run `node scripts/releases.mjs --commands` for install/update/tag commands.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
