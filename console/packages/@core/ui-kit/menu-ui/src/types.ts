import type { Component, Ref } from 'vue';

import type {
  MenuRecordBadgeRaw,
  Recordable,
  ThemeModeType,
} from '@operon-core/typings';

interface MenuProps {
  /**
   * Whether to enable accordion mode
   * @default true
   */
  accordion?: boolean;
  /**
   * Whether menu is collapsed
   * @default false
   */
  collapse?: boolean;

  /**
   * Whether to show menu title when menu is collapsed
   * @default false
   */
  collapseShowTitle?: boolean;

  /**
   * Default active menu
   */
  defaultActive?: string;

  /**
   * Default expanded menus
   */
  defaultOpeneds?: string[];

  /**
   * Menu mode
   * @default vertical
   */
  mode?: 'horizontal' | 'vertical';

  /**
   * Whether rounded style
   * @default true
   */
  rounded?: boolean;

  /**
   * Whether to auto scroll to active menu item
   * @default false
   */
  scrollToActive?: boolean;

  /**
   * Menu theme
   * @default dark
   */
  theme?: ThemeModeType;
}

interface SubMenuProps extends MenuRecordBadgeRaw {
  /**
   * Active icon
   */
  activeIcon?: string;
  /**
   * Whether disabled
   */
  disabled?: boolean;
  /**
   * Icon
   */
  icon?: Component | string;
  /**
   * Submenu title
   */
  path: string;
}

interface MenuItemProps extends MenuRecordBadgeRaw {
  /**
   * Icon
   */
  activeIcon?: string;
  /**
   * Whether disabled
   */
  disabled?: boolean;
  /**
   * Icon
   */
  icon?: Component | string;
  /**
   * Menu item title
   */
  path: string;
  /**
   * Parameters carried by menu
   */
  query?: Recordable<any>;
}

interface MenuItemRegistered {
  active: boolean;
  parentPaths: string[];
  path: string;
  query?: Recordable<any>;
}

interface MenuItemClicked {
  parentPaths: string[];
  path: string;
}

interface MenuProvider {
  activePath?: string;
  addMenuItem: (item: MenuItemRegistered) => void;

  addSubMenu: (item: MenuItemRegistered) => void;
  closeMenu: (path: string, parentLinks: string[]) => void;
  handleMenuItemClick: (item: MenuItemClicked) => void;
  handleSubMenuClick: (subMenu: MenuItemRegistered) => void;
  isMenuPopup: boolean;
  items: Record<string, MenuItemRegistered>;

  openedMenus: string[];
  openMenu: (path: string, parentLinks: string[]) => void;
  props: MenuProps;
  removeMenuItem: (item: MenuItemRegistered) => void;

  removeSubMenu: (item: MenuItemRegistered) => void;

  subMenus: Record<string, MenuItemRegistered>;
  theme: string;
}

interface SubMenuProvider {
  addSubMenu: (item: MenuItemRegistered) => void;
  handleMouseleave?: (deepDispatch: boolean) => void;
  level: number;
  mouseInChild: Ref<boolean>;
  removeSubMenu: (item: MenuItemRegistered) => void;
}

export type {
  MenuItemClicked,
  MenuItemProps,
  MenuItemRegistered,
  MenuProps,
  MenuProvider,
  SubMenuProps,
  SubMenuProvider,
};
