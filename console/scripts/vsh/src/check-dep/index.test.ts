import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runKnipCheck } from './index';

const { execa } = vi.hoisted(() => ({ execa: vi.fn() }));
vi.mock('@operon/node-utils', () => ({ execa }));

beforeEach(() => {
  execa.mockReset();
});

describe('dependency declaration gate', () => {
  it('passes a successful scan', async () => {
    execa.mockResolvedValue({});
    await expect(runKnipCheck()).resolves.toBeUndefined();
  });

  it('rejects unused dependencies instead of only printing a warning', async () => {
    execa.mockRejectedValue({
      exitCode: 1,
      stdout: JSON.stringify({
        issues: [
          {
            file: 'apps/system/package.json',
            dependencies: [{ name: 'unused' }],
            devDependencies: [],
          },
        ],
      }),
    });
    await expect(runKnipCheck()).rejects.toThrow('Unused dependencies');
  });

  it('propagates scanner failures', async () => {
    execa.mockRejectedValue(new Error('scanner failed'));
    await expect(runKnipCheck()).rejects.toThrow('scanner failed');
  });
});
