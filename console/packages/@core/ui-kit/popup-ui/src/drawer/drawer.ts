import type { Component, Ref } from 'vue';

import type { ClassType, MaybePromise } from '@operon-core/typings';

import type { DrawerApi } from './drawer-api';

export type DrawerPlacement = 'bottom' | 'left' | 'right' | 'top';

export type CloseIconPlacement = 'left' | 'right';

export interface DrawerProps {
  /**
   * Whether to append to main content area
   * @default false
   */
  appendToMain?: boolean;
  /**
   * Cancel button text
   */
  cancelText?: string;
  class?: ClassType;
  /**
   * Whether to show close button
   * @default true
   */
  closable?: boolean;
  /**
   * Close button position
   */
  closeIconPlacement?: CloseIconPlacement;
  /**
   * Whether clicking overlay closes popup
   * @default true
   */
  closeOnClickModal?: boolean;
  /**
   * Whether pressing ESC key closes popup
   * @default true
   */
  closeOnPressEscape?: boolean;
  /**
   * Confirm button loading state
   * @default false
   */
  confirmLoading?: boolean;
  /**
   * Confirm button text
   */
  confirmText?: string;
  contentClass?: string;
  /**
   * Popup description
   */
  description?: string;
  /**
   * Destroy drawer on close
   */
  destroyOnClose?: boolean;
  /**
   * Whether to show footer
   * @default true
   */
  footer?: boolean;
  /**
   * Popup footer class
   */
  footerClass?: ClassType;
  /**
   * Whether to show header
   * @default true
   */
  header?: boolean;
  /**
   * Popup header class
   */
  headerClass?: ClassType;
  /**
   * Drawer loading state
   * @default false
   */
  loading?: boolean;
  /**
   * Whether to show overlay
   * @default true
   */
  modal?: boolean;

  /**
   * Whether to auto focus
   */
  openAutoFocus?: boolean;
  /**
   * Popup overlay blur effect
   */
  overlayBlur?: number;
  /**
   * Drawer placement
   * @default right
   */
  placement?: DrawerPlacement;

  /**
   * Whether to show cancel button
   * @default true
   */
  showCancelButton?: boolean;
  /**
   * Whether to show confirm button
   * @default true
   */
  showConfirmButton?: boolean;
  /**
   * Submitting (lock drawer state)
   */
  submitting?: boolean;
  /**
   * Popup title
   */
  title?: string;
  /**
   * Popup title tooltip
   */
  titleTooltip?: string;
  /**
   * Drawer z-index
   */
  zIndex?: number;
}

export interface DrawerState extends DrawerProps {
  /** Popup open state */
  isOpen?: boolean;
}

export type ExtendedDrawerApi<TData = unknown> = DrawerApi<TData> & {
  useStore: <T = NoInfer<DrawerState>>(
    selector?: (state: NoInfer<DrawerState>) => T,
  ) => Readonly<Ref<T>>;
};

type DrawerComponentInstance<TComponent extends Component> =
  TComponent extends abstract new (...args: any[]) => infer TInstance
    ? TInstance
    : never;

export type InferDrawerData<TComponent extends Component> = [
  DrawerComponentInstance<TComponent>,
] extends [never]
  ? unknown
  : DrawerComponentInstance<TComponent> extends {
        drawerApi: ExtendedDrawerApi<infer TData>;
      }
    ? TData
    : unknown;

export interface DrawerApiOptions<
  TConnectedComponent extends Component = Component,
> extends DrawerState {
  /**
   * Standalone drawer component
   */
  connectedComponent?: TConnectedComponent;
  /**
   * Callback before closing; returning false prevents closing
   * @returns
   */
  onBeforeClose?: () => MaybePromise<boolean | undefined>;
  /**
   * Callback when cancel button is clicked
   */
  onCancel?: () => void;
  /**
   * Callback when popup close animation ends
   * @returns
   */
  onClosed?: () => void;
  /**
   * Callback when confirm button is clicked
   */
  onConfirm?: () => void;
  /**
   * Callback when popup state changes
   * @param isOpen
   * @returns
   */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Callback when popup open animation ends
   * @returns
   */
  onOpened?: () => void;
}
