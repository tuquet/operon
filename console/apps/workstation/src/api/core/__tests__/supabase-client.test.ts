import { Buffer } from 'node:buffer';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decodeJwtPayload,
  isJwtTokenExpired,
  isSupabaseAuthError,
  isUnauthorizedResponse,
  setSupabaseUnauthorizedHandler,
  supabaseRequest,
} from '../supabase-client';

const mockAccessStore = {
  accessToken: null as null | string,
  refreshToken: null as null | string,
  setAccessToken: vi.fn((token: null | string) => {
    mockAccessStore.accessToken = token;
  }),
  setRefreshToken: vi.fn((token: null | string) => {
    mockAccessStore.refreshToken = token;
  }),
};

vi.mock('@operon/stores', () => ({
  useAccessStore: () => mockAccessStore,
}));

function createJwtWithExp(expSeconds: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      exp: expSeconds,
      role: 'authenticated',
      sub: 'user-123',
      user_metadata: { full_name: 'Qu\u1EA3n tr\u1ECB vi\u00EAn' },
    }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('supabase-client auth interceptor & JWT lifecycle', () => {
  beforeEach(() => {
    mockAccessStore.accessToken = null;
    mockAccessStore.refreshToken = null;
    mockAccessStore.setAccessToken.mockReset();
    mockAccessStore.setAccessToken.mockImplementation(
      (token: null | string) => {
        mockAccessStore.accessToken = token;
      },
    );
    mockAccessStore.setRefreshToken.mockReset();
    mockAccessStore.setRefreshToken.mockImplementation(
      (token: null | string) => {
        mockAccessStore.refreshToken = token;
      },
    );
    setSupabaseUnauthorizedHandler(null);
  });

  afterEach(() => {
    setSupabaseUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  describe('decodeJwtPayload, isJwtTokenExpired & isUnauthorizedResponse', () => {
    it('decodes UTF-8 JWT payload and detects expired vs valid tokens accurately', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const expiredToken = createJwtWithExp(nowSec - 60);
      const validToken = createJwtWithExp(nowSec + 3600);

      expect(decodeJwtPayload(validToken)?.user_metadata?.full_name).toBe(
        'Qu\u1EA3n tr\u1ECB vi\u00EAn',
      );
      expect(isJwtTokenExpired(expiredToken)).toBe(true);
      expect(isJwtTokenExpired(validToken)).toBe(false);
      expect(isJwtTokenExpired('non-jwt-token')).toBe(false);
      expect(isJwtTokenExpired(null)).toBe(false);
    });

    it('recognizes HTTP 401, PostgREST PGRST301, and SupabaseAuthError', () => {
      expect(isUnauthorizedResponse(401, {})).toBe(true);
      expect(
        isUnauthorizedResponse(403, {
          code: 'PGRST301',
          message: 'JWT expired',
        }),
      ).toBe(true);
      expect(isUnauthorizedResponse(500, { message: 'Internal error' })).toBe(
        false,
      );
      expect(
        isSupabaseAuthError(
          Object.assign(new Error('JWT expired'), { isAuthError: true }),
        ),
      ).toBe(true);
      expect(isSupabaseAuthError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('proactive & reactive token refresh', () => {
    it('proactively refreshes an expired JWT before sending the resource request', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockAccessStore.accessToken = createJwtWithExp(nowSec - 120);
      mockAccessStore.refreshToken = 'valid-refresh-token';

      const freshJwt = createJwtWithExp(nowSec + 3600);
      const fetchMock = vi
        .fn()
        // 1st call: proactive refresh token exchange
        .mockResolvedValueOnce({
          json: async () => ({
            access_token: freshJwt,
            refresh_token: 'rotated-refresh-token',
          }),
          ok: true,
          status: 200,
        })
        // 2nd call: actual data request with new token
        .mockResolvedValueOnce({
          json: async () => [{ id: 'dev-1', name: 'Node A' }],
          ok: true,
          status: 200,
        });

      vi.stubGlobal('fetch', fetchMock);

      const result = await supabaseRequest('/rest/v1/devices?select=*', {
        schema: 'workers',
      });

      expect(result).toEqual([{ id: 'dev-1', name: 'Node A' }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[0]).toContain(
        '/auth/v1/token?grant_type=refresh_token',
      );
      expect(fetchMock.mock.calls[1]?.[1]?.headers?.Authorization).toBe(
        `Bearer ${freshJwt}`,
      );
      expect(mockAccessStore.setAccessToken).toHaveBeenCalledWith(freshJwt);
      expect(mockAccessStore.setRefreshToken).toHaveBeenCalledWith(
        'rotated-refresh-token',
      );
    });

    it('reactively refreshes token and retries once on 401 JWT expired response', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockAccessStore.accessToken = createJwtWithExp(nowSec + 300);
      mockAccessStore.refreshToken = 'valid-refresh-token';

      const freshJwt = createJwtWithExp(nowSec + 3600);
      const fetchMock = vi
        .fn()
        // 1st call: server rejects with 401 JWT expired
        .mockResolvedValueOnce({
          json: async () => ({ code: 'PGRST301', message: 'JWT expired' }),
          ok: false,
          status: 401,
        })
        // 2nd call: refresh token endpoint
        .mockResolvedValueOnce({
          json: async () => ({
            access_token: freshJwt,
            refresh_token: 'new-refresh-token',
          }),
          ok: true,
          status: 200,
        })
        // 3rd call: retried request succeeds
        .mockResolvedValueOnce({
          json: async () => [{ id: 'dev-2' }],
          ok: true,
          status: 200,
        });

      vi.stubGlobal('fetch', fetchMock);

      const data = await supabaseRequest('/rest/v1/devices?select=*', {
        schema: 'workers',
      });

      expect(data).toEqual([{ id: 'dev-2' }]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[2]?.[1]?.headers?.Authorization).toBe(
        `Bearer ${freshJwt}`,
      );
    });

    it('triggers unauthorized handler and clears tokens when 401 cannot be refreshed', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockAccessStore.accessToken = createJwtWithExp(nowSec - 300);
      mockAccessStore.refreshToken = null;

      const onUnauthorized = vi.fn();
      setSupabaseUnauthorizedHandler(onUnauthorized);

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        supabaseRequest('/rest/v1/devices?select=*', { schema: 'workers' }),
      ).rejects.toMatchObject({
        isAuthError: true,
        message: 'JWT expired',
      });

      // Because the JWT was already expired and no refresh token existed,
      // fetch was not even called over the network!
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockAccessStore.setAccessToken).toHaveBeenCalledWith(null);
      expect(mockAccessStore.setRefreshToken).toHaveBeenCalledWith(null);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('stops retrying and triggers unauthorized handler if the retried request also returns 401', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockAccessStore.accessToken = createJwtWithExp(nowSec + 300);
      mockAccessStore.refreshToken = 'valid-refresh-token';

      const freshJwt = createJwtWithExp(nowSec + 3600);
      const onUnauthorized = vi.fn();
      setSupabaseUnauthorizedHandler(onUnauthorized);

      const fetchMock = vi
        .fn()
        // 1st call: initial request gets 401
        .mockResolvedValueOnce({
          json: async () => ({ code: 'PGRST301', message: 'JWT expired' }),
          ok: false,
          status: 401,
        })
        // 2nd call: refresh succeeds
        .mockResolvedValueOnce({
          json: async () => ({
            access_token: freshJwt,
            refresh_token: 'rotated-refresh',
          }),
          ok: true,
          status: 200,
        })
        // 3rd call: retried request STILL gets 401
        .mockResolvedValueOnce({
          json: async () => ({ code: 'PGRST301', message: 'JWT expired' }),
          ok: false,
          status: 401,
        });

      vi.stubGlobal('fetch', fetchMock);

      await expect(
        supabaseRequest('/rest/v1/devices?select=*', { schema: 'workers' }),
      ).rejects.toMatchObject({
        isAuthError: true,
        message: 'JWT expired',
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent 401 refreshes so refresh_token is exchanged only once', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      mockAccessStore.accessToken = createJwtWithExp(nowSec + 300);
      mockAccessStore.refreshToken = 'shared-refresh-token';

      const freshJwt = createJwtWithExp(nowSec + 3600);
      let refreshCalls = 0;

      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
          refreshCalls += 1;
          await new Promise((r) => setTimeout(r, 15));
          return {
            json: async () => ({
              access_token: freshJwt,
              refresh_token: 'rotated-once',
            }),
            ok: true,
            status: 200,
          };
        }

        const authHeader = (init?.headers as Record<string, string>)
          ?.Authorization;
        if (authHeader !== `Bearer ${freshJwt}`) {
          return {
            json: async () => ({ code: 'PGRST301', message: 'JWT expired' }),
            ok: false,
            status: 401,
          };
        }

        return {
          json: async () => [{ ok: true }],
          ok: true,
          status: 200,
        };
      });

      vi.stubGlobal('fetch', fetchMock);

      const [res1, res2] = await Promise.all([
        supabaseRequest('/rest/v1/devices?select=*'),
        supabaseRequest('/rest/v1/browsers?select=*'),
      ]);

      expect(res1).toEqual([{ ok: true }]);
      expect(res2).toEqual([{ ok: true }]);
      expect(refreshCalls).toBe(1);
    });

    it('skips captureError when suppressErrorCapture is true on rest error', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        json: async () => ({
          code: 'PGRST106',
          hint: 'Only the following schemas are exposed: public, graphql_public',
          message: 'Invalid schema: runners',
        }),
        ok: false,
        status: 406,
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        supabaseRequest('/rest/v1/devices?select=*', {
          schema: 'workers',
          suppressErrorCapture: true,
        }),
      ).rejects.toThrow('Invalid schema: runners');
    });
  });
});
