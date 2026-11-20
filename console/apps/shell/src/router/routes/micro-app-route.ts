import type { RouteMeta, RouteRecordRaw } from 'vue-router';

import type { MicroAppManifest } from '@operon/kernel';

import { createRemoteRoute } from '@operon/kernel';

import { $t } from '#/locales';
import { getRegisteredApp } from '#/registry/apps';

export interface MicroAppRouteModuleOptions {
  appId: string;
  manifest: MicroAppManifest<RouteRecordRaw>;
  meta: Omit<RouteMeta, 'icon' | 'order' | 'title'> &
    Partial<Pick<RouteMeta, 'icon' | 'order' | 'title'>>;
  name: string;
  path?: string;
  redirectToDefault?: boolean;
}

/**
 * Builds the host shell's top-level route module for a registered micro-app,
 * merging metadata from `APP_REGISTRY` with app-specific route options.
 */
export function defineMicroAppRouteModule(
  options: MicroAppRouteModuleOptions,
): RouteRecordRaw[] {
  const {
    appId,
    manifest,
    meta,
    name,
    path = `/${appId}`,
    redirectToDefault = true,
  } = options;
  const appMeta = getRegisteredApp(appId);

  return [
    {
      meta: {
        icon: appMeta?.icon,
        order: appMeta?.order,
        title: $t(appMeta?.titleKey || `page.${appId}.title`),
        ...meta,
      },
      name,
      path,
      ...(redirectToDefault
        ? { redirect: `${path}/${manifest.defaultPath}` }
        : {}),
      children: createRemoteRoute({
        appId,
        devPort: appMeta?.devPort,
        manifest,
        t: $t,
      }),
    },
  ];
}
