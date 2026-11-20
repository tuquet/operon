import { Buffer } from 'node:buffer';

import { config } from './common.mjs';

export async function github(
  path,
  { method = 'GET', body, optional = false, raw = false } = {},
) {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN is required');
  const url = `https://api.github.com/repos/${config.repository}/${path}`;
  const defaultAccept = raw
    ? 'application/octet-stream'
    : 'application/vnd.github+json';
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: typeof raw === 'string' ? raw : defaultAccept,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub ${method} ${path}: ${response.status} ${detail.message ?? ''}`,
    );
  }
  if (raw) return Buffer.from(await response.arrayBuffer());
  return response.status === 204 ? null : response.json();
}

export async function listReleases() {
  const result = [];
  for (let page = 1; ; page++) {
    const items = await github(`releases?per_page=100&page=${page}`);
    result.push(...items);
    if (items.length < 100) return result;
  }
}

export async function readState() {
  const ref = await github(`git/ref/heads/${config.stateBranch}`, {
    optional: true,
  });
  if (!ref)
    return {
      sha: null,
      state: {
        schemaVersion: 1,
        product: 'operon-console',
        channels: {},
        releases: {},
        history: [],
      },
    };
  const file = await github(`contents/registry.json?ref=${ref.object.sha}`, {
    raw: 'application/vnd.github.raw+json',
  });
  const state = JSON.parse(file.toString('utf8'));
  if (state.schemaVersion !== 1 || state.product !== 'operon-console')
    throw new Error('Unsupported release registry schema');
  return { sha: ref.object.sha, state };
}

/** One commit updates the registry and every channel feed atomically. */
export async function writeState(previousSha, state, message) {
  const files = { 'registry.json': state };
  for (const channel of ['stable', 'beta', 'nightly']) {
    const tag = state.channels[channel]?.tag;
    const release = tag ? state.releases[tag] : undefined;
    // Missing feeds deliberately produce a non-2xx response, never advertise a revoked release.
    if (release?.status === 'published')
      files[`updates/${channel}/latest.json`] = release.updater;
  }
  const tree = await github('git/trees', {
    method: 'POST',
    body: {
      tree: Object.entries(files).map(([path, value]) => ({
        path,
        mode: '100644',
        type: 'blob',
        content: `${JSON.stringify(value, null, 2)}\n`,
      })),
    },
  });
  const commit = await github('git/commits', {
    method: 'POST',
    body: {
      message,
      tree: tree.sha,
      parents: previousSha ? [previousSha] : [],
    },
  });
  await github(
    previousSha ? `git/refs/heads/${config.stateBranch}` : 'git/refs',
    {
      method: previousSha ? 'PATCH' : 'POST',
      body: previousSha
        ? { sha: commit.sha, force: false }
        : { ref: `refs/heads/${config.stateBranch}`, sha: commit.sha },
    },
  );
  return commit.sha;
}
