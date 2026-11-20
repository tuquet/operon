import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertVersions,
  channelFor,
  channelUrl,
  config,
  git,
  isMain,
  parseVersion,
  product,
  readJson,
  root,
  syncVersion,
  writeJson,
} from './common.mjs';

export function releaseIdentity({ version, ref, runNumber, attempt = '1' }) {
  parseVersion(version);
  if (ref.startsWith('refs/tags/')) {
    const tag = ref.slice('refs/tags/'.length);
    if (tag !== `v${version}` || channelFor(version) === 'nightly')
      throw new Error(
        'Release tag must match the committed stable/beta product version',
      );
    return { version, tag, channel: channelFor(version) };
  }
  if (ref !== 'refs/heads/main')
    throw new Error('Nightly builds must originate from main');
  if (!/^\d+$/.test(runNumber) || !/^\d+$/.test(attempt))
    throw new Error('Nightly builds require a numeric run number and attempt');
  const base = parseVersion(version).core.join('.');
  const nightly = `${base}-nightly.${runNumber}.${attempt}`;
  return { version: nightly, tag: `v${nightly}`, channel: 'nightly' };
}

if (isMain(import.meta.url)) {
  assertVersions();
  if (process.env.GITHUB_REPOSITORY !== config.repository)
    throw new Error('Release repository does not match release/config.json');
  const identity = releaseIdentity({
    version: product.version,
    ref: process.env.GITHUB_REF ?? '',
    runNumber: process.env.GITHUB_RUN_NUMBER ?? '',
    attempt: process.env.GITHUB_RUN_ATTEMPT,
  });
  const commit = git('rev-parse', 'HEAD');
  git('merge-base', '--is-ancestor', 'HEAD', 'origin/main');
  if (commit !== process.env.GITHUB_SHA)
    throw new Error('Checked out source does not match triggering commit');
  if (git('status', '--porcelain'))
    throw new Error('Release preparation requires a clean source checkout');
  const directory = resolve(root, '.temp/release');
  mkdirSync(directory, { recursive: true });
  const context = {
    ...identity,
    commit,
    builtAt: new Date().toISOString(),
    runUrl: `https://github.com/${config.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    repository: config.repository,
    subsystem: readJson('subsystem.json'),
  };
  syncVersion(identity.version);
  writeJson('.temp/release/context.json', context);
  writeJson('.temp/release/tauri.json', {
    version: identity.version,
    bundle: { createUpdaterArtifacts: true },
    plugins: {
      updater: {
        endpoints: [channelUrl(identity.channel)],
        requireSignedVersion: true,
      },
    },
  });
  if (process.env.GITHUB_OUTPUT) {
    for (const [key, value] of Object.entries(identity))
      appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  console.log(`Prepared ${identity.tag} (${identity.channel})`);
}
