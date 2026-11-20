// @vitest-environment node
import { Buffer } from 'node:buffer';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createMinisignSignature,
  createSimulatedRelease,
  generateMinisignKeypair,
  patchTauriConfig,
  simulateClientCheck,
  startMockUpdaterServer,
} from '../simulate-updater.mjs';

describe('simulate-updater harness', () => {
  const root = process.cwd();
  const testOutputDir = join(root, '.temp', 'test-updater-sim-unit');
  const mockTauriConfigPath = join(root, '.temp', 'test-tauri-conf.json');

  beforeEach(() => {
    rmSync(testOutputDir, { force: true, recursive: true });
    rmSync(mockTauriConfigPath, { force: true });
  });

  afterEach(() => {
    rmSync(testOutputDir, { force: true, recursive: true });
    rmSync(mockTauriConfigPath, { force: true });
  });

  it('generates a valid Minisign Ed25519 keypair and creates valid signature', () => {
    const keypair = generateMinisignKeypair();
    expect(keypair.encodedPublicKey).toContain('dW50cnVzdGVkIGNvbW1lbnQ6');

    const payload = Buffer.from('test payload');
    const signature = createMinisignSignature(payload, keypair, '5.9.0');
    expect(signature).toContain('dW50cnVzdGVkIGNvbW1lbnQ6');
  });

  it('creates simulated release artifacts and passes verification with mock server', async () => {
    const keypair = generateMinisignKeypair();
    const version = '5.9.0';
    const testPort = 4599;

    const { updater } = await createSimulatedRelease({
      keypair,
      outputDir: testOutputDir,
      port: testPort,
      version,
    });

    expect(updater.version).toBe(version);
    expect(updater.platforms['windows-x86_64'].url).toContain(
      `:${testPort}/download/`,
    );

    const server = await startMockUpdaterServer({
      outputDir: testOutputDir,
      port: testPort,
      updater,
    });

    try {
      const result = await simulateClientCheck({
        currentVersion: '5.8.0',
        port: testPort,
        pubKey: keypair.encodedPublicKey,
      });

      expect(result.available).toBe(true);
      expect(result.version).toBe(version);
    } finally {
      server.close();
    }
  });

  it('patches and cleanly restores tauri.conf.json', () => {
    const originalConfig = {
      plugins: {
        updater: {
          endpoints: ['https://example.com/latest.json'],
          pubkey: 'ORIGINAL_PUBKEY',
        },
      },
    };
    writeFileSync(mockTauriConfigPath, JSON.stringify(originalConfig, null, 2));

    const restore = patchTauriConfig(mockTauriConfigPath, {
      port: 8888,
      pubKey: 'NEW_TEST_PUBKEY',
    });

    const modifiedConfig = JSON.parse(
      readFileSync(mockTauriConfigPath, 'utf8'),
    );
    expect(modifiedConfig.plugins.updater.endpoints).toEqual([
      'http://127.0.0.1:8888/latest.json',
    ]);
    expect(modifiedConfig.plugins.updater.pubkey).toBe('NEW_TEST_PUBKEY');

    restore();

    const restoredConfig = JSON.parse(
      readFileSync(mockTauriConfigPath, 'utf8'),
    );
    expect(restoredConfig.plugins.updater.endpoints).toEqual([
      'https://example.com/latest.json',
    ]);
    expect(restoredConfig.plugins.updater.pubkey).toBe('ORIGINAL_PUBKEY');
  });
});
