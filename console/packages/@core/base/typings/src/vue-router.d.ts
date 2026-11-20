import type { Component } from 'vue';
import type { Router, RouteRecordRaw } from 'vue-router';

interface RouteMeta {
  /**
   * Active icon (menu/tab)
   */
  activeIcon?: string;
  /**
   * Active menu path override; use when parent should be active instead of current route
   */
  activePath?: string;
  /**
   * Whether to generate breadcrumb hierarchy based on activePath route hierarchy
   * @default false
   */
  breadcrumbUseActivePath?: boolean;
  /**
   * Whether tab is pinned (affix)
   * @default false
   */
  affixTab?: boolean;
  /**
   * Pinned tab order
   * @default 0
   */
  affixTabOrder?: number;
  /**
   * Required roles for access
   * @default []
   */
  authority?: string[];
  /**
   * Badge
   */
  badge?: string;
  /**
   * Badge type
   */
  badgeType?: 'dot' | 'normal';
  /**
   * Badge color/variants
   */
  badgeVariants?:
    | 'default'
    | 'destructive'
    | 'primary'
    | 'success'
    | 'warning'
    | string;
  /**
   * Whether route DOM is cached
   */
  domCached?: boolean;
  /**
   * Use full path as key (default: false)
   */
  fullPathKey?: boolean;
  /**
   * Hide child routes in menu
   * @default false
   */
  hideChildrenInMenu?: boolean;
  /**
   * Hide route in breadcrumbs
   * @default false
   */
  hideInBreadcrumb?: boolean;
  /**
   * Hide route in menu
   * @default false
   */
  hideInMenu?: boolean;
  /**
   * Hide route in tabbar
   * @default false
   */
  hideInTab?: boolean;
  /**
   * Icon (menu/tab)
   */
  icon?: Component | string;
  /**
   * iframe URL
   */
  iframeSrc?: string;
  /**
   * Ignore access rules; accessible directly
   * @default false
   */
  ignoreAccess?: boolean;
  /**
   * Ignore route transition animation
   * @default false
   */
  ignoreTransition?: boolean;
  /**
   * Enable KeepAlive caching
   */
  keepAlive?: boolean;
  /**
   * External link redirect path
   */
  link?: string;
  /**
   * Whether route has been loaded
   */
  loaded?: boolean;
  /**
   * Max number of open tabs for dynamic route
   * @default -1
   */
  maxNumOfOpenTab?: number;
  /**
   * Visible in menu but access redirects to 403
   */
  menuVisibleWithForbidden?: boolean;
  /**
   * Do not use basic layout (effective at top-level only)
   */
  noBasicLayout?: boolean;
  /**
   * Open in new window
   */
  openInNewWindow?: boolean;
  /**
   * Order index for route -> menu sorting
   */
  order?: number;
  /**
   * Query/param payload carried by menu item
   */
  query?: Recordable;
  /**
   * Title name
   */
  title: string;
}

// Recursive type mapping component property of RouteRecordRaw to string
type RouteRecordStringComponent<T = string> = Omit<
  RouteRecordRaw,
  'children' | 'component'
> & {
  children?: RouteRecordStringComponent<T>[];
  component: T;
};

type ComponentRecordType = Record<string, () => Promise<Component>>;

interface GenerateMenuAndRoutesOptions {
  fetchMenuListAsync?: () => Promise<RouteRecordStringComponent[]>;
  forbiddenComponent?: RouteRecordRaw['component'];
  layoutMap?: ComponentRecordType;
  pageMap?: ComponentRecordType;
  roles?: string[];
  router: Router;
  routes: RouteRecordRaw[];
}

export type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteMeta,
  RouteRecordRaw,
  RouteRecordStringComponent,
};
