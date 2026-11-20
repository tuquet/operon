import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import type { Recordable } from './helper';

/**
 * Extended route raw object
 */
type ExRouteRecordRaw = RouteRecordRaw & {
  parent?: string;
  parents?: string[];
  path?: any;
};

interface MenuRecordBadgeRaw {
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
  badgeVariants?: 'destructive' | 'primary' | string;
}

/**
 * Menu record raw object
 */
interface MenuRecordRaw extends MenuRecordBadgeRaw {
  /**
   * Active icon name
   */
  activeIcon?: string;
  /**
   * Child menus
   */
  children?: MenuRecordRaw[];
  /**
   * Whether menu item is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Icon name
   */
  icon?: Component | string;
  /**
   * Menu name
   */
  name: string;
  /**
   * Order index
   */
  order?: number;
  /**
   * Parent path
   */
  parent?: string;
  /**
   * All parent paths
   */
  parents?: string[];
  /**
   * Menu path (unique, used as key)
   */
  path: string;
  /**
   * Menu parameters
   */
  query?: Recordable<any>;
  /**
   * Whether menu item is visible
   * @default true
   */
  show?: boolean;
}

export type { ExRouteRecordRaw, MenuRecordBadgeRaw, MenuRecordRaw };
