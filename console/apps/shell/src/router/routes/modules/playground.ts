import { playgroundManifest } from '@operon/playground';

import { defineMicroAppRouteModule } from '../micro-app-route';

export default defineMicroAppRouteModule({
  appId: 'playground',
  manifest: playgroundManifest,
  meta: {
    hideInMenu: !import.meta.env.DEV,
    platform: 'all',
    plugin: 'operon',
  },
  name: 'Playground',
});
