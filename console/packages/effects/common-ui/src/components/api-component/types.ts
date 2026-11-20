import type { Component } from 'vue';

import type { AnyPromiseFunction } from '@operon/types';

export type ApiComponentOptionsItem = {
  [name: string]: any;
  children?: ApiComponentOptionsItem[];
  disabled?: boolean;
  label?: string;
  value?: number | string;
};

export type ApiComponentLabelFn = (item: ApiComponentOptionsItem) => string;

export interface ApiComponentProps {
  /** Component */
  component: Component;
  /** Convert numeric value to string */
  numberToString?: boolean;
  /** Function to fetch options data */
  api?: (arg?: any) => Promise<ApiComponentOptionsItem[] | Record<string, any>>;
  /** Parameters passed to API */
  params?: Record<string, any>;
  /** Field name in API response containing options array */
  resultField?: string;
  /** Label field name */
  labelField?: string;
  /** Custom label formatter from option data */
  labelFn?: ApiComponentLabelFn;
  /** Children field name for hierarchical data */
  childrenField?: string;
  /** Value field name */
  valueField?: string;
  /** Disabled field name */
  disabledField?: string;
  /** Component prop name that accepts options data */
  optionsPropName?: string;
  /** Whether to call API immediately */
  immediate?: boolean;
  /** Re-fetch data every time `visibleEvent` fires */
  alwaysLoad?: boolean;
  /** Callback invoked before API request */
  beforeFetch?: AnyPromiseFunction<any, any>;
  /** Pre-request predicate to determine whether request is allowed */
  shouldFetch?: AnyPromiseFunction<any, boolean>;
  /** Callback invoked after API request */
  afterFetch?: AnyPromiseFunction<any, any>;
  /** Direct options data; also acts as fallback when API returns empty */
  options?: ApiComponentOptionsItem[];
  /** Component slot name for loading icon */
  loadingSlot?: string;
  /** Event name that triggers API request */
  visibleEvent?: string;
  /** Component v-model prop name (default: modelValue; some components use value) */
  modelPropName?: string;
  /**
   * Auto-select mode
   * - `first`: Automatically select first option
   * - `last`: Automatically select last option
   * - `one`: Automatically select option when API returns exactly one option
   * - Function: Custom selection predicate returning selected option
   * - false: No auto-selection (default)
   */
  autoSelect?:
    | 'first'
    | 'last'
    | 'one'
    | ((item: ApiComponentOptionsItem[]) => ApiComponentOptionsItem)
    | false;
}

export type ApiComponentSharedProps = Omit<ApiComponentProps, 'component'>;
