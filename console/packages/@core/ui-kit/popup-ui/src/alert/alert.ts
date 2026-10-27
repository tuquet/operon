import type { Component, VNode, VNodeArrayChildren } from 'vue';

import type { Recordable } from '@operon-core/typings';

import { createContext } from '@operon-core/shadcn-ui';

export type IconType = 'error' | 'info' | 'question' | 'success' | 'warning';

export type BeforeCloseScope = {
  isConfirm: boolean;
};

export type AlertProps = {
  /** Callback before closing; if returns false, closing is aborted */
  beforeClose?: (
    scope: BeforeCloseScope,
  ) => boolean | Promise<boolean | undefined> | undefined;
  /** Border */
  bordered?: boolean;
  /**
   * Button alignment
   * @default 'end'
   */
  buttonAlign?: 'center' | 'end' | 'start';
  /** Cancel button title */
  cancelText?: string;
  /** Whether to center */
  centered?: boolean;
  /** Confirm button title */
  confirmText?: string;
  /** Extra class for modal container */
  containerClass?: string;
  /** Modal content */
  content?: Component | string;
  /** Extra class for modal content */
  contentClass?: string;
  /** Show loading overlay in content area while beforeClose callback executes */
  contentMasking?: boolean;
  /** Whether to close modal when pressing Esc */
  escapeKeyClose?: boolean;
  /** Modal footer content (in same container as buttons) */
  footer?: Component | string;
  /** Modal icon (in front of title) */
  icon?: Component | IconType;
  /**
   * Modal overlay blur effect
   */
  overlayBlur?: number;
  /** Whether to show cancel button */
  showCancel?: boolean;
  /** Modal title */
  title?: string;
};

/** Prompt properties */
export type PromptProps<T = any> = {
  /** Callback before closing; if returns false, closing is aborted */
  beforeClose?: (scope: {
    isConfirm: boolean;
    value?: T;
  }) => boolean | Promise<boolean | undefined> | undefined;
  /** Component used to accept user input */
  component?: Component;
  /** Input component props */
  componentProps?: Recordable<any>;
  /** Input component slots */
  componentSlots?:
    | (() => any)
    | Recordable<unknown>
    | VNode
    | VNodeArrayChildren;
  /** Default value */
  defaultValue?: T;
  /** Value property name for input component */
  modelPropName?: string;
} & Omit<AlertProps, 'beforeClose'>;

/**
 * Alert context
 */
export type AlertContext = {
  /** Perform cancel operation */
  doCancel: () => void;
  /** Perform confirm operation */
  doConfirm: () => void;
};

export const [injectAlertContext, provideAlertContext] =
  createContext<AlertContext>('VbenAlertContext');

/**
 * Get Alert context
 * @returns AlertContext
 */
export function useAlertContext() {
  const context = injectAlertContext();
  if (!context) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
}
