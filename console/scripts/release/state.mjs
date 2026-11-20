import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  updaterManifest,
  validateManifest,
  verifyReleaseDirectory,
} from './artifacts.mjs';
import { compareVersions, config, isMain } from './common.mjs';
import { github, readState, writeState } from './github.mjs';

export function promote(state, channel, tag, event) {
  if (!['beta', 'nightly', 'stable'].includes(channel))
    throw new Error('Invalid channel');
  const release = state.releases[tag];
  if (!release || release.status !== 'published')
    throw new Error('Cannot promote an unavailable or revoked release');
  if (
    (channel === 'stable' && release.channel !== 'stable') ||
    (channel === 'beta' && release.channel === 'nightly')
  )
    throw new Error('Release is not eligible for this channel');
  const current = state.releases[state.channels[channel]?.tag];
  if (current && compareVersions(release.version, current.version) < 0)
    throw new Error(
      'Channel downgrade is blocked; publish a higher patch version to roll forward',
    );
  state.channels[channel] = {
    tag,
    updatedAt: event.at,
    updatedBy: event.actor,
  };
  state.history.push({ ...event, action: 'promote', channel, tag });
}

export function register(state, release, manifest, event) {
  validateManifest(manifest);
  if (
    release.draft ||
    release.tag_name !== manifest.tag ||
    !release.published_at
  )
    throw new Error('Release is not published');
  const existing = state.releases[manifest.tag];
  if (existing) {
    if (
      existing.githubReleaseId !== release.id ||
      existing.status !== 'published'
    )
      throw new Error('Release identity already exists or was revoked');
    return;
  }
  state.releases[manifest.tag] = {
    version: manifest.version,
    channel: manifest.channel,
    status: 'published',
    githubReleaseId: release.id,
    publishedAt: release.published_at,
    source: manifest.source,
    manifestUrl: `https://github.com/${config.repository}/releases/download/${manifest.tag}/release-manifest.json`,
    artifacts: manifest.artifacts.map((artifact) => ({
      ...artifact,
      githubAssetId: release.assets.find(
        (asset) => asset.name === artifact.name,
      )?.id,
    })),
    updater: updaterManifest(manifest),
  };
  state.history.push({ ...event, action: 'register', tag: manifest.tag });
  const current = state.releases[state.channels[manifest.channel]?.tag];
  // Older concurrent builds can register without moving a channel backwards.
  if (!current || compareVersions(manifest.version, current.version) > 0)
    promote(state, manifest.channel, manifest.tag, event);
}

export function revoke(state, tag, reason, event) {
  if (!reason?.trim()) throw new Error('A revocation reason is required');
  const release = state.releases[tag];
  if (release?.status === 'revoked') return;
  if (!release || release.status !== 'published')
    throw new Error('Release is not active');
  release.status = 'revoked';
  release.revokedAt = event.at;
  release.reason = reason;
  state.channels = Object.fromEntries(
    Object.entries(state.channels).filter(([, pointer]) => pointer.tag !== tag),
  );
  state.history.push({ ...event, action: 'revoke', tag, reason });
}

export function retentionCandidates(state, { keep, days }, now = Date.now()) {
  const selected = new Set(
    Object.values(state.channels).map((pointer) => pointer.tag),
  );
  const nightlies = Object.entries(state.releases)
    .filter(
      ([, release]) =>
        release.channel === 'nightly' && release.status !== 'archived',
    )
    .toSorted(
      (a, b) => Date.parse(b[1].publishedAt) - Date.parse(a[1].publishedAt),
    );
  return nightlies
    .filter(
      ([tag, release], index) =>
        !selected.has(tag) &&
        index >= keep &&
        now - Date.parse(release.publishedAt) > days * 86_400_000,
    )
    .map(([tag]) => tag);
}

export function auditEvent(reason) {
  return {
    at: new Date().toISOString(),
    actor: process.env.GITHUB_ACTOR ?? 'local',
    runUrl: process.env.GITHUB_RUN_ID
      ? `https://github.com/${config.repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined,
    ...(reason ? { reason } : {}),
  };
}

if (isMain(import.meta.url)) {
  const { sha, state } = await readState();
  const action = process.env.RELEASE_ACTION ?? process.argv[2];
  const tag = process.env.RELEASE_TAG;
  const event = auditEvent();
  if (action === 'promote')
    promote(state, process.env.RELEASE_CHANNEL, tag, event);
  else if (action === 'revoke')
    revoke(state, tag, process.env.RELEASE_REASON, event);
  else if (action === 'reconcile') {
    const release = await github(`releases/tags/${encodeURIComponent(tag)}`);
    if (release.draft || !release.immutable)
      throw new Error('Only published immutable releases can be reconciled');
    const directory = await mkdtemp(join(tmpdir(), 'operon-reconcile-'));
    try {
      for (const asset of release.assets) {
        if (!/^[\w][\w.-]*$/.test(asset.name))
          throw new Error('Invalid asset filename');
        await writeFile(
          join(directory, asset.name),
          await github(`releases/assets/${asset.id}`, { raw: true }),
        );
      }
      register(state, release, await verifyReleaseDirectory(directory), event);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  } else if (action === 'prune') {
    const tags = retentionCandidates(state, config.nightlyRetention);
    console.log(`Expired managed nightlies: ${tags.join(', ') || 'none'}`);
    if (process.env.RELEASE_APPLY !== 'true' || tags.length === 0)
      process.exit(0);
    for (const candidate of tags) {
      const release = state.releases[candidate];
      const remote = await github(`releases/${release.githubReleaseId}`, {
        optional: true,
      });
      if (remote && (remote.tag_name !== candidate || !remote.prerelease))
        throw new Error('Refusing to delete an unmanaged or stable release');
      if (remote)
        await github(`releases/${release.githubReleaseId}`, {
          method: 'DELETE',
        });
      release.status = 'archived';
      state.history.push({ ...event, action: 'archive', tag: candidate });
    }
  } else throw new Error('Use promote, revoke, reconcile or prune');
  await writeState(sha, state, `release: ${action} ${tag ?? 'nightlies'}`);
  if (action === 'revoke') {
    const release = await github(
      `releases/${state.releases[tag].githubReleaseId}`,
    );
    const notice = `> WITHDRAWN: ${state.releases[tag].reason}\n\n`;
    const body = release.body ?? '';
    await github(`releases/${release.id}`, {
      method: 'PATCH',
      body: {
        prerelease: true,
        make_latest: 'false',
        body: body.startsWith(notice) ? body : `${notice}${body}`,
      },
    });
  }
}
