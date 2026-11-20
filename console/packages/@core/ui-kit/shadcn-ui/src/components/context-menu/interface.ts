import type { Component } from 'vue';

interface IContextMenuItem {
  /**
   * Whether disabled
   */
  disabled?: boolean;
  /**
   * Click event handler
   * @param data
   */
  handler?: (data: any) => void;
  /**
   * Whether hidden
   */
  hidden?: boolean;
  /**
   * Icon
   */
  icon?: Component;
  /**
   * Whether to show icon
   */
  inset?: boolean;
  /**
   * Unique identifier
   */
  key: string;
  /**
   * Whether it is a divider
   */
  separator?: boolean;
  /**
   * Shortcut key
   */
  shortcut?: string;
  /**
   * Title
   */
  text: string;
}
export type { IContextMenuItem };
