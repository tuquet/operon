import { tenantsManifest } from '@operon/tenants';

import { defineMicroAppRouteModule } from '../micro-app-route';

export default defineMicroAppRouteModule({
  appId: 'tenants',
  manifest: tenantsManifest,
  meta: {
    authority: ['superadmin', 'tenants:read'],
    hideChildrenInMenu: true,
    platform: 'all',
    plugin: 'identity',
    requiresCloud: true,
  },
  name: 'TenantsRoot',
  redirectToDefault: false,
});
