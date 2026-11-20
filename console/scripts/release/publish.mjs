import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { verifyReleaseDirectory } from './artifacts.mjs';
import { compareVersions, config, isMain, root } from './common.mjs';
import { github, readState, writeState } from './github.mjs';
import { fileDigest } from './signatures.mjs';
import { auditEvent, register } from './state.mjs';

export async function publish(directory) {
  const manifest = await verifyReleaseDirectory(directory);
  // Actions GITHUB_TOKEN cannot hold Administration:read (403 on immutable-releases);
  // post-publish `release.immutable` below still enforces immutability via Contents:read.
  const immutability = await github('immutable-releases').catch((error) => {
    if (error instanceof Error && error.message.includes(': 403 ')) return null;
    throw error;
  });
  if (immutability && !immutability.enabled)
    throw new Error('Enable GitHub release immutability before publishing');
  const releases = await github(
    `releases/tags/${encodeURIComponent(manifest.tag)}`,
    { optional: true },
  );
  let release = releases;
  const { state: before } = await readState();
  if (before.releases[manifest.tag]?.status === 'revoked')
    throw new Error('Cannot republish a revoked release');
  const newestStable = Object.values(before.releases)
    .filter((item) => item.channel === 'stable')
    .toSorted((a, b) => compareVersions(b.version, a.version))[0];
  if (
    manifest.channel === 'stable' &&
    newestStable &&
    compareVersions(manifest.version, newestStable.version) < 0
  )
    throw new Error('Cannot publish an older stable version');
  const tagRef = await github(
    `git/ref/tags/${encodeURIComponent(manifest.tag)}`,
    { optional: true },
  );
  if (tagRef) {
    let object = tagRef.object;
    while (object.type === 'tag') {
      const annotated = await github(`git/tags/${object.sha}`);
      object = annotated.object;
    }
    if (
      object.type !== 'commit' ||
      object.sha !== manifest.source.consoleCommit
    )
      throw new Error('Git tag points to a different source commit');
  } else {
    await github('git/refs', {
      method: 'POST',
      body: {
        ref: `refs/tags/${manifest.tag}`,
        sha: manifest.source.consoleCommit,
      },
    });
  }
  if (!release) {
    const notes = await github('releases/generate-notes', {
      method: 'POST',
      body: {
        tag_name: manifest.tag,
        target_commitish: manifest.source.consoleCommit,
      },
    });
    release = await github('releases', {
      method: 'POST',
      body: {
        tag_name: manifest.tag,
        target_commitish: manifest.source.consoleCommit,
        name: `Operon ${manifest.version}`,
        body: `${notes.body}\n\nBuild: ${manifest.build.runUrl}`,
        draft: true,
        prerelease: manifest.channel !== 'stable',
      },
    });
  }
  const fileNames = await readdir(directory);
  const files = fileNames.toSorted();
  const uploadedNames = new Set(release.assets.map((asset) => asset.name));
  if ([...uploadedNames].some((name) => !files.includes(name)))
    throw new Error('Release contains unexpected assets');
  for (const name of files) {
    const file = join(directory, name);
    const digest = `sha256:${await fileDigest(file)}`;
    let asset = release.assets.find((item) => item.name === name);
    if (!asset) {
      if (!release.draft)
        throw new Error(
          'Published release is missing an asset; create a new version',
        );
      const response = await fetch(
        `https://uploads.github.com/repos/${config.repository}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/octet-stream',
          },
          body: await readFile(file),
        },
      );
      if (!response.ok)
        throw new Error(`Asset upload failed: ${name} (${response.status})`);
      asset = await response.json();
    }
    if (asset.digest !== digest || asset.state !== 'uploaded')
      throw new Error(
        `Uploaded asset digest mismatch: ${name}. Existing assets are never overwritten.`,
      );
  }
  if (release.draft)
    release = await github(`releases/${release.id}`, {
      method: 'PATCH',
      body: {
        draft: false,
        make_latest: manifest.channel === 'stable' ? 'true' : 'false',
      },
    });
  // Refetch to include all uploaded assets and the authoritative publication time.
  release = await github(`releases/${release.id}`);
  if (!release.immutable)
    throw new Error('Published release is unexpectedly mutable');
  const { sha, state } = await readState();
  register(state, release, manifest, auditEvent());
  await writeState(sha, state, `release: publish ${manifest.tag}`);
  console.log(`Published and registered ${release.html_url}`);
}

if (isMain(import.meta.url))
  await publish(
    resolve(root, process.env.RELEASE_OUTPUT_DIR ?? 'dist-release'),
  );
