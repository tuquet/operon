import { systemManifest } from '@operon/system';

import { defineMicroAppRouteModule } from '../micro-app-route';

export default defineMicroAppRouteModule({
  appId: 'system',
  manifest: systemManifest,
  meta: {
    platform: 'all',
    plugin: 'identity',
    requiresCloud: true,
  },
  name: 'System',
});
