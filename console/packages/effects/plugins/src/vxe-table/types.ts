import type {
  VxeGridListeners,
  VxeGridPropTypes,
  VxeGridProps as VxeTableGridProps,
  VxeUIExport,
} from 'vxe-table';

import type { Ref } from 'vue';

import type { ClassType, DeepPartial } from '@operon/types';

import type {
  BaseFormComponentType,
  FormValues,
  VbenFormProps,
} from '@operon-core/form-ui';

import type { VxeGridApi } from './api';
import type { ViewedRowOptions } from './viewed-row';

import { useVbenForm } from '@operon-core/form-ui';

export interface VxePaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

interface ToolbarConfigOptions extends VxeGridPropTypes.ToolbarConfig {
  /** Whether to show toggle search form button */
  search?: boolean;
}

export type VxeTableGridColumns<T = any> = VxeTableGridOptions<T>['columns'];

export interface VxeTableGridOptions<T = any> extends VxeTableGridProps<T> {
  /** Toolbar configuration */
  toolbarConfig?: ToolbarConfigOptions;
}

export interface SeparatorOptions {
  show?: boolean;
  backgroundColor?: string;
}

export interface VxeGridProps<
  T extends Record<string, any> = any,
  D extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> {
  /**
   * Data
   */
  tableData?: any[];
  /**
   * Title
   */
  tableTitle?: string;
  /**
   * Title help tooltip
   */
  tableTitleHelp?: string;
  /**
   * Component class
   */
  class?: ClassType;
  /**
   * vxe-grid class
   */
  gridClass?: ClassType;
  /**
   * vxe-grid options
   */
  gridOptions?: DeepPartial<VxeTableGridOptions<T>>;
  /**
   * vxe-grid events
   */
  gridEvents?: DeepPartial<VxeGridListeners<T>>;
  /**
   * Form configuration
   */
  formOptions?: VbenFormProps<D, P, TFormValues, TSubmitValues>;
  /**
   * Show search form
   */
  showSearchForm?: boolean;
  /**
   * Separator between search form and table body
   */
  separator?: boolean | SeparatorOptions;
  /**
   * Viewed row feature
   */
  viewedRowOptions?: boolean | ViewedRowOptions<T>;
}

export type ExtendedVxeGridApi<
  D extends Record<string, any> = any,
  F extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> = VxeGridApi<D, F, P, TFormValues, TSubmitValues> & {
  useStore: <S = NoInfer<VxeGridProps<D, F, P, TFormValues, TSubmitValues>>>(
    selector?: (
      state: NoInfer<VxeGridProps<D, F, P, TFormValues, TSubmitValues>>,
    ) => S,
  ) => Readonly<Ref<S>>;
};

export interface SetupVxeTable {
  configVxeTable: (ui: VxeUIExport) => void;
  useVbenForm?: typeof useVbenForm;
}
