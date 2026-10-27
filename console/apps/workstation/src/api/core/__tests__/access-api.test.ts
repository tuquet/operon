import { Buffer } from 'node:buffer';

import { $t } from '@operon/locales';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAccessCache,
  getEffectiveAccess,
  listInstalledPlugins,
} from '../access';
import * as supabaseClient from '../supabase-client';

const mockAccessStore = {
  accessToken: '' as null | string,
};

vi.mock('@operon/stores', () => ({
  useAccessStore: () => mockAccessStore,
}));

function createMockJwt(payload: Record<string, any>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.mock_sig`;
}

describe('getEffectiveAccess & session caching', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAccessCache();
    mockAccessStore.accessToken = null;
  });

  it('should throw an error if no accessToken is found in accessStore', async () => {
    await expect(getEffectiveAccess()).rejects.toThrow(
      $t('authentication.missingAccessToken'),
    );
  });

  it('should fetch all permissions for platform superadmin and cache the single-flight request', async () => {
    const superadminToken = createMockJwt({
      sub: 'super-user-1',
      app_metadata: { platform_role: 'superadmin' },
    });
    mockAccessStore.accessToken = superadminToken;

    const requestSpy = vi
      .spyOn(supabaseClient, 'supabaseRequest')
      .mockResolvedValueOnce([
        { id: 'tenants:read' },
        { id: 'workers:devices:read' },
        { id: 'billing:read' },
      ]);

    // First call triggers network request
    const result1 = await getEffectiveAccess();
    expect(result1.isSuperadmin).toBe(true);
    expect(result1.permissions).toEqual([
      'billing:read',
      'tenants:read',
      'workers:devices:read',
    ]);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith('/rest/v1/permissions?select=id');

    // Second call reuses cached promise without new network request
    const result2 = await getEffectiveAccess();
    expect(result2).toBe(result1);
    expect(requestSpy).toHaveBeenCalledTimes(1);

    // After clearAccessCache, next call makes a new request
    clearAccessCache();
    requestSpy.mockResolvedValueOnce([{ id: 'tenants:read' }]);
    const result3 = await getEffectiveAccess();
    expect(result3.permissions).toEqual(['tenants:read']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should fetch and flatten tenant permissions for standard users', async () => {
    const userToken = createMockJwt({
      sub: 'regular-user-42',
      app_metadata: {},
    });
    mockAccessStore.accessToken = userToken;

    const requestSpy = vi
      .spyOn(supabaseClient, 'supabaseRequest')
      .mockResolvedValueOnce([
        {
          tenant_id: 't-100',
          member_roles: [
            {
              roles: {
                role_permissions: [
                  { permission_id: 'tenants:read' },
                  { permission_id: 'members:read' },
                ],
              },
            },
          ],
        },
      ]);

    const result = await getEffectiveAccess();
    expect(result.isSuperadmin).toBe(false);
    expect(result.permissions).toEqual(['members:read', 'tenants:read']);
    expect(result.tenantPermissions['t-100']).toEqual([
      'members:read',
      'tenants:read',
    ]);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0]?.[0]).toContain(
      'tenant_members?user_id=eq.regular-user-42',
    );
  });
});

describe('listInstalledPlugins', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return installed plugin IDs from system_plugins table', async () => {
    vi.spyOn(supabaseClient, 'supabaseRequest').mockResolvedValueOnce([
      { id: 'core-iam' },
      { id: 'workers' },
      { id: 'automation' },
    ]);

    const plugins = await listInstalledPlugins();
    expect(plugins).toEqual(['core-iam', 'workers', 'automation']);
  });
});
