import type { RouteMeta as IRouteMeta } from './src/vue-router';

import 'vue-router';

declare module 'vue-router' {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface RouteMeta extends IRouteMeta {}
}

export type { RouteMeta } from './src/vue-router';
