import type { Arrayable } from '@vueuse/core';
import type { FlattenedItem } from 'reka-ui';

import type { Recordable } from '@operon-core/typings';

export interface TreeProps {
  /** Allow unselecting existing option in single-select mode */
  allowClear?: boolean;
  /** Automatically select parent node when selection is disconnected */
  autoCheckParent?: boolean;
  /** Show border */
  bordered?: boolean;
  /** Disconnect parent-child selection link */
  checkStrictly?: boolean;
  /** Children field name */
  childrenField?: string;
  /** Default expanded keys */
  defaultExpandedKeys?: Array<number | string>;
  /** Default expanded level (takes precedence over defaultExpandedKeys) */
  defaultExpandedLevel?: number;
  /** Default value */
  defaultValue?: Arrayable<number | string>;
  /** Disabled */
  disabled?: boolean;
  /** Disabled field name */
  disabledField?: string;
  /** Custom node class name */
  getNodeClass?: (item: FlattenedItem<Recordable<any>>) => string;
  iconField?: string;
  /** Whether return value includes indeterminate nodes (default false: checked only; true: checked + indeterminate) */
  includeIndeterminate?: boolean;
  /** Retain parent checked state when unchecking child node without cascading to parent (default false: cascade uncheck) */
  keepParentOnUncheck?: boolean;
  /** Label field name */
  labelField?: string;
  /** Whether multi-select */
  multiple?: boolean;
  /** Text when selecting all */
  selectAllLabel?: string;
  /** Show icon specified by iconField */
  showIcon?: boolean;
  /** Enable expand/collapse animations */
  transition?: boolean;
  /** Tree data */
  treeData: Recordable<any>[];
  /** Value field name */
  valueField?: string;
}

export function treePropsDefaults() {
  return {
    allowClear: false,
    autoCheckParent: true,
    bordered: false,
    checkStrictly: false,
    defaultExpandedKeys: () => [],
    defaultExpandedLevel: 0,
    disabled: false,
    disabledField: 'disabled',
    iconField: 'icon',
    labelField: 'label',
    multiple: false,
    showIcon: true,
    transition: true,
    includeIndeterminate: false,
    keepParentOnUncheck: false,
    valueField: 'value',
    childrenField: 'children',
  };
}
