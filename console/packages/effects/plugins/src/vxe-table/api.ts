import type { VxeGridInstance } from 'vxe-table';

import type {
  BaseFormComponentType,
  ExtendedFormApi,
  FormValues,
} from '@operon-core/form-ui';

import type { VxeGridProps } from './types';
import type { ViewedRowHelper } from './viewed-row';

import { toRaw } from 'vue';

import { Store } from '@operon-core/shared/store';
import {
  bindMethods,
  isBoolean,
  isFunction,
  mergeWithArrayOverride,
  StateHandler,
} from '@operon-core/shared/utils';

function getDefaultState(): VxeGridProps {
  return {
    class: '',
    gridClass: '',
    gridOptions: {},
    gridEvents: {},
    formOptions: undefined,
    showSearchForm: true,
  };
}

export class VxeGridApi<
  T extends Record<string, any> = any,
  D extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> {
  public formApi = {} as ExtendedFormApi<TFormValues, D, P, TSubmitValues>;

  // private prevState: null | VxeGridProps = null;
  public grid = {} as VxeGridInstance<T>;
  public state: null | VxeGridProps<T, D, P, TFormValues, TSubmitValues> = null;

  public store: Store<VxeGridProps<T, D, P, TFormValues, TSubmitValues>>;

  /**
   * Viewed row helper (initialized in mount; all business logic encapsulated in useViewedRow)
   */
  public viewedRowHelper: null | ViewedRowHelper<T> = null;

  private isMounted = false;

  private stateHandler: StateHandler;

  constructor(
    options: VxeGridProps<
      T,
      D,
      P,
      TFormValues,
      TSubmitValues
    > = {} as VxeGridProps<T, D, P, TFormValues, TSubmitValues>,
  ) {
    const storeState = { ...options };

    const defaultState = getDefaultState();
    this.store = new Store<VxeGridProps<T, D, P, TFormValues, TSubmitValues>>(
      mergeWithArrayOverride(storeState, defaultState) as VxeGridProps<
        T,
        D,
        P,
        TFormValues,
        TSubmitValues
      >,
    );

    this.store.subscribe((state) => {
      // this.prevState = this.state;
      this.state = state;
    });

    this.state = this.store.state;
    this.stateHandler = new StateHandler();
    bindMethods(this);
  }

  /**
   * Clear all viewed states
   */
  clearViewedRows() {
    this.viewedRowHelper?.clearViewed();
  }

  /**
   * Get set of all viewed keys (returns copy to prevent mutation)
   */
  getViewedKeys(): Set<number | string> {
    const raw = this.viewedRowHelper?.viewedSet.value;
    return raw ? new Set(raw) : new Set();
  }

  /**
   * Check if row has been viewed
   */
  isRowViewed(record: T): boolean {
    return this.viewedRowHelper?.isViewed(record) ?? false;
  }

  /**
   * Mark rows as viewed in bulk
   */
  markKeysAsViewed(keys: Array<number | string>) {
    this.viewedRowHelper?.markKeysAsViewed(keys);
  }

  /**
   * Mark a row as viewed
   */
  markRowAsViewed(record: T) {
    this.viewedRowHelper?.markAsViewed(record);
  }

  mount(
    instance: null | VxeGridInstance,
    formApi: ExtendedFormApi<TFormValues, D, P, TSubmitValues>,
  ) {
    if (!this.isMounted && instance) {
      this.grid = instance;
      this.formApi = formApi;
      this.stateHandler.setConditionTrue();
      this.isMounted = true;
    }
  }

  async query(params: Record<string, any> = {}) {
    try {
      await this.grid.commitProxy('query', toRaw(params));
    } catch (error) {
      console.error('Error occurred while querying:', error);
    }
  }

  async reload(params: Record<string, any> = {}) {
    try {
      await this.grid.commitProxy('reload', toRaw(params));
    } catch (error) {
      console.error('Error occurred while reloading:', error);
    }
  }

  /**
   * Remove viewed state for specified key
   */
  removeViewedKeys(keys: Array<number | string>) {
    this.viewedRowHelper?.removeKeys(keys);
  }

  setGridOptions(
    options: Partial<
      VxeGridProps<T, D, P, TFormValues, TSubmitValues>['gridOptions']
    >,
  ) {
    this.setState({
      gridOptions: options,
    });
  }

  setLoading(isLoading: boolean) {
    this.setState({
      gridOptions: {
        loading: isLoading,
      },
    });
  }

  setState(
    stateOrFn:
      | ((
          prev: VxeGridProps<T, D, P, TFormValues, TSubmitValues>,
        ) => Partial<VxeGridProps<T, D, P, TFormValues, TSubmitValues>>)
      | Partial<VxeGridProps<T, D, P, TFormValues, TSubmitValues>>,
  ) {
    if (isFunction(stateOrFn)) {
      this.store.setState((prev) => {
        return mergeWithArrayOverride(stateOrFn(prev), prev);
      });
    } else {
      this.store.setState((prev) => mergeWithArrayOverride(stateOrFn, prev));
    }
  }

  toggleSearchForm(show?: boolean) {
    this.setState({
      showSearchForm: isBoolean(show) ? show : !this.state?.showSearchForm,
    });
    // nextTick(() => {
    //   this.grid.recalculate();
    // });
    return this.state?.showSearchForm;
  }

  unmount() {
    this.isMounted = false;
    this.stateHandler.reset();
    this.viewedRowHelper = null;
  }
}
