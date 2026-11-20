import type { Component, VNode } from 'vue';

export interface IconPickerProps {
  pageSize?: number;
  /** Icon set prefix @default 'lucide' */
  prefix?: string;
  /** Whether to auto-fetch icon set data via API when prefix is provided */
  autoFetchApi?: boolean;
  /**
   * Icon list
   */
  icons?: string[];
  /** Input component */
  inputComponent?: Component | VNode;
  /** Icon slot name for preview rendering */
  iconSlot?: string;
  /** Input component value prop name */
  modelValueProp?: string;
  /** Icon style */
  iconClass?: string;
  type?: 'icon' | 'input';
}
