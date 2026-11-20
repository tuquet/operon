import { appendFileSync } from 'node:fs';

import {
  channelFor,
  compareVersions,
  git,
  isMain,
  parseVersion,
  product,
  syncVersion,
} from './common.mjs';
import { github } from './github.mjs';

if (isMain(import.meta.url)) {
  const version = process.env.RELEASE_VERSION;
  parseVersion(version);
  if (
    channelFor(version) === 'nightly' ||
    compareVersions(version, product.version) <= 0
  )
    throw new Error('Choose a new stable or beta product version');
  const branch = `release/v${version}`;
  git('switch', '-c', branch);
  syncVersion(version, { canonical: true });
  git('config', 'user.name', 'github-actions[bot]');
  git(
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  );
  git(
    'add',
    'release/version.json',
    'package.json',
    'apps/shell/package.json',
    'apps/shell/src-tauri/tauri.conf.json',
    'apps/shell/src-tauri/Cargo.toml',
    'apps/shell/src-tauri/Cargo.lock',
  );
  git('commit', '-m', `chore(release): prepare v${version}`);
  git('push', 'origin', `HEAD:refs/heads/${branch}`);
  const pr = await github('pulls', {
    method: 'POST',
    body: {
      title: `Release v${version}`,
      head: branch,
      base: 'main',
      draft: false,
      body: `Prepare product version **${version}**. After merging and passing quality checks, tag the merged commit as v${version} to build the signed release. Nightlies continue automatically from main.`,
    },
  });
  console.log(pr.html_url);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Release PR: ${pr.html_url}\n`,
    );
  await github('actions/workflows/quality.yml/dispatches', {
    method: 'POST',
    body: { ref: branch },
  });
}
