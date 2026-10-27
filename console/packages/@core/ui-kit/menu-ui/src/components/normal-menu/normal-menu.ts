import type { MenuRecordRaw } from '@operon-core/typings';

interface NormalMenuProps {
  /**
   * Menu data
   */
  activePath?: string;
  /**
   * Whether collapsed
   */
  collapse?: boolean;
  /**
   * Menu item
   */
  menus?: MenuRecordRaw[];
  /**
   * Whether rounded style
   * @default true
   */
  rounded?: boolean;
  /**
   * Theme
   */
  theme?: 'dark' | 'light';
}

export type { NormalMenuProps };
