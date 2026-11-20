import { Buffer } from 'node:buffer';
// @vitest-environment node
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  artifactUrl,
  updaterManifest,
  validateManifest,
  verifyReleaseDirectory,
} from '../artifacts.mjs';
import { channelFor, compareVersions, parseVersion } from '../common.mjs';
import { releaseIdentity } from '../prepare.mjs';
import { fileDigest, verifyArtifactSignature } from '../signatures.mjs';
import { promote, register, retentionCandidates, revoke } from '../state.mjs';

const temporaryDirectories = [];
afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

function signingFixture(payload, algorithm = 'ED') {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const id = Buffer.alloc(8, 7);
  const publicPacket = Buffer.concat([
    Buffer.from('Ed'),
    id,
    publicKey.export({ type: 'spki', format: 'der' }).subarray(-32),
  ]);
  const data =
    algorithm === 'ED'
      ? createHash('blake2b512').update(payload).digest()
      : payload;
  const signature = sign(null, data, privateKey);
  const packet = Buffer.concat([Buffer.from(algorithm), id, signature]);
  const comment = 'timestamp:1234567890\tversion:5.8.1';
  const globalSignature = sign(
    null,
    Buffer.concat([signature, Buffer.from(comment)]),
    privateKey,
  );
  return {
    publicKey: Buffer.from(
      `untrusted comment: test public key\n${publicPacket.toString('base64')}\n`,
    ).toString('base64'),
    signature: Buffer.from(
      `untrusted comment: test signature\n${packet.toString('base64')}\ntrusted comment: ${comment}\n${globalSignature.toString('base64')}\n`,
    ).toString('base64'),
  };
}

function manifestFixture(version = '5.8.1') {
  const tag = `v${version}`;
  return {
    schemaVersion: 1,
    product: 'operon-console',
    version,
    tag,
    channel: channelFor(version),
    builtAt: '2026-11-10T00:00:00Z',
    notes: 'Test release',
    source: { consoleCommit: 'a'.repeat(40), operonCommit: 'b'.repeat(40) },
    build: { runUrl: 'https://github.com/tuquet/console/actions/runs/1' },
    artifacts: ['installer', 'portable'].map((kind) => {
      const name = `Operon-${version}-${kind}.${kind === 'installer' ? 'exe' : 'zip'}`;
      return {
        name,
        kind,
        platform: 'windows-x86_64',
        size: 1,
        sha256: 'c'.repeat(64),
        url: artifactUrl(tag, name),
        ...(kind === 'installer' ? { signature: 'test-signature' } : {}),
      };
    }),
  };
}

function emptyState() {
  return {
    schemaVersion: 1,
    product: 'operon-console',
    channels: {},
    releases: {},
    history: [],
  };
}
const event = { at: '2026-11-10T00:00:00Z', actor: 'tester' };
function registered(state, version, id = 1) {
  const manifest = manifestFixture(version);
  register(
    state,
    {
      id,
      tag_name: manifest.tag,
      draft: false,
      published_at: event.at,
      assets: manifest.artifacts.map((artifact, index) => ({
        id: index,
        name: artifact.name,
      })),
    },
    manifest,
    event,
  );
  return manifest;
}

describe('release versions', () => {
  it.each(['01.2.3', '1.2', '1.2.3-beta.01', '1.2.3/evil', '1.2.3\n'])(
    'rejects invalid version %j',
    (version) => {
      expect(() => parseVersion(version)).toThrow(/.+/);
    },
  );
  it('orders stable, beta and numbered nightlies semantically', () => {
    expect(compareVersions('5.8.1', '5.8.1-beta.2')).toBe(1);
    expect(compareVersions('5.8.1-nightly.10.1', '5.8.1-nightly.9.2')).toBe(1);
    expect(compareVersions('5.8.1-beta.2', '5.8.1-beta.2')).toBe(0);
    expect(compareVersions('5.8.1-beta.2', '5.8.1-beta.2.1')).toBe(-1);
  });
  it('requires tags to match committed product versions', () => {
    expect(() =>
      releaseIdentity({ version: '5.8.1', ref: 'refs/tags/v5.8.2' }),
    ).toThrow(/.+/);
    expect(
      releaseIdentity({
        version: '5.9.0-beta.1',
        ref: 'refs/tags/v5.9.0-beta.1',
      }).channel,
    ).toBe('beta');
  });
  it('gives retried nightlies distinct versions and rejects non-main builds', () => {
    expect(
      releaseIdentity({
        version: '5.8.1',
        ref: 'refs/heads/main',
        runNumber: '12',
        attempt: '2',
      }).version,
    ).toBe('5.8.1-nightly.12.2');
    expect(() =>
      releaseIdentity({
        version: '5.8.1',
        ref: 'refs/heads/feature',
        runNumber: '12',
      }),
    ).toThrow(/.+/);
  });
});

describe('release channel lifecycle', () => {
  it('keeps stable on the newest version when builds finish out of order', () => {
    const state = emptyState();
    registered(state, '5.8.2');
    registered(state, '5.8.1', 2);
    expect(state.channels.stable.tag).toBe('v5.8.2');
    expect(Object.keys(state.releases)).toHaveLength(2);
  });
  it('does not advertise prereleases to stable users', () => {
    const state = emptyState();
    registered(state, '5.9.0-beta.1');
    expect(() => promote(state, 'stable', 'v5.9.0-beta.1', event)).toThrow(
      /.+/,
    );
    expect(state.channels.stable).toBeUndefined();
  });
  it('revokes a release from every channel and cannot silently reinstate it', () => {
    const state = emptyState();
    registered(state, '5.8.1');
    promote(state, 'beta', 'v5.8.1', event);
    revoke(state, 'v5.8.1', 'Startup failure', event);
    expect(state.channels).toEqual({});
    expect(() => promote(state, 'stable', 'v5.8.1', event)).toThrow(/.+/);
    expect(() => registered(state, '5.8.1')).toThrow(/.+/);
    expect(state.history.at(-1).reason).toBe('Startup failure');
  });
  it('blocks downgrades and requires a revocation reason', () => {
    const state = emptyState();
    registered(state, '5.8.1');
    registered(state, '5.8.2', 2);
    expect(() => promote(state, 'stable', 'v5.8.1', event)).toThrow(/.+/);
    expect(() => revoke(state, 'v5.8.2', '', event)).toThrow(/.+/);
  });
  it('never prunes stable, beta, pinned or recently published releases', () => {
    const state = emptyState();
    registered(state, '5.8.1');
    registered(state, '5.9.0-beta.1', 2);
    registered(state, '5.9.0-nightly.1.1', 3);
    registered(state, '5.9.0-nightly.2.1', 4);
    state.releases['v5.9.0-nightly.1.1'].publishedAt = '2026-01-01T00:00:00Z';
    expect(
      retentionCandidates(state, { keep: 1, days: 30 }, Date.parse(event.at)),
    ).toEqual(['v5.9.0-nightly.1.1']);
  });
});

describe('signed release artifacts', () => {
  it.each(['Ed', 'ED'])(
    'verifies real Ed25519 signatures in %s format and rejects changed files',
    async (algorithm) => {
      const directory = await mkdtemp(join(tmpdir(), 'operon-signature-test-'));
      temporaryDirectories.push(directory);
      const file = join(directory, 'app.exe');
      const content = Buffer.from('signed installer');
      const fixture = signingFixture(content, algorithm);
      await writeFile(file, content);
      await expect(
        verifyArtifactSignature(file, fixture.signature, fixture.publicKey),
      ).resolves.toBeUndefined();
      await expect(
        verifyArtifactSignature(
          file,
          fixture.signature,
          fixture.publicKey,
          '5.8.2',
        ),
      ).rejects.toThrow('announced version');
      await writeFile(file, 'tampered installer');
      await expect(
        verifyArtifactSignature(file, fixture.signature, fixture.publicKey),
      ).rejects.toThrow(/.+/);
    },
  );
  it('rejects a different signing key and changed trusted comments', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'operon-key-test-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'app.exe');
    const content = Buffer.from('installer');
    await writeFile(file, content);
    const fixture = signingFixture(content);
    await expect(
      verifyArtifactSignature(
        file,
        fixture.signature,
        signingFixture(content).publicKey,
      ),
    ).rejects.toThrow(/.+/);
    const changedComment = Buffer.from(
      Buffer.from(fixture.signature, 'base64')
        .toString()
        .replace('timestamp:1234567890', 'timestamp:9999999999'),
    ).toString('base64');
    await expect(
      verifyArtifactSignature(file, changedComment, fixture.publicKey),
    ).rejects.toThrow(/.+/);
  });
  it('rejects unsafe asset paths, duplicate platforms and tag mismatches', () => {
    const manifest = manifestFixture();
    manifest.artifacts[0].name = '../app.exe';
    expect(() => validateManifest(manifest)).toThrow(/.+/);
    const duplicate = manifestFixture();
    duplicate.artifacts.push({
      ...duplicate.artifacts[0],
      name: 'another.exe',
      url: artifactUrl(duplicate.tag, 'another.exe'),
    });
    expect(() => validateManifest(duplicate)).toThrow(/.+/);
    expect(() =>
      validateManifest({ ...manifestFixture(), tag: 'v0.0.0' }),
    ).toThrow(/.+/);
  });
  it('verifies the entire release directory and rejects stale files or a changed updater', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'operon-artifact-test-'));
    temporaryDirectories.push(directory);
    const manifest = manifestFixture();
    const content = Buffer.from('installer content');
    const signing = signingFixture(content);
    manifest.artifacts[0].signature = signing.signature;
    for (const artifact of manifest.artifacts) {
      const file = join(directory, artifact.name);
      await writeFile(file, content);
      artifact.size = content.length;
      artifact.sha256 = await fileDigest(file);
    }
    await writeFile(
      join(directory, `${manifest.artifacts[0].name}.sig`),
      signing.signature,
    );
    await writeFile(
      join(directory, 'release-manifest.json'),
      JSON.stringify(manifest),
    );
    await writeFile(
      join(directory, 'latest.json'),
      JSON.stringify(updaterManifest(manifest)),
    );
    const names = [
      'release-manifest.json',
      'latest.json',
      `${manifest.artifacts[0].name}.sig`,
      ...manifest.artifacts.map((artifact) => artifact.name),
    ].toSorted();
    const checksums = await Promise.all(
      names.map(
        async (name) => `${await fileDigest(join(directory, name))}  ${name}`,
      ),
    );
    await writeFile(join(directory, 'checksums.sha256'), checksums.join('\n'));
    await expect(
      verifyReleaseDirectory(directory, signing.publicKey),
    ).resolves.toMatchObject({ tag: 'v5.8.1' });
    await writeFile(join(directory, 'stale.exe'), 'old build');
    await expect(
      verifyReleaseDirectory(directory, signing.publicKey),
    ).rejects.toThrow('Unexpected');
    await rm(join(directory, 'stale.exe'));
    const updater = JSON.parse(
      await readFile(join(directory, 'latest.json'), 'utf8'),
    );
    updater.version = '9.9.9';
    await writeFile(join(directory, 'latest.json'), JSON.stringify(updater));
    await expect(
      verifyReleaseDirectory(directory, signing.publicKey),
    ).rejects.toThrow('latest.json');
  });
});
