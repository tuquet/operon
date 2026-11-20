import type { ButtonVariants } from '../../ui';

import { VbenIcon } from '../icon';

/** Permission code(s), evaluated with injected hasPermission */
export type TableActionAuth = string | string[];

/** Action button tooltip */
export interface TableActionTooltip {
  content: string;
  side?: 'bottom' | 'left' | 'right' | 'top';
}

/** Popconfirm configuration */
export interface TableActionPopConfirm {
  /** Cancel button text */
  cancelText?: string;
  /** Confirm callback; falls back to action.onClick if omitted */
  confirm?: () => void;
  /** Confirm button text */
  okText?: string;
  /** Tooltip title */
  title?: string;
}

export interface ActionItem {
  /** Permission code, filtered with injected hasPermission */
  auth?: TableActionAuth;
  /** Custom class name */
  class?: any;
  /** Danger action (red text) */
  danger?: boolean;
  /** Whether disabled */
  disabled?: boolean;
  /** Icon component */
  icon?: typeof VbenIcon.icon;
  /** Whether to show: boolean or function returning boolean */
  ifShow?: (() => boolean) | boolean;
  /** Unique identifier, used to distinguish in click callbacks */
  key?: number | string;
  /** Loading state */
  loading?: boolean;
  /** Click callback */
  onClick?: () => void;
  /** Popconfirm */
  popConfirm?: TableActionPopConfirm;
  /** Size */
  size?: ButtonVariants['size'];
  /** Text */
  text?: string;
  /** Tooltip: string or config object */
  tooltip?: string | TableActionTooltip;
  /** Button style variant */
  variant?: ButtonVariants['variant'];
}

export interface TableActionProps {
  /** Primary action buttons */
  actions?: ActionItem[];
  /** Alignment */
  align?: 'center' | 'end' | 'start';
  /** Custom class name */
  class?: any;
  /** Whether to show divider between buttons */
  divider?: boolean;
  /** Actions in "More" dropdown */
  dropdownActions?: ActionItem[];
  /**
   * Permission check function; returns false to hide actions with corresponding auth.
   * Core component has no business dependency; injected by consumer (e.g. useAccess().hasAccessByCodes).
   */
  hasPermission?: (auth?: TableActionAuth) => boolean;
  /** "More" button text (displayed to the right of icon when provided) */
  moreText?: string;
}
