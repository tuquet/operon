#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

import {
  channelFor,
  compareVersions,
  config,
  parseVersion,
  readJson,
  root,
} from './release/common.mjs';
import { fileDigest, verifyArtifactSignature } from './release/signatures.mjs';

/**
 * Generate an in-memory Ed25519 Minisign keypair conforming to libsodium / minisign specification.
 */
export function generateMinisignKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const id = Buffer.alloc(8, 7);
  const publicPacket = Buffer.concat([
    Buffer.from('Ed'),
    id,
    publicKey.export({ format: 'der', type: 'spki' }).subarray(-32),
  ]);
  const encodedPublicKey = Buffer.from(
    `untrusted comment: test public key\n${publicPacket.toString('base64')}\n`,
  ).toString('base64');

  return { encodedPublicKey, id, privateKey, publicKey };
}

/**
 * Sign payload bytes using Ed25519 + BLAKE2b-512 in Minisign packet format.
 */
export function createMinisignSignature(
  payload,
  { id, privateKey },
  version,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const data = createHash('blake2b512').update(payload).digest();
  const signature = sign(null, data, privateKey);
  const packet = Buffer.concat([Buffer.from('ED'), id, signature]);
  const comment = `timestamp:${timestamp}\tversion:${version}`;
  const globalSignature = sign(
    null,
    Buffer.concat([signature, Buffer.from(comment)]),
    privateKey,
  );

  return Buffer.from(
    `untrusted comment: test signature\n${packet.toString('base64')}\ntrusted comment: ${comment}\n${globalSignature.toString('base64')}\n`,
  ).toString('base64');
}

/**
 * Generate simulated release artifacts compliant with Operon Release Specification.
 */
export async function createSimulatedRelease({
  keypair,
  outputDir,
  port = 4567,
  version = '5.9.0',
}) {
  parseVersion(version);
  await mkdir(outputDir, { recursive: true });

  const tag = `v${version}`;
  const channel = channelFor(version);
  const installerName = `Operon-${version}-windows-x86_64-setup.exe`;
  const portableName = `Operon-${version}-windows-x86_64-portable.zip`;

  const installerPayload = Buffer.from(
    `SIMULATED_INSTALLER_BINARY_OPERON_RELEASE_${version}`,
  );
  const portablePayload = Buffer.from(
    `SIMULATED_PORTABLE_ZIP_OPERON_RELEASE_${version}`,
  );

  const installerPath = join(outputDir, installerName);
  const portablePath = join(outputDir, portableName);

  await writeFile(installerPath, installerPayload);
  await writeFile(portablePath, portablePayload);

  const encodedSig = createMinisignSignature(
    installerPayload,
    keypair,
    version,
  );
  await writeFile(`${installerPath}.sig`, encodedSig);

  const manifest = {
    artifacts: [
      {
        kind: 'installer',
        name: installerName,
        platform: 'windows-x86_64',
        sha256: await fileDigest(installerPath),
        signature: encodedSig,
        size: installerPayload.length,
        url: `https://github.com/${config.repository}/releases/download/${tag}/${installerName}`,
      },
      {
        kind: 'portable',
        name: portableName,
        platform: 'windows-x86_64',
        sha256: await fileDigest(portablePath),
        size: portablePayload.length,
        url: `https://github.com/${config.repository}/releases/download/${tag}/${portableName}`,
      },
    ],
    build: {
      runUrl: `https://github.com/${config.repository}/actions/runs/local-sim`,
    },
    builtAt: new Date().toISOString(),
    channel,
    notes: `Simulated local release for Operon Console ${version}.`,
    product: 'operon-console',
    schemaVersion: 1,
    source: {
      consoleCommit: '1'.repeat(40),
      operonCommit: '2'.repeat(40),
    },
    tag,
    version,
  };

  await writeFile(
    join(outputDir, 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  // Tauri updater manifest points to local mock server for testing
  const updater = {
    notes: manifest.notes,
    platforms: {
      'windows-x86_64': {
        signature: encodedSig,
        url: `http://127.0.0.1:${port}/download/${installerName}`,
      },
    },
    pub_date: manifest.builtAt,
    version: manifest.version,
  };

  await writeFile(
    join(outputDir, 'latest.json'),
    `${JSON.stringify(updater, null, 2)}\n`,
  );

  const names = [
    'release-manifest.json',
    'latest.json',
    `${installerName}.sig`,
    installerName,
    portableName,
  ].toSorted();

  const checksums = [];
  for (const name of names) {
    checksums.push(`${await fileDigest(join(outputDir, name))}  ${name}`);
  }
  await writeFile(
    join(outputDir, 'checksums.sha256'),
    `${checksums.join('\n')}\n`,
  );

  return { installerName, manifest, portableName, updater };
}

/**
 * Start a local HTTP server serving latest.json and installer binaries.
 */
export function startMockUpdaterServer({ outputDir, port = 4567, updater }) {
  const server = createServer(async (request, response) => {
    // Add CORS headers for desktop webview and local tools
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', '*');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);

    if (url.pathname === '/latest.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(updater, null, 2));
      return;
    }

    if (url.pathname.startsWith('/download/')) {
      const fileName = url.pathname.slice('/download/'.length);
      const filePath = join(outputDir, fileName);
      if (existsSync(filePath)) {
        const fileContent = await readFile(filePath);
        response.writeHead(200, {
          'Content-Length': fileContent.length,
          'Content-Type': 'application/octet-stream',
        });
        response.end(fileContent);
        return;
      }
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not Found');
      return;
    }

    if (url.pathname === '/status') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          feed: `http://127.0.0.1:${port}/latest.json`,
          status: 'running',
          version: updater.version,
        }),
      );
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

/**
 * Simulate Tauri updater client workflow: fetch manifest, compare version, download, and verify signature.
 */
export async function simulateClientCheck({ currentVersion, port, pubKey }) {
  console.log(
    `\n🔍 [Client Simulator] Querying feed: http://127.0.0.1:${port}/latest.json ...`,
  );

  const response = await fetch(`http://127.0.0.1:${port}/latest.json`);
  if (!response.ok) {
    throw new Error(`Feed request failed with status: ${response.status}`);
  }

  const manifest = await response.json();
  console.log(
    `📦 [Client Simulator] Received manifest: Version v${manifest.version}`,
  );

  const diff = compareVersions(manifest.version, currentVersion);
  if (diff <= 0) {
    console.log(
      `ℹ️  [Client Simulator] App is up to date (current: v${currentVersion}, available: v${manifest.version})`,
    );
    return { available: false, version: manifest.version };
  }

  console.log(
    `✨ [Client Simulator] Update available: v${currentVersion} -> v${manifest.version}`,
  );

  const platformInfo = manifest.platforms['windows-x86_64'];
  if (!platformInfo) {
    throw new Error(
      'Missing windows-x86_64 platform payload in updater manifest',
    );
  }

  console.log(
    `⬇️  [Client Simulator] Downloading installer from: ${platformInfo.url} ...`,
  );
  const downloadResponse = await fetch(platformInfo.url);
  if (!downloadResponse.ok) {
    throw new Error(`Installer download failed: ${downloadResponse.status}`);
  }

  const installerBytes = Buffer.from(await downloadResponse.arrayBuffer());
  const tempInstallerFile = join(
    root,
    '.temp',
    `simulated-download-${Date.now()}.exe`,
  );
  await writeFile(tempInstallerFile, installerBytes);

  try {
    console.log(
      `🔐 [Client Simulator] Verifying Ed25519 Minisign cryptographic signature ...`,
    );
    await verifyArtifactSignature(
      tempInstallerFile,
      platformInfo.signature,
      pubKey,
      manifest.version,
    );
    console.log(`✅ [Client Simulator] Chữ ký số Minisign hoàn toàn hợp lệ!`);
  } finally {
    await rm(tempInstallerFile, { force: true });
  }

  return { available: true, version: manifest.version };
}

/**
 * Patch Tauri configuration temporarily to use local feed server and simulated pubkey.
 */
export function patchTauriConfig(tauriConfigPath, { port, pubKey }) {
  const originalRaw = readFileSync(tauriConfigPath, 'utf8');
  const tauriConfig = JSON.parse(originalRaw);

  const originalUpdater = { ...tauriConfig.plugins?.updater };

  tauriConfig.plugins = tauriConfig.plugins ?? {};
  tauriConfig.plugins.updater = {
    ...tauriConfig.plugins.updater,
    endpoints: [`http://127.0.0.1:${port}/latest.json`],
    pubkey: pubKey,
    requireSignedVersion: true,
  };

  writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);

  return function restore() {
    tauriConfig.plugins.updater = originalUpdater;
    writeFileSync(tauriConfigPath, originalRaw);
    console.log('🔄 [Config] Restored original tauri.conf.json configuration');
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Operon Console Local Updater Simulator
======================================
Usage:
  node scripts/simulate-updater.mjs [options]
  pnpm updater:simulate [options]

Options:
  --port <number>       Local mock updater port (default: 4567)
  --version <semver>    Simulated update target version (default: 5.9.0)
  --apply-config        Temporarily patch apps/shell/src-tauri/tauri.conf.json
  --server-only         Keep the mock feed server running (for testing with desktop app)
  --dry-run             Generate and verify artifacts without starting server
  --help, -h            Show this help manual
`);
    return;
  }

  const portIndex = args.indexOf('--port');
  const port =
    portIndex === -1 ? 4567 : Number.parseInt(args[portIndex + 1], 10);

  const currentVersion = readJson('release/version.json').version;
  const versionIndex = args.indexOf('--version');
  const version = versionIndex === -1 ? '5.9.0' : args[versionIndex + 1];

  const applyConfig = args.includes('--apply-config');
  const serverOnly = args.includes('--server-only');
  const dryRun = args.includes('--dry-run');

  let modeName = 'E2E Simulator';
  if (serverOnly) {
    modeName = 'Server (Persistent)';
  } else if (dryRun) {
    modeName = 'Dry Run';
  }

  console.log('===========================================================');
  console.log('       OPERON TAURI UPDATER - LOCAL SIMULATION HARNESS     ');
  console.log('===========================================================');
  console.log(`• Current App Version   : v${currentVersion}`);
  console.log(`• Simulated New Version : v${version}`);
  console.log(`• Mock Server Port      : ${port}`);
  console.log(`• Mode                  : ${modeName}`);
  console.log('-----------------------------------------------------------');

  // Step 1: Generate Minisign keypair
  console.log('🔑 [Step 1/4] Generating simulated Minisign Ed25519 keypair...');
  const keypair = generateMinisignKeypair();
  console.log(`  Public Key: ${keypair.encodedPublicKey.slice(0, 48)}...`);

  // Step 2: Build simulated release package
  const outputDir = resolve(root, '.temp/updater-simulation');
  console.log(
    `📦 [Step 2/4] Packaging mock release artifacts into: ${outputDir}`,
  );
  const { updater } = await createSimulatedRelease({
    keypair,
    outputDir,
    port,
    version,
  });

  if (dryRun) {
    console.log(
      '✅ [Dry Run] Release artifacts generated and verified successfully.',
    );
    return;
  }

  // Step 3: Start mock feed server
  console.log(
    `🚀 [Step 3/4] Starting local HTTP mock updater server at http://127.0.0.1:${port}...`,
  );
  const server = await startMockUpdaterServer({ outputDir, port, updater });
  console.log(`  Feed Endpoint     : http://127.0.0.1:${port}/latest.json`);
  console.log(
    `  Installer Download: ${updater.platforms['windows-x86_64'].url}`,
  );

  let restoreConfig = null;
  if (applyConfig) {
    const tauriConfigPath = resolve(
      root,
      'apps/shell/src-tauri/tauri.conf.json',
    );
    console.log(
      '🔧 [Config] Patching tauri.conf.json with simulated feed endpoint and pubkey...',
    );
    restoreConfig = patchTauriConfig(tauriConfigPath, {
      port,
      pubKey: keypair.encodedPublicKey,
    });
  }

  const cleanup = async () => {
    if (restoreConfig) {
      restoreConfig();
      restoreConfig = null;
    }
    server.close();
    await rm(outputDir, { force: true, recursive: true });
    console.log(
      '🛑 [Teardown] Mock updater server stopped and temp files cleaned.',
    );
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  // Step 4: Run client check
  console.log('🧪 [Step 4/4] Running automated Client Update Verification...');
  const result = await simulateClientCheck({
    currentVersion,
    port,
    pubKey: keypair.encodedPublicKey,
  });

  console.log('-----------------------------------------------------------');
  console.log('🎉 [RESULT] LOCAL UPDATER SIMULATION HOÀN THÀNH THÀNH CÔNG!');
  console.log(`• Update Available : ${result.available}`);
  console.log(`• Target Version   : v${result.version}`);
  console.log('-----------------------------------------------------------');

  if (serverOnly || applyConfig) {
    console.log('\n💡 [Desktop App Live Test]');
    console.log('Máy chủ mock updater vẫn đang chạy ngầm.');
    console.log('Bạn có thể mở một terminal khác và chạy:');
    console.log('  pnpm dev:desktop');
    console.log(
      'Khi app desktop mở lên, hãy bấm "Check for updates" để kiểm tra.',
    );
    console.log(
      'Bấm Ctrl+C bất cứ lúc nào để dừng server và phục hồi cấu hình gốc.\n',
    );
  } else {
    await cleanup();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(root, 'scripts/simulate-updater.mjs')
) {
  main().catch((error) => {
    console.error('❌ [Simulator Error]', error);
    process.exit(1);
  });
}
