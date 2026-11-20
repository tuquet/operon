import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import {
  channelFor,
  config,
  isMain,
  parseVersion,
  readJson,
  root,
} from './common.mjs';
import { fileDigest, verifyArtifactSignature } from './signatures.mjs';

function compareNames(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

async function fileSize(file) {
  const info = await stat(file);
  return info.size;
}
async function readText(file) {
  const text = await readFile(file, 'utf8');
  return text.trim();
}

export function artifactUrl(tag, name) {
  return `https://github.com/${config.repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
}

export function validateManifest(manifest) {
  parseVersion(manifest.version);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.product !== 'operon-console' ||
    manifest.tag !== `v${manifest.version}` ||
    manifest.channel !== channelFor(manifest.version)
  )
    throw new Error('Invalid release manifest identity');
  if (
    !/^[a-f0-9]{40}$/.test(manifest.source?.consoleCommit) ||
    !/^[a-f0-9]{40}$/.test(manifest.source?.operonCommit) ||
    !Number.isFinite(Date.parse(manifest.builtAt))
  )
    throw new Error('Release provenance is missing');
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0)
    throw new Error('Release artifacts are missing');
  const names = new Set();
  for (const artifact of manifest.artifacts) {
    if (
      !/^[\w.-]+$/.test(artifact.name) ||
      names.has(artifact.name) ||
      !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
      !Number.isSafeInteger(artifact.size) ||
      artifact.size <= 0 ||
      artifact.url !== artifactUrl(manifest.tag, artifact.name)
    )
      throw new Error('Invalid release artifact metadata');
    names.add(artifact.name);
    if (
      !config.platforms.includes(artifact.platform) ||
      !['installer', 'portable'].includes(artifact.kind)
    )
      throw new Error('Invalid release platform or artifact kind');
    if (artifact.kind === 'installer' && !artifact.signature)
      throw new Error('Updater installer signature is missing');
  }
  for (const platform of config.platforms) {
    for (const kind of ['installer', 'portable']) {
      if (
        manifest.artifacts.filter(
          (artifact) =>
            artifact.platform === platform && artifact.kind === kind,
        ).length !== 1
      )
        throw new Error(`Expected one ${kind} for ${platform}`);
    }
  }
}

export function updaterManifest(manifest) {
  validateManifest(manifest);
  return {
    version: manifest.version,
    notes: manifest.notes,
    pub_date: manifest.builtAt,
    platforms: Object.fromEntries(
      manifest.artifacts
        .filter((artifact) => artifact.kind === 'installer')
        .map((artifact) => [
          artifact.platform,
          { url: artifact.url, signature: artifact.signature },
        ]),
    ),
  };
}

export async function verifyReleaseDirectory(
  directory,
  publicKey = readJson('apps/shell/src-tauri/tauri.conf.json').plugins.updater
    .pubkey,
) {
  const manifest = JSON.parse(
    await readFile(join(directory, 'release-manifest.json'), 'utf8'),
  );
  validateManifest(manifest);
  for (const artifact of manifest.artifacts) {
    const file = join(directory, artifact.name);
    if (
      (await fileSize(file)) !== artifact.size ||
      (await fileDigest(file)) !== artifact.sha256
    )
      throw new Error(`Artifact checksum mismatch: ${artifact.name}`);
    if (artifact.kind === 'installer') {
      const signature = await readText(`${file}.sig`);
      if (signature !== artifact.signature)
        throw new Error('Signature file differs from manifest');
      await verifyArtifactSignature(
        file,
        signature,
        publicKey,
        manifest.version,
      );
    }
  }
  const updater = JSON.parse(
    await readFile(join(directory, 'latest.json'), 'utf8'),
  );
  if (JSON.stringify(updater) !== JSON.stringify(updaterManifest(manifest)))
    throw new Error('latest.json differs from release manifest');
  const expected = new Set([
    'checksums.sha256',
    'latest.json',
    'release-manifest.json',
    ...manifest.artifacts.flatMap((artifact) =>
      artifact.kind === 'installer'
        ? [artifact.name, `${artifact.name}.sig`]
        : [artifact.name],
    ),
  ]);
  const files = await readdir(directory);
  if (
    files.length !== expected.size ||
    files.some((name) => !expected.has(name))
  )
    throw new Error('Unexpected or missing release files');
  const checksumText = await readText(join(directory, 'checksums.sha256'));
  const computed = await Promise.all(
    [...expected]
      .filter((name) => name !== 'checksums.sha256')
      .toSorted(compareNames)
      .map(
        async (name) => `${await fileDigest(join(directory, name))}  ${name}`,
      ),
  );
  if (checksumText !== computed.join('\n'))
    throw new Error('checksums.sha256 differs from release files');
  return manifest;
}

export async function packageRelease({
  binaryDirectory,
  outputDirectory,
  context,
}) {
  if (context.repository !== config.repository)
    throw new Error('Unexpected release repository');
  // Require a new directory: stale artifacts must never enter a release.
  await mkdir(outputDirectory, { recursive: false });
  const installerDirectory = join(binaryDirectory, 'bundle/nsis');
  const installerFiles = await readdir(installerDirectory);
  const installers = installerFiles.filter((name) => name.endsWith('.exe'));
  if (installers.length !== 1)
    throw new Error('Expected exactly one freshly built NSIS installer');
  const prefix = `Operon-${context.version}-windows-x86_64`;
  const installerName = `${prefix}-setup.exe`;
  const installerSource = join(installerDirectory, installers[0]);
  await copyFile(installerSource, join(outputDirectory, installerName));
  await copyFile(
    `${installerSource}.sig`,
    join(outputDirectory, `${installerName}.sig`),
  );
  const binaryFiles = await readdir(binaryDirectory);
  const binaryNames = binaryFiles.filter((name) =>
    ['Operon.exe', 'workstation.exe'].includes(name),
  );
  if (binaryNames.length !== 1)
    throw new Error('Expected exactly one portable executable');
  const portableName = `${prefix}-portable.zip`;
  execFileSync(
    'tar',
    [
      '-a',
      '-c',
      '-f',
      join(outputDirectory, portableName),
      '-C',
      binaryDirectory,
      binaryNames[0],
    ],
    { stdio: 'inherit' },
  );
  const artifacts = [];
  for (const [name, kind] of [
    [installerName, 'installer'],
    [portableName, 'portable'],
  ]) {
    const file = join(outputDirectory, name);
    artifacts.push({
      name,
      kind,
      platform: 'windows-x86_64',
      size: await fileSize(file),
      sha256: await fileDigest(file),
      url: artifactUrl(context.tag, name),
      ...(kind === 'installer'
        ? { signature: await readText(`${file}.sig`) }
        : {}),
    });
  }
  const manifest = {
    schemaVersion: 1,
    product: 'operon-console',
    version: context.version,
    tag: context.tag,
    channel: context.channel,
    builtAt: context.builtAt,
    notes: `Operon ${context.version}. See the GitHub release for changes.`,
    source: {
      consoleCommit: context.commit,
      operonCommit: context.subsystem.revision,
    },
    build: {
      runUrl: context.runUrl,
      node: process.version,
      rust: execFileSync('rustc', ['--version'], { encoding: 'utf8' }).trim(),
    },
    artifacts,
  };
  await writeFile(
    join(outputDirectory, 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(
    join(outputDirectory, 'latest.json'),
    `${JSON.stringify(updaterManifest(manifest), null, 2)}\n`,
  );
  const outputFiles = await readdir(outputDirectory);
  const checksums = await Promise.all(
    outputFiles
      .toSorted(compareNames)
      .map(
        async (name) =>
          `${await fileDigest(join(outputDirectory, name))}  ${name}`,
      ),
  );
  await writeFile(
    join(outputDirectory, 'checksums.sha256'),
    `${checksums.join('\n')}\n`,
  );
  await verifyReleaseDirectory(outputDirectory);
  return manifest;
}

export async function packagePreview(binaryDirectory, outputDirectory) {
  await mkdir(outputDirectory, { recursive: false });
  const binaryFiles = await readdir(binaryDirectory);
  const candidates = binaryFiles.filter((name) =>
    ['Operon.exe', 'workstation.exe'].includes(name),
  );
  if (candidates.length !== 1)
    throw new Error('Expected one preview executable');
  const archive = join(outputDirectory, 'Operon-preview-windows-x86_64.zip');
  execFileSync(
    'tar',
    ['-a', '-c', '-f', archive, '-C', binaryDirectory, candidates[0]],
    { stdio: 'inherit' },
  );
  await writeFile(
    join(outputDirectory, 'checksums.sha256'),
    `${await fileDigest(archive)}  ${basename(archive)}\n`,
  );
}

if (isMain(import.meta.url)) {
  const directory = resolve(
    root,
    process.env.RELEASE_OUTPUT_DIR ?? 'dist-release',
  );
  if (process.argv.includes('--verify')) {
    await verifyReleaseDirectory(directory);
    console.log('Release artifacts, hashes and updater signatures verified.');
  } else {
    const binaryDirectory = resolve(
      root,
      process.env.RELEASE_BINARY_DIR ??
        'apps/shell/src-tauri/target/x86_64-pc-windows-msvc/release',
    );
    await (process.argv.includes('--preview')
      ? packagePreview(binaryDirectory, directory)
      : packageRelease({
          binaryDirectory,
          outputDirectory: directory,
          context: readJson('.temp/release/context.json'),
        }));
    console.log(`Packaged artifacts in ${directory}`);
  }
}
