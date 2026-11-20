import { createMemoryHistory, createRouter } from 'vue-router';

import { automationManifest } from '@operon/automation';
import { systemManifest } from '@operon/system';
import { tenantsManifest } from '@operon/tenants';

import { describe, expect, it } from 'vitest';

const t = (key: string) => key;

describe('business application route integration', () => {
  it.each(['', '/system'])(
    'resolves system screens and permissions under %s',
    (prefix) => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: prefix || '/', children: systemManifest.routes(t) }],
      });
      const users = router.resolve(`${prefix}/users`);
      expect(users.name).toBe('SystemUsers');
      expect(users.meta.authority).toEqual(['superadmin']);
      expect(users.matched.at(-1)?.props.default).toEqual({ tab: 'users' });
      expect(
        router.resolve(`${prefix}/audit-logs`).matched.at(-1)?.props.default,
      ).toEqual({ tab: 'audit' });
    },
  );

  it.each(['', '/tenants'])(
    'resolves named tenant navigation under %s',
    (prefix) => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: prefix || '/', children: tenantsManifest.routes(t) }],
      });
      expect(router.resolve({ name: 'Tenants' }).path).toBe(prefix || '/');
      expect(
        router.resolve({ name: 'TenantDetail', params: { id: 'workspace-1' } })
          .path,
      ).toBe(`${prefix}/workspace-1`);
    },
  );

  it('provides a separate browser management screen', () => {
    const routes = automationManifest.routes(t);
    const overview = routes.find(
      (route) => route.name === 'AutomationOverview',
    );
    const browsers = routes.find(
      (route) => route.name === 'AutomationBrowsers',
    );
    expect(overview?.path).toBe('overview');
    expect(browsers?.path).toBe('browsers');
    expect(browsers?.component).not.toBe(overview?.component);
  });
});
