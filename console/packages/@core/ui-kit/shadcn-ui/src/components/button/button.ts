import type { AsTag } from 'reka-ui';

import type { Component } from 'vue';

import type { ButtonVariants } from '../../ui';

export interface VbenButtonProps {
  /**
   * The element or component this component should render as. Can be overwrite by `asChild`
   * @defaultValue "div"
   */
  as?: AsTag | Component;
  /**
   * Change the default rendered element for the one passed as a child, merging their props and behavior.
   *
   * Read our [Composition](https://www.reka-ui.com/docs/guides/composition) guide for more details.
   */
  asChild?: boolean;
  class?: any;
  disabled?: boolean;
  loading?: boolean;
  size?: ButtonVariants['size'];
  variant?: ButtonVariants['variant'];
}

export type CustomRenderType = (() => Component | string) | string;

export type ValueType = boolean | number | string;

export interface VbenButtonGroupProps extends Pick<
  VbenButtonProps,
  'disabled'
> {
  /** Allow clearing selection in single-select mode */
  allowClear?: boolean;
  /** Callback before value changes */
  beforeChange?: (
    value: ValueType,
    isChecked: boolean,
  ) => boolean | PromiseLike<boolean | undefined> | undefined;
  /** Button style */
  btnClass?: any;
  /** Gap between buttons */
  gap?: number;
  /** Maximum number of selections allowed in multi-select mode. 0 means unlimited */
  maxCount?: number;
  /** Whether to allow multiple selection */
  multiple?: boolean;
  /** Options */
  options?: { [key: string]: any; label: CustomRenderType; value: ValueType }[];
  /** Show icon */
  showIcon?: boolean;
  /** Size */
  size?: 'large' | 'middle' | 'small';
}
