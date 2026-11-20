// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { artifactUrl } from '../artifacts.mjs';
import { publish } from '../publish.mjs';
import { fileDigest } from '../signatures.mjs';

const mocks = vi.hoisted(() => ({
  github: vi.fn(),
  readState: vi.fn(),
  writeState: vi.fn(),
  verify: vi.fn(),
}));
vi.mock('../github.mjs', () => ({
  github: mocks.github,
  readState: mocks.readState,
  writeState: mocks.writeState,
}));
vi.mock('../artifacts.mjs', async (original) => ({
  ...(await original()),
  verifyReleaseDirectory: mocks.verify,
}));

let directory;
let manifest;
let release;
let assets;
let uploaded;
beforeEach(async () => {
  vi.resetAllMocks();
  directory = await mkdtemp(join(tmpdir(), 'operon-publish-test-'));
  manifest = {
    schemaVersion: 1,
    product: 'operon-console',
    version: '5.8.1',
    tag: 'v5.8.1',
    channel: 'stable',
    builtAt: '2026-11-10T00:00:00Z',
    notes: 'Release',
    source: { consoleCommit: 'a'.repeat(40), operonCommit: 'b'.repeat(40) },
    build: { runUrl: 'https://example.com/build' },
    artifacts: [],
  };
  assets = [];
  uploaded = [];
  for (const [name, kind] of [
    ['app.exe', 'installer'],
    ['app.zip', 'portable'],
  ]) {
    const file = join(directory, name);
    await writeFile(file, 'release bytes');
    const sha256 = await fileDigest(file);
    assets.push({
      id: assets.length + 1,
      name,
      state: 'uploaded',
      digest: `sha256:${sha256}`,
    });
    manifest.artifacts.push({
      name,
      kind,
      platform: 'windows-x86_64',
      size: 13,
      sha256,
      url: artifactUrl(manifest.tag, name),
      ...(kind === 'installer' ? { signature: 'verified elsewhere' } : {}),
    });
  }
  release = {
    id: 42,
    tag_name: manifest.tag,
    draft: true,
    immutable: false,
    assets: [],
    published_at: null,
  };
  mocks.verify.mockResolvedValue(manifest);
  mocks.readState.mockImplementation(async () => ({
    sha: 'previous',
    state: {
      schemaVersion: 1,
      product: 'operon-console',
      channels: {},
      releases: {},
      history: [],
    },
  }));
  mocks.github.mockImplementation(async (path, options) => {
    if (path === 'immutable-releases') return { enabled: true };
    if (path.startsWith('releases/tags/')) return null;
    if (path.startsWith('git/ref/'))
      return { object: { type: 'commit', sha: manifest.source.consoleCommit } };
    if (path === 'releases/generate-notes') return { body: 'Release notes' };
    if (path === 'releases') return release;
    if (path === 'releases/42' && options?.method === 'PATCH') {
      if (uploaded.length !== 2)
        throw new Error('Publication attempted before every upload');
      release = {
        ...release,
        draft: false,
        immutable: true,
        assets,
        published_at: manifest.builtAt,
      };
      return release;
    }
    if (path === 'releases/42') return release;
    throw new Error(`Unexpected API path ${path}`);
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const name = new URL(url).searchParams.get('name');
      uploaded.push(name);
      return Response.json(assets.find((asset) => asset.name === name));
    }),
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

describe('release publication transaction', () => {
  it('publishes only after every asset is uploaded and registers after publication', async () => {
    await publish(directory);
    expect(mocks.writeState).toHaveBeenCalledOnce();
    const state = mocks.writeState.mock.calls[0][1];
    expect(state.channels.stable.tag).toBe('v5.8.1');
    expect(state.releases['v5.8.1'].githubReleaseId).toBe(42);
  });
  it('leaves a draft and channel untouched when GitHub reports the wrong digest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ state: 'uploaded', digest: 'sha256:wrong' }),
      ),
    );
    await expect(publish(directory)).rejects.toThrow('digest mismatch');
    expect(release.draft).toBe(true);
    expect(mocks.writeState).not.toHaveBeenCalled();
    expect(
      mocks.github.mock.calls.some(
        ([, options]) => options?.method === 'PATCH',
      ),
    ).toBe(false);
  });
  it('never replaces existing assets with different bytes', async () => {
    const existing = {
      ...release,
      assets: [{ ...assets[0], digest: 'sha256:wrong' }],
    };
    const implementation = mocks.github.getMockImplementation();
    mocks.github.mockImplementation((path, options) =>
      path.startsWith('releases/tags/')
        ? existing
        : implementation(path, options),
    );
    await expect(publish(directory)).rejects.toThrow('never overwritten');
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.writeState).not.toHaveBeenCalled();
  });
  it('succeeds under Actions GITHUB_TOKEN when immutable-releases returns 403 and verifies release.immutable', async () => {
    const implementation = mocks.github.getMockImplementation();
    mocks.github.mockImplementation(async (path, options) => {
      if (path === 'immutable-releases') {
        throw new Error(
          'GitHub GET immutable-releases: 403 Resource not accessible by integration',
        );
      }
      return implementation(path, options);
    });
    await publish(directory);
    expect(mocks.writeState).toHaveBeenCalledOnce();
  });
  it('rejects mutable published releases even when immutable-releases precheck returned 403', async () => {
    mocks.github.mockImplementation(async (path, options) => {
      if (path === 'immutable-releases') {
        throw new Error(
          'GitHub GET immutable-releases: 403 Resource not accessible by integration',
        );
      }
      if (path.startsWith('releases/tags/')) return null;
      if (path.startsWith('git/ref/'))
        return {
          object: { type: 'commit', sha: manifest.source.consoleCommit },
        };
      if (path === 'releases/generate-notes') return { body: 'Release notes' };
      if (path === 'releases') return release;
      if (path === 'releases/42' && options?.method === 'PATCH') {
        release = {
          ...release,
          draft: false,
          immutable: false,
          assets,
          published_at: manifest.builtAt,
        };
        return release;
      }
      if (path === 'releases/42') return release;
      throw new Error(`Unexpected API path ${path}`);
    });
    await expect(publish(directory)).rejects.toThrow('unexpectedly mutable');
    expect(mocks.writeState).not.toHaveBeenCalled();
  });
});
