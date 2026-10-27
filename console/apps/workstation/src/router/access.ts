import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@operon/types';

import { generateAccessible } from '@operon/access';
import { preferences } from '@operon/preferences';

import { toast } from '@operon-core/shadcn-ui';

import { getAllMenusApi } from '#/api';
import { listInstalledPlugins } from '#/api/core/access';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

import { filterRoutesByPlugins } from './plugin-gate';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  let installedPlugins: string[] = ['core-iam'];
  try {
    const fetched = await listInstalledPlugins();
    if (fetched && fetched.length > 0) {
      installedPlugins = fetched;
    }
  } catch (error) {
    console.warn(
      'Failed to load installed plugins, defaulting to core-iam:',
      error,
    );
  }

  const filteredRoutes = filterRoutesByPlugins(
    options.routes,
    installedPlugins,
  );

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    routes: filteredRoutes,
    fetchMenuListAsync: async () => {
      toast.loading(`${$t('common.loadingMenu')}...`, {
        duration: 1500,
      });
      return await getAllMenusApi();
    },
    // Specify component for unauthorized access (403 Forbidden)
    forbiddenComponent,
    // Fallback layout when route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
