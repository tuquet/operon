import { writeFile } from 'node:fs/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cycles: [] as string[][],
  staged: [] as string[],
  failure: null as Error | null,
}));

vi.mock('@operon/node-utils', () => ({
  execa: async (_command: string, args: string[]) => {
    if (state.failure) throw state.failure;
    if (state.cycles.length > 0) {
      const outputFile = args[args.indexOf('--output') + 1];
      if (!outputFile) throw new Error('Missing scanner output path');
      await writeFile(outputFile, JSON.stringify(state.cycles));
    }
  },
  getStagedFiles: async () => state.staged,
}));

beforeEach(() => {
  vi.resetModules();
  state.cycles = [];
  state.staged = [];
  state.failure = null;
});

describe('circular dependency gate', () => {
  it('accepts the scanner omitting output when no cycles exist', async () => {
    const { checkCircular } = await import('./index');
    await expect(
      checkCircular({ staged: false, verbose: false }),
    ).resolves.toBeUndefined();
  });

  it('enforces thresholds even when reusing cached results', async () => {
    state.cycles = [['a.ts', 'b.ts']];
    const { checkCircular } = await import('./index');
    await checkCircular({
      staged: false,
      verbose: false,
      config: { threshold: 1 },
    });
    await expect(
      checkCircular({ staged: false, verbose: false }),
    ).rejects.toThrow('exceed threshold');
  });

  it('counts each cycle once and filters to staged files', async () => {
    state.cycles = [
      ['a.ts', 'b.ts'],
      ['c.ts', 'd.ts'],
    ];
    state.staged = ['a.ts', 'b.ts'];
    const { checkCircular } = await import('./index');
    await expect(
      checkCircular({ staged: true, verbose: false, config: { threshold: 1 } }),
    ).resolves.toBeUndefined();
    await expect(
      checkCircular({ staged: true, verbose: false }),
    ).rejects.toThrow('1 circular');
  });

  it('propagates scanner failures, including missing executable errors', async () => {
    state.failure = Object.assign(new Error('scanner missing'), {
      code: 'ENOENT',
    });
    const { checkCircular } = await import('./index');
    await expect(
      checkCircular({ staged: false, verbose: false }),
    ).rejects.toThrow('scanner missing');
  });

  it('rejects invalid thresholds', async () => {
    const { checkCircular } = await import('./index');
    await expect(
      checkCircular({
        staged: false,
        verbose: false,
        config: { threshold: -1 },
      }),
    ).rejects.toThrow('non-negative integer');
  });
});
