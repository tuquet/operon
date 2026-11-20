// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readState, writeState } from '../github.mjs';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('release registry atomic writes', () => {
  it('commits the registry and feeds in one tree without retaining withdrawn feeds', async () => {
    vi.stubEnv('GH_TOKEN', 'test-token');
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options) => {
        const body = options.body ? JSON.parse(options.body) : undefined;
        calls.push({ url, options, body });
        if (url.endsWith('/git/trees')) return Response.json({ sha: 'tree' });
        if (url.endsWith('/git/commits'))
          return Response.json({ sha: 'commit' });
        return Response.json({ object: { sha: 'commit' } });
      }),
    );
    await writeState(
      'previous',
      {
        channels: {
          stable: { tag: 'v5.8.1' },
          nightly: { tag: 'v5.9.0-nightly.1.1' },
        },
        releases: {
          'v5.8.1': { status: 'published', updater: { version: '5.8.1' } },
          'v5.9.0-nightly.1.1': {
            status: 'revoked',
            updater: { version: '5.9.0-nightly.1.1' },
          },
        },
      },
      'withdraw nightly',
    );
    expect(calls[0].body.tree.map((entry) => entry.path)).toEqual([
      'registry.json',
      'updates/stable/latest.json',
    ]);
    expect(calls[0].body.base_tree).toBeUndefined();
    expect(calls[1].body.parents).toEqual(['previous']);
    expect(calls[2].options.method).toBe('PATCH');
    expect(calls[2].body).toEqual({ sha: 'commit', force: false });
  });

  it('propagates a competing branch update instead of overwriting it', async () => {
    vi.stubEnv('GH_TOKEN', 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (url.includes('/git/refs/'))
          return Response.json(
            { message: 'Update is not a fast forward' },
            { status: 422 },
          );
        return Response.json({ sha: 'new-sha' });
      }),
    );
    await expect(
      writeState('previous', { channels: {}, releases: {} }, 'publish'),
    ).rejects.toThrow('422');
  });

  it('reads a registry snapshot by commit using raw content', async () => {
    vi.stubEnv('GH_TOKEN', 'test-token');
    const fetchMock = vi.fn(async (url, options) => {
      if (url.includes('/git/ref/'))
        return Response.json({ object: { sha: 'snapshot' } });
      expect(url).toContain('ref=snapshot');
      expect(options.headers.Accept).toBe('application/vnd.github.raw+json');
      return Response.json({
        schemaVersion: 1,
        product: 'operon-console',
        channels: {},
        releases: {},
        history: [],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await readState();
    expect(result.sha).toBe('snapshot');
    expect(result.state.product).toBe('operon-console');
  });

  it('initializes absent state but never treats permission failures as an empty registry', async () => {
    vi.stubEnv('GH_TOKEN', 'test-token');
    const fetchMock = vi.fn(async () =>
      Response.json({ message: 'Not Found' }, { status: 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const empty = await readState();
    expect(empty.sha).toBeNull();
    fetchMock.mockResolvedValue(
      Response.json({ message: 'Forbidden' }, { status: 403 }),
    );
    await expect(readState()).rejects.toThrow('403');
  });
});
