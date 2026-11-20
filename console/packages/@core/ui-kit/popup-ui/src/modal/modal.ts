import type { Component, Ref } from 'vue';

import type { ClassType, MaybePromise } from '@operon-core/typings';

import type { ModalApi } from './modal-api';

export interface ModalProps {
  /**
   * Animation type
   * @default 'slide'
   */
  animationType?: 'scale' | 'slide';
  /**
   * Whether to append to main content area
   * @default false
   */
  appendToMain?: boolean;
  /**
   * Whether to show border
   * @default false
   */
  bordered?: boolean;
  /**
   * Cancel button text
   */
  cancelText?: string;
  /**
   * Whether centered
   * @default false
   */
  centered?: boolean;

  class?: ClassType;

  /**
   * Whether to show close button in top right
   * @default true
   */
  closable?: boolean;
  /**
   * Whether clicking overlay closes modal
   * @default true
   */
  closeOnClickModal?: boolean;
  /**
   * Whether pressing ESC key closes modal
   * @default true
   */
  closeOnPressEscape?: boolean;
  /**
   * Disable confirm button
   */
  confirmDisabled?: boolean;
  /**
   * Confirm button loading state
   * @default false
   */
  confirmLoading?: boolean;
  /**
   * Confirm button text
   */
  confirmText?: string;
  contentClass?: ClassType;
  /**
   * Modal description
   */
  description?: string;
  /**
   * Destroy modal on close
   */
  destroyOnClose?: boolean;
  /**
   * Whether draggable
   * @default false
   */
  draggable?: boolean;
  /**
   * Whether to show footer
   * @default true
   */
  footer?: boolean;
  footerClass?: ClassType;
  /**
   * Whether fullscreen
   * @default false
   */
  fullscreen?: boolean;
  /**
   * Whether to show fullscreen button
   * @default true
   */
  fullscreenButton?: boolean;
  /**
   * Whether to show header
   * @default true
   */
  header?: boolean;
  headerClass?: ClassType;
  /**
   * Modal loading state
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
   * Whether drag area can exceed viewport
   * @default false
   */
  overflow?: boolean;
  /**
   * Modal overlay blur effect
   */
  overlayBlur?: number;
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
   * Submitting (lock modal state)
   */
  submitting?: boolean;
  /**
   * Modal title
   */
  title?: string;
  /**
   * Modal title tooltip
   */
  titleTooltip?: string;
  /**
   * Modal z-index
   */
  zIndex?: number;
}

export interface ModalState extends ModalProps {
  /** Modal open state */
  isOpen?: boolean;
}

export type ExtendedModalApi<TData = unknown> = ModalApi<TData> & {
  useStore: <T = NoInfer<ModalState>>(
    selector?: (state: NoInfer<ModalState>) => T,
  ) => Readonly<Ref<T>>;
};

type ModalComponentInstance<TComponent extends Component> =
  TComponent extends abstract new (...args: any[]) => infer TInstance
    ? TInstance
    : never;

export type InferModalData<TComponent extends Component> = [
  ModalComponentInstance<TComponent>,
] extends [never]
  ? unknown
  : ModalComponentInstance<TComponent> extends {
        modalApi: ExtendedModalApi<infer TData>;
      }
    ? TData
    : unknown;

export interface ModalApiOptions<
  TConnectedComponent extends Component = Component,
> extends ModalState {
  /**
   * Standalone modal component
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
   * Callback when modal close animation ends
   * @returns
   */
  onClosed?: () => void;
  /**
   * Callback when confirm button is clicked
   */
  onConfirm?: () => void;
  /**
   * Callback when modal state changes
   * @param isOpen
   * @returns
   */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Callback when modal open animation ends
   * @returns
   */
  onOpened?: () => void;
}
