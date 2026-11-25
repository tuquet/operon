import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `Usage: node scripts/releases.mjs [--commands] [--tag <tag>] [--json] [-h|--help]`;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function ghToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function ghJson(endpoint, { optional = false, raw = false } = {}) {
  const token = ghToken();
  const accept = raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json';
  try {
    const res = await fetch(`https://api.github.com/${endpoint}`, {
      headers: { Accept: accept, 'User-Agent': 'operon-releases', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (optional && res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub GET ${endpoint}: ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    // Fallback to `gh api` when corporate proxy intercepts TLS without system CA.
    if (err instanceof TypeError || err?.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      try {
        const args = ['api', endpoint, ...(raw ? ['-H', `Accept: ${accept}`] : [])];
        return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
      } catch (ghErr) {
        if (optional && String(ghErr?.stderr).includes('404')) return null;
        throw new Error(String(ghErr?.stderr).trim() || err.message);
      }
    }
    throw err;
  }
}

const fmtRelease = (r, latestId) => ({
  tag: r.tag_name,
  date: (r.published_at ?? r.created_at ?? '').slice(0, 10),
  flags: [r.id === latestId && 'latest', r.draft && 'draft', r.prerelease && 'prerelease'].filter(Boolean).join(','),
  assets: r.assets?.length ?? 0,
  url: r.html_url,
});

function printCommands({ repo, stateBranch, cliVersion, consoleVersion, hasLatestCli, cliReleases, desktopReleases, channels, selectedTag }) {
  const base = `https://github.com/${repo}`;
  console.log('\nCommands:');
  if (cliReleases.length > 0 && hasLatestCli) {
    console.log(`  CLI (pwsh):    irm ${base}/releases/latest/download/install.ps1 | iex`);
    console.log(`  CLI (sh):      curl -fsSL ${base}/releases/latest/download/install.sh | sh`);
  }
  for (const ch of ['stable', 'beta', 'nightly']) {
    if (channels[ch]) console.log(`  Desktop ${ch.padEnd(7)}: https://raw.githubusercontent.com/${repo}/${stateBranch}/updates/${ch}/latest.json`);
  }
  if (selectedTag) {
    const match = [...cliReleases, ...desktopReleases].find((r) => r.tag === selectedTag);
    console.log(`  Tag ${selectedTag}: ${match ? match.url : '(not published)'}`);
  }
  console.log(`  Tag CLI:       git tag v${cliVersion} && git spush origin v${cliVersion}`);
  console.log(`  Tag Desktop:   git tag console-v${consoleVersion} && git spush origin console-v${consoleVersion}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return console.log(HELP);

  const tagIdx = args.indexOf('--tag');
  const selectedTag = tagIdx >= 0 ? args[tagIdx + 1] : undefined;
  const cliCargo = fs.readFileSync(path.join(ROOT, 'core/crates/cli/Cargo.toml'), 'utf8');
  const cliVersion = cliCargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? 'unknown';
  const consoleVersion = readJson('console/release/version.json').version ?? 'unknown';
  const { repository: repo, stateBranch } = readJson('console/release/config.json');

  const [releases, latestCli, registry] = await Promise.all([
    ghJson(`repos/${repo}/releases?per_page=30`),
    ghJson(`repos/${repo}/releases/latest`, { optional: true }),
    ghJson(`repos/${repo}/contents/registry.json?ref=${stateBranch}`, { optional: true, raw: true }),
  ]);

  const cliReleases = releases.filter((r) => /^v\d/.test(r.tag_name)).map((r) => fmtRelease(r, latestCli?.id));
  const desktopReleases = releases.filter((r) => r.tag_name.startsWith('console-v')).map((r) => fmtRelease(r, null));
  const channels = registry?.channels ?? {};

  if (args.includes('--json')) {
    return console.log(JSON.stringify({ repo, stateBranch, cliVersion, consoleVersion, channels, cliReleases, desktopReleases }, null, 2));
  }

  console.log(`${repo} — local: CLI v${cliVersion}, Desktop ${consoleVersion}`);
  console.log(`CLI (v*):     ${cliReleases.length ? '' : '(none)'}`);
  for (const r of cliReleases.slice(0, 8)) console.log(`  ${r.tag.padEnd(18)} ${r.date}  assets=${r.assets}${r.flags ? ` [${r.flags}]` : ''}`);

  const activeCh = ['stable', 'beta', 'nightly'].filter((c) => channels[c]).map((c) => `${c}=${channels[c].tag}`);
  console.log(`Desktop:      ${activeCh.length ? activeCh.join(' | ') : '(none)'}`);
  for (const r of desktopReleases.slice(0, 8)) console.log(`  ${r.tag.padEnd(24)} ${r.date}  assets=${r.assets}${r.flags ? ` [${r.flags}]` : ''}`);

  if (args.includes('--commands') || selectedTag) {
    printCommands({ repo, stateBranch, cliVersion, consoleVersion, hasLatestCli: Boolean(latestCli), cliReleases, desktopReleases, channels, selectedTag });
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
