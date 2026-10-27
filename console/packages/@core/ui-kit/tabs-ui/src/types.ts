import type { IContextMenuItem } from '@operon-core/shadcn-ui';
import type { TabDefinition, TabsStyleType } from '@operon-core/typings';

export type TabsEmits = {
  close: [string];
  sortTabs: [number, number];
  unpin: [TabDefinition];
};

export interface TabsProps {
  active?: string;
  /**
   * @zh_CN content class
   * @default tabs-chrome
   */
  contentClass?: string;
  /**
   * Context menu
   */
  contextMenus?: (data: any) => IContextMenuItem[];
  /**
   * Whether draggable
   */
  draggable?: boolean;
  /**
   * Gap
   * @default 7
   * Only for tabs-chrome
   */
  gap?: number;
  /**
   * Maximum tab width
   * Only for tabs-chrome
   */
  maxWidth?: number;
  /**
   * Close tab on middle click
   */
  middleClickToClose?: boolean;

  /**
   * Minimum tab width
   * Only for tabs-chrome
   */
  minWidth?: number;

  /**
   * Whether to show icon
   */
  showIcon?: boolean;
  /**
   * Tab style
   */
  styleType?: TabsStyleType;

  /**
   * Tab items data
   */
  tabs?: TabDefinition[];

  /**
   * Whether to respond to mouse wheel events
   */
  wheelable?: boolean;
}

export interface TabConfig extends TabDefinition {
  affixTab: boolean;
  closable: boolean;
  icon: string;
  key: string;
  title: string;
}
