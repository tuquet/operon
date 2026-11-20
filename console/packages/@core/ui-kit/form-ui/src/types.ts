import type { ZodType } from 'zod';

import type { Component, HtmlHTMLAttributes, Ref, UnwrapNestedRefs } from 'vue';

import type { VbenButtonProps } from '@operon-core/shadcn-ui';
import type { ClassType, MaybeComputedRef } from '@operon-core/typings';

import type { FormApi } from './form-api';
import type { useFormLabelWidth } from './form-render/utils';

export type FormLabelWidthContext = UnwrapNestedRefs<
  ReturnType<typeof useFormLabelWidth>
>;

export type FormValues = Record<string, any>;

export type FormValuePatch<T> = T extends
  | ((...args: any[]) => unknown)
  | Date
  | readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: FormValuePatch<T[K]> }
    : T;

export interface FormCodec<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> {
  /** Convert submit value to form component value. */
  decode: (values: Readonly<TSubmitValues>) => TFormValues;
  /** Convert form component value to submit value. */
  encode: (values: Readonly<TFormValues>) => TSubmitValues;
}

export type FormFieldName<TValues extends FormValues = FormValues> =
  | Extract<keyof TValues, string>
  | (Record<never, never> & string);

export type FormFieldValue<
  TValues extends FormValues,
  TFieldName extends string,
> = TFieldName extends keyof TValues ? TValues[TFieldName] : unknown;

export type FormLayout = 'horizontal' | 'inline' | 'vertical';

export type BaseFormComponentType =
  | 'DefaultButton'
  | 'PrimaryButton'
  | 'VbenCheckbox'
  | 'VbenFormFieldArray'
  | 'VbenInput'
  | 'VbenInputPassword'
  | 'VbenPinInput'
  | 'VbenSelect'
  | (Record<never, never> & string);

type Breakpoints = '2xl:' | '3xl:' | '' | 'lg:' | 'md:' | 'sm:' | 'xl:';

type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type WrapperClassType =
  | `${Breakpoints}grid-cols-${GridCols}`
  | (Record<never, never> & string);

export type FormItemClassType =
  | `${Breakpoints}cols-end-${'auto' | GridCols}`
  | `${Breakpoints}cols-span-${'auto' | 'full' | GridCols}`
  | `${Breakpoints}cols-start-${'auto' | GridCols}`
  | (Record<never, never> & string)
  | WrapperClassType;

export interface FormFieldOptions {
  asyncDebounceMs?: number;
  validateOn?: readonly FormValidationTrigger[];
}

export type FormValidationTrigger = 'blur' | 'change';

export interface FormShape {
  /** Default value */
  default?: any;
  /** Field name */
  fieldName: string;
  /** Whether required */
  required?: boolean;
  rules?: ZodType;
}

export interface FormRuntimeField<TValue = unknown> {
  handleBlur: () => void;
  handleChange: (value: TValue) => void;
  state: {
    meta: {
      errors: unknown[];
      isDirty: boolean;
      isTouched: boolean;
      isValid: boolean;
    };
    value: TValue;
  };
}

export interface FormComponentField<
  TValue = unknown,
  TFieldName extends string = string,
> {
  modelValue: TValue;
  name: TFieldName;
  onBlur: () => void;
  onChange: (value: TValue) => void;
  onInput: (value: TValue) => void;
  'onUpdate:modelValue': (value: TValue) => void;
}

export type MaybeComponentPropKey =
  | 'options'
  | 'placeholder'
  | 'title'
  | keyof HtmlHTMLAttributes
  | (Record<never, never> & string);

export type MaybeComponentProps = { [K in MaybeComponentPropKey]?: any };

export interface FormMeta {
  dirty: boolean;
  submitting: boolean;
  valid: boolean;
  validating: boolean;
}

export interface FormRuntimeState<TValues extends FormValues = FormValues> {
  errors: Record<string, string>;
  meta: FormMeta;
  values: TValues;
}

export interface FormValidationResult {
  errors: Record<string, string>;
  valid: boolean;
}

export interface FormValueSnapshot<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> {
  rawValues: Readonly<TFormValues>;
  values: TSubmitValues;
}

export interface FormResetState<TValues extends FormValues = FormValues> {
  values?: Partial<TValues>;
}

export interface FormResetOptions {
  force?: boolean;
  keepDefaultValues?: boolean;
}

export interface FormContextApi<TValues extends FormValues = FormValues> {
  clearValidation: (
    fieldNames?: FormFieldName<TValues> | FormFieldName<TValues>[],
  ) => void;
  readonly errors: Record<string, string>;
  readonly fieldComponent: Component;
  getFieldError: (fieldName: string) => string | undefined;
  getFieldValue: <TFieldName extends FormFieldName<TValues>>(
    fieldName: TFieldName,
  ) => FormFieldValue<TValues, TFieldName>;
  handleSubmit: (
    callback?: (values: TValues) => Promise<void> | void,
  ) => (event?: Event) => Promise<void>;
  isFieldValid: (fieldName: string) => boolean;
  readonly meta: FormMeta;
  pushFieldValue: (fieldName: string, value: any) => void;
  removeFieldValue: (fieldName: string, index: number) => Promise<void>;
  reset: (
    state?: FormResetState<TValues>,
    options?: FormResetOptions,
  ) => Promise<void>;
  /** @deprecated Use `reset` instead. */
  resetForm: (
    state?: FormResetState<TValues>,
    options?: FormResetOptions,
  ) => Promise<void>;
  setFieldError: (fieldName: string, error?: string) => void;
  setFieldValue: <TFieldName extends FormFieldName<TValues>>(
    fieldName: TFieldName,
    value: FormFieldValue<TValues, NoInfer<TFieldName>>,
    shouldValidate?: boolean,
  ) => Promise<void>;
  setValues: (
    values: Partial<TValues>,
    shouldValidate?: boolean,
  ) => Promise<void>;
  submit: () => Promise<void>;
  /** @deprecated Use `submit` instead. */
  submitForm: () => Promise<void>;
  useFieldError: (fieldName: string) => Readonly<Ref<string | undefined>>;
  useFieldValue: <TFieldName extends FormFieldName<TValues>>(
    fieldName: TFieldName,
  ) => Readonly<Ref<FormFieldValue<TValues, TFieldName>>>;
  useFieldValues: <TFieldName extends FormFieldName<TValues>>(
    fieldNames: readonly TFieldName[],
  ) => Readonly<Ref<FormFieldValue<TValues, TFieldName>[]>>;
  useSelector: <T>(
    selector: (state: FormRuntimeState<TValues>) => T,
  ) => Readonly<Ref<T>>;
  useValues: () => Readonly<Ref<TValues>>;
  validate: () => Promise<FormValidationResult>;
  validateField: (fieldName: string) => Promise<FormValidationResult>;
  readonly values: TValues;
}

/** @deprecated Use `FormContextApi` instead. */
export type FormActions<TValues extends FormValues = FormValues> =
  FormContextApi<TValues>;

type ReservedFormSlotName =
  | 'default'
  | 'expand-after'
  | 'expand-before'
  | 'reset-before'
  | 'submit-before';

type KnownFormFieldName<TValues extends FormValues> =
  string extends Extract<keyof TValues, string>
    ? never
    : Exclude<Extract<keyof TValues, string>, ReservedFormSlotName>;

export interface VbenFormActionSlotProps<
  TValues extends FormValues = FormValues,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> {
  formApi: ExtendedFormApi<TValues, T, P, TSubmitValues>;
  values: TValues;
}

export interface VbenFormDefaultSlotProps<
  TValues extends FormValues = FormValues,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> extends VbenFormActionSlotProps<TValues, T, P, TSubmitValues> {
  shapes: FormShape[];
}

export interface VbenFormFieldSlotProps<
  TValues extends FormValues = FormValues,
  TFieldName extends FormFieldName<TValues> = FormFieldName<TValues>,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> extends VbenFormActionSlotProps<TValues, T, P, TSubmitValues> {
  componentField: FormComponentField<
    FormFieldValue<TValues, TFieldName>,
    TFieldName
  >;
  componentProps: VbenFormResolvedComponentProps<
    FormFieldValue<TValues, TFieldName>,
    TFieldName
  >;
  disabled: boolean;
  field: FormRuntimeField<FormFieldValue<TValues, TFieldName>>;
  isInValid: boolean;
  modelValue: FormFieldValue<TValues, TFieldName>;
  name: TFieldName;
}

/**
 * When form value has index signature, field value resolves to `unknown`; relax to `any` here:
 * Otherwise `v-bind="slotProps.componentProps"` cannot be passed to components declaring concrete model types.
 */
type LooseFieldValue<TValue> = unknown extends TValue ? any : TValue;

export type VbenFormResolvedComponentProps<
  TValue = unknown,
  TFieldName extends string = string,
> = MaybeComponentProps & {
  disabled: boolean;
  modelValue?: LooseFieldValue<TValue>;
  name: TFieldName;
  'onUpdate:modelValue'?: (value: LooseFieldValue<TValue>) => void;
};

type VbenFormFieldSlots<
  TValues extends FormValues,
  T extends BaseFormComponentType,
  P extends Record<string, any>,
  TSubmitValues extends FormValues,
> =
  string extends Extract<keyof TValues, string>
    ? Record<
        string,
        | ((
            props: VbenFormFieldSlotProps<
              TValues,
              FormFieldName<TValues>,
              T,
              P,
              TSubmitValues
            >,
          ) => any)
        | undefined
      >
    : {
        [TFieldName in KnownFormFieldName<TValues>]?: (
          props: VbenFormFieldSlotProps<
            TValues,
            TFieldName,
            T,
            P,
            TSubmitValues
          >,
        ) => any;
      };

export type VbenFormSlots<
  TValues extends FormValues = FormValues,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> = VbenFormFieldSlots<TValues, T, P, TSubmitValues> & {
  default?: (
    props: VbenFormDefaultSlotProps<TValues, T, P, TSubmitValues>,
  ) => any;
  'expand-after'?: (
    props: VbenFormActionSlotProps<TValues, T, P, TSubmitValues>,
  ) => any;
  'expand-before'?: (
    props: VbenFormActionSlotProps<TValues, T, P, TSubmitValues>,
  ) => any;
  'reset-before'?: (
    props: VbenFormActionSlotProps<TValues, T, P, TSubmitValues>,
  ) => any;
  'submit-before'?: (
    props: VbenFormActionSlotProps<TValues, T, P, TSubmitValues>,
  ) => any;
};

export type VbenFormComponent<
  TValues extends FormValues = FormValues,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> = new () => {
  $props: VbenFormProps<T, P, TValues, TSubmitValues>;
  $slots: VbenFormSlots<TValues, T, P, TSubmitValues>;
};

export interface FormSchemaContext<TValues extends FormValues = FormValues> {
  /** Array field name, e.g. contacts */
  arrayField?: string;
  /** Current real field name, e.g. contacts[0].name */
  fieldName?: string;
  /** Original schema field name, e.g. name */
  originalFieldName?: string;
  /** Complete form values */
  rootValues?: TValues;
  /** Current row data */
  row?: Record<string, any>;
  /** Current row index */
  rowIndex?: number;
  /** Current row path, e.g. contacts[0] */
  rowPath?: string;
}

export type CustomRenderType = (() => Component | string) | string;

// Dynamic render parameters
export type CustomParamsRenderType<TValues extends FormValues = FormValues> =
  | ((ctx: FormSchemaContext<TValues>) => Component | string)
  | string;

export type FormSchemaRuleType =
  | 'required'
  | 'selectRequired'
  | null
  | (Record<never, never> & string)
  | ZodType;

type FormItemDependenciesCondition<
  TValues extends FormValues,
  TResult = boolean | PromiseLike<boolean>,
> = (
  value: Partial<TValues>,
  actions: FormActions<TValues>,
  controller: ExtendedFormApi<TValues>, // Provide ability to access extendApi in dependencies
  ctx?: FormSchemaContext<TValues>,
) => TResult;

type FormItemDependenciesConditionWithRules<TValues extends FormValues> = (
  value: Partial<TValues>,
  actions: FormActions<TValues>,
  controller: ExtendedFormApi<TValues>, // Provide ability to access extendApi in dependencies
  ctx?: FormSchemaContext<TValues>,
) => FormSchemaRuleType | PromiseLike<FormSchemaRuleType>;

type FormItemDependenciesConditionWithProps<TValues extends FormValues> = (
  value: Partial<TValues>,
  actions: FormActions<TValues>,
  controller: ExtendedFormApi<TValues>, // Provide ability to access extendApi in dependencies
  ctx?: FormSchemaContext<TValues>,
) => MaybeComponentProps | PromiseLike<MaybeComponentProps>;

interface FormItemDependenciesBase {
  /**
   * Trigger field
   */
  triggerFields: string[];
}

export interface FormDependenciesResolveContext<
  TValues extends FormValues = FormValues,
> {
  actions: FormActions<TValues>;
  controller: ExtendedFormApi<TValues>;
  schema: FormSchemaContext<TValues>;
  values: Readonly<TValues>;
}

export interface FormDependenciesResolvedState {
  componentProps?: MaybeComponentProps;
  disabled?: boolean;
  help?: CustomRenderType;
  if?: boolean;
  renderComponentContent?: Record<string, any>;
  required?: boolean;
  rules?: FormSchemaRuleType;
  show?: boolean;
}

export interface FormItemDependenciesLegacy<
  TValues extends FormValues = FormValues,
> extends FormItemDependenciesBase {
  /**
   * Component props
   * @returns Component props
   * @deprecated Use `dependencies.resolve` instead.
   */
  componentProps?: FormItemDependenciesConditionWithProps<TValues>;
  /**
   * Whether disabled
   * @returns Whether disabled
   * @deprecated Use `dependencies.resolve` instead.
   */
  disabled?: boolean | FormItemDependenciesCondition<TValues>;
  /**
   * Whether to render (remove DOM)
   * @returns Whether to render
   * @deprecated Use `dependencies.resolve` instead.
   */
  if?: boolean | FormItemDependenciesCondition<TValues>;
  /**
   * Whether required
   * @returns Whether required
   * @deprecated Use `dependencies.resolve` instead.
   */
  required?: FormItemDependenciesCondition<TValues>;
  resolve?: never;
  /**
   * Field rules
   * @deprecated Use `dependencies.resolve` instead.
   */
  rules?: FormItemDependenciesConditionWithRules<TValues>;
  /**
   * Whether hidden (CSS)
   * @returns Whether hidden
   * @deprecated Use `dependencies.resolve` instead.
   */
  show?: boolean | FormItemDependenciesCondition<TValues>;
  /**
   * Executed on any trigger
   * @deprecated Use `dependencies.resolve` instead.
   */
  trigger?: FormItemDependenciesCondition<TValues, void>;
}

export interface FormItemDependenciesResolve<
  TValues extends FormValues = FormValues,
> extends FormItemDependenciesBase {
  componentProps?: never;
  disabled?: never;
  if?: never;
  required?: never;
  resolve: (
    context: FormDependenciesResolveContext<TValues>,
  ) =>
    | FormDependenciesResolvedState
    | PromiseLike<FormDependenciesResolvedState | undefined>
    | undefined;
  rules?: never;
  show?: never;
  trigger?: never;
}

export type FormItemDependencies<TValues extends FormValues = FormValues> =
  | FormItemDependenciesLegacy<TValues>
  | FormItemDependenciesResolve<TValues>;

type ComponentProps<TValues extends FormValues = FormValues> =
  | ((ctx: FormSchemaContext<TValues>) => MaybeComponentProps)
  | MaybeComponentProps;

export interface FormCommonConfig<TValues extends FormValues = FormValues> {
  /**
   * Whether to enable change event fallback.
   * Enabled only when component does not emit update:* and only emits change.
   * @default false
   */
  changeEventFallback?: boolean;
  /**
   * Whether collapsible
   * @default false
   */
  collapsible?: boolean;
  /**
   * Display a colon after Label
   */
  colon?: boolean;
  /**
   * Props for all form items
   */
  componentProps?: ComponentProps<TValues>;
  /**
   * Control styles for all form items
   */
  controlClass?: string;
  /**
   * Collapsed by default
   * @default false
   */
  defaultCollapsed?: boolean;
  /**
   * Disabled state for all form items
   * @default false
   */
  disabled?: boolean;
  /**
   * Empty state value for all form items, defaults to undefined; naive-ui empty value is null
   */
  emptyStateValue?: null | undefined;
  /**
   * Control styles for all form items
   * @default {}
   */
  formFieldProps?: FormFieldOptions;
  /**
   * Grid layout for all form items, supports function format
   * @default ""
   */
  formItemClass?: (() => string) | string;
  /**
   * Hide labels for all form items
   * @default false
   */
  hideLabel?: boolean;
  /**
   * Whether to hide required mark
   * @default false
   */
  hideRequiredMark?: boolean;
  /**
   * Label styles for all form items
   * @default ""
   */
  labelClass?: string;
  /**
   * Label width for all form items
   * When set to `auto`, automatically aligns by max width of visible labels in horizontal layout
   */
  labelWidth?: number | string;
  /**
   * Model property name for all form items
   * @default "modelValue"
   */
  modelPropName?: string;
  /**
   * Wrapper styles for all form items
   */
  wrapperClass?: string;
}

type RenderComponentContentType<TValues extends FormValues = FormValues> = (
  ctx: FormSchemaContext<TValues>,
) => Record<string, any>;

type MappedComponentProps<P, TValues extends FormValues = FormValues> =
  | ((ctx: FormSchemaContext<TValues>) => P & Record<string, any>)
  | (P & Record<string, any>);

/**
 * Format current field value in `getValues()` output.
 * - Returns `undefined`: retains field removed state, usually paired with `setValue(key, nextValue)`
 *   to split a field into other fields, e.g. `startTime` / `endTime`
 * - Returns other value: restores/writes back current field to that value
 * - `setValue` callback signature is `(key, nextValue) => void`
 * @deprecated Use the form-level `codec` instead.
 */
export type FormValueFormat<TValues extends FormValues = FormValues> = (
  value: any,
  setValue: (fieldName: string, value: any) => void,
  values: TValues,
  ctx?: FormSchemaContext<TValues>,
) => any;

interface FormSchemaBody<TValues extends FormValues = FormValues> extends Omit<
  FormCommonConfig<TValues>,
  'componentProps'
> {
  /** Default value */
  defaultValue?: any;
  /** Dependencies */
  dependencies?: FormItemDependencies<TValues>;
  /** Description */
  description?: CustomRenderType;
  /** Field name */
  fieldName: string;
  /** Help message */
  help?: CustomParamsRenderType<TValues>;
  /** Whether to hide form item */
  hide?: boolean;
  /** Form item */
  label?: CustomRenderType;
  // Custom component internal rendering
  renderComponentContent?: RenderComponentContentType<TValues>;
  /** Field rules */
  rules?: FormSchemaRuleType;
  /** Suffix */
  suffix?: CustomRenderType;
  /**
   * Format current field when getting form values.
   * - When return value is not `undefined`, writes back to current fieldName
   * - When return value is `undefined`, one or more target fields can be written via setValue
   * @deprecated Use the form-level `codec` instead.
   */
  valueFormat?: FormValueFormat<TValues>;
}

type FormSchemaDiscriminated<
  T extends BaseFormComponentType,
  P extends Record<string, any>,
  TValues extends FormValues,
> = {
  [K in Extract<keyof P, T>]: FormSchemaBody<TValues> & {
    /** Component */
    component: K;
    /** Component props */
    componentProps?: MappedComponentProps<P[K], TValues>;
  };
}[Extract<keyof P, T>];

type FormSchemaFallback<
  T extends BaseFormComponentType,
  TValues extends FormValues,
> = FormSchemaBody<TValues> & {
  /** Component */
  component: Component | T;
  /** Component props */
  componentProps?: ComponentProps<TValues>;
};

type FormArraySchema<
  T extends BaseFormComponentType,
  P extends Record<string, any>,
  TValues extends FormValues,
> = FormSchemaBody<TValues> & {
  /** Built-in array editor props */
  arrayProps?: Omit<
    VbenFormFieldArrayProps<T, P, TValues>,
    'disabled' | 'globalCommonConfig' | 'name' | 'schema'
  >;
  /** Array sub-field definitions */
  children: FormFieldSchema<T, P, TValues>[];
  /** Compatibility for explicitly specifying built-in array editor */
  component?: Component | T;
  /** Compatibility for passing array editor props via componentProps */
  componentProps?: ComponentProps<TValues>;
  /** Array field marker */
  type: 'array';
};

/**
 * Form group, used to organize fields into a collapsible section.
 * Group itself is not a field and does not participate in value retrieval or validation.
 */
export interface FormGroupSchema<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
> {
  /** Field definitions within group */
  children: FormFieldSchema<T, P, TValues>[];
  /**
   * Whether to allow collapse
   * @default true
   */
  collapsible?: boolean;
  /** Group is not a field; specifying component is forbidden */
  component?: never;
  /**
   * Whether collapsed by default
   * @default false
   */
  defaultCollapsed?: boolean;
  /** Additional content on right side of title */
  extra?: CustomRenderType;
  /** Group is not a field; specifying fieldName is forbidden */
  fieldName?: never;
  /** Group container style in form grid, defaults to full row */
  formItemClass?: FormItemClassType;
  /** Whether to hide group */
  hide?: boolean;
  /** Group identifier for stable rendering key, defaults to index */
  name?: string;
  /** Group title */
  title?: CustomRenderType;
  /** Group marker */
  type: 'group';
  /** Grid layout inside group, defaults to inheriting form wrapperClass */
  wrapperClass?: WrapperClassType;
}

/**
 * Schema for a single form field (regular field / array field)
 */
export type FormFieldSchema<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
> =
  | FormArraySchema<T, P, TValues>
  | FormSchemaDiscriminated<T, P, TValues>
  | FormSchemaFallback<T, TValues>;

/**
 * Form schema item: field or group, distinguished by `type`
 */
export type FormSchema<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
> = FormFieldSchema<T, P, TValues> | FormGroupSchema<T, P, TValues>;

/**
 * Component props for array editor (VbenFormFieldArray)
 */
export interface VbenFormFieldArrayProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
> {
  /** Action column header text */
  actionText?: string;
  /** "Add" button text */
  addButtonText?: string;
  /** Common configuration for sub-fields */
  commonConfig?: FormCommonConfig<TValues>;
  /** Default data generated when adding a row; defaults to empty object based on column fieldName */
  createRow?: () => Record<string, any>;
  disabled?: boolean;
  /** Empty data text */
  emptyText?: string;
  /** Global common configuration for sub-fields */
  globalCommonConfig?: FormCommonConfig<TValues>;
  /** Maximum row count */
  max?: number;
  /** Minimum row count */
  min?: number;
  /** Array field path passed through from outer FormField */
  name?: string;
  /** Column definitions, each column is a sub-field (reuses FormFieldSchema) */
  schema?: FormFieldSchema<T, P, TValues>[];
  /** Whether to show index column */
  showIndex?: boolean;
}

export type HandleSubmitFn<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> = (
  values: NoInfer<TSubmitValues>,
  rawValues: Readonly<TFormValues>,
) => Promise<void> | void;

export type HandleResetFn<TSubmitValues extends FormValues = FormValues> = (
  values: TSubmitValues,
) => Promise<void> | void;

/** @deprecated Use the form-level `codec` instead. */
export type FieldMappingTimeItem = [
  string,
  [string, string],
  (
    | ((value: any, fieldName: string) => any)
    | [string, string]
    | null
    | string
  )?,
];

/** @deprecated Use the form-level `codec` instead. */
export type FieldMappingTime = FieldMappingTimeItem[];

/** @deprecated Use the form-level `codec` instead. */
export type ArrayToStringFields = Array<
  | [string[], string?] // Nested array format, optional separator
  | string // Single field, uses default separator
  | string[] // Simple array format, last element can be separator
>;

export interface FormFieldProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  TValues extends FormValues = FormValues,
> extends FormSchemaBody<TValues> {
  /** Component */
  component: Component | T;
  /** Component props */
  componentProps?: ComponentProps<TValues>;
}

export interface FormRenderProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
> {
  /**
   * Form field array-to-string mapping configuration, defaults to ","
   * @deprecated Use the form-level `codec` instead.
   */
  arrayToStringFields?: ArrayToStringFields;
  /**
   * Whether collapsed, effective when showCollapseButton=true
   * true: collapsed, false: expanded
   */
  collapsed?: boolean;
  /**
   * Number of rows to keep when collapsed
   * @default 1
   */
  collapsedRows?: number;
  /**
   * Whether to trigger resize event
   * @default false
   */
  collapseTriggerResize?: boolean;
  /**
   * Common fallback config for form items when child item is not configured; child item config takes precedence
   */
  commonConfig?: FormCommonConfig<TValues>;
  /**
   * Compact mode (removes space reserved at bottom of each form item for validation messages)
   */
  compact?: boolean;
  /**
   * Component v-model event binding
   */
  componentBindEventMap?: Partial<Record<BaseFormComponentType, string>>;
  /**
   * Component collection
   */
  componentMap: Record<BaseFormComponentType, Component>;
  /**
   * Form field mapped to date/time format
   * @deprecated Use the form-level `codec` instead.
   */
  fieldMappingTime?: FieldMappingTime;
  /**
   * Form instance
   */
  form?: FormActions<TValues>;
  /**
   * Form item layout
   */
  layout?: FormLayout;
  /**
   * Form definition
   */
  schema?: FormSchema<T, P, TValues>[];

  /**
   * Whether to display expand/collapse
   */
  showCollapseButton?: boolean;
  /**
   * Format date
   */

  /**
   * Form grid layout
   * @default "grid-cols-1"
   */
  wrapperClass?: WrapperClassType;
}

export interface ActionButtonOptions extends VbenButtonProps {
  [key: string]: any;
  content?: MaybeComputedRef<string>;
  show?: boolean;
}

export interface VbenFormProps<
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TValues,
> extends Omit<
  FormRenderProps<T, P, TValues>,
  'componentBindEventMap' | 'componentMap' | 'form'
> {
  /**
   * Whether to reverse action buttons (submit button placed first)
   */
  actionButtonsReverse?: boolean;
  /**
   * Style for action button group
   * newLine: display on new line. rowEnd: display in row, right-aligned (default). inline: use grid default style
   */
  actionLayout?: 'inline' | 'newLine' | 'rowEnd';
  /**
   * Action button group display position, defaults to right-aligned
   */
  actionPosition?: 'center' | 'left' | 'right';
  /**
   * Form action area class
   */
  actionWrapperClass?: ClassType;
  /**
   * Form field array-to-string mapping configuration, defaults to ","
   * @deprecated Use the form-level `codec` instead.
   */
  arrayToStringFields?: ArrayToStringFields;

  /**
   * Debounce time when submitOnChange triggers | default 300ms
   */
  changeDebouncedTime?: number;
  /** Bidirectional codec between form component value and submit value. */
  codec?: FormCodec<TValues, TSubmitValues>;
  /**
   * Form field mapping
   * @deprecated Use the form-level `codec` instead.
   */
  fieldMappingTime?: FieldMappingTime;
  /**
   * Callback when form collapse/expand state changes
   */
  handleCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Form reset callback
   */
  handleReset?: HandleResetFn<NoInfer<TSubmitValues>>;
  /**
   * Form submit callback
   */
  handleSubmit?: HandleSubmitFn<TValues, TSubmitValues>;
  /**
   * Form value change callback
   */
  handleValuesChange?: (
    values: Readonly<TValues>,
    fieldsChanged: string[],
    getFormattedValues: () => TSubmitValues,
  ) => void;

  /**
   * Reset button props
   */
  resetButtonOptions?: ActionButtonOptions;

  /**
   * Whether to automatically scroll to first error field upon validation failure
   * @default false
   */
  scrollToFirstError?: boolean;

  /**
   * Whether to display default action buttons
   * @default true
   */
  showDefaultActions?: boolean;

  /**
   * Submit button props
   */
  submitButtonOptions?: ActionButtonOptions;

  /**
   * Whether to submit form when field value changes
   * @default false
   */
  submitOnChange?: boolean;

  /**
   * Whether to submit form on enter key
   * @default false
   */
  submitOnEnter?: boolean;
}

export type ExtendedFormApi<
  TValues extends FormValues = FormValues,
  T extends BaseFormComponentType = BaseFormComponentType,
  P extends Record<string, any> = Record<never, never>,
  TSubmitValues extends FormValues = TValues,
> = FormApi<TValues, T, P, TSubmitValues> & {
  useStore: <TResult = NoInfer<VbenFormProps<T, P, TValues, TSubmitValues>>>(
    selector?: (
      state: NoInfer<VbenFormProps<T, P, TValues, TSubmitValues>>,
    ) => TResult,
  ) => Readonly<Ref<TResult>>;
};

export interface VbenFormAdapterOptions<
  T extends BaseFormComponentType = BaseFormComponentType,
> {
  config?: {
    baseModelPropName?: string;
    /**
     * Whether to enable change event fallback.
     * Only for compatible components that only emit change.
     * @default false
     */
    changeEventFallback?: boolean;
    emptyStateValue?: null | undefined;
    modelPropNameMap?: Partial<Record<T, string>>;
  };
  /** @deprecated Use `rules` instead. */
  defineRules?: Partial<Record<string, FormRuleValidator>>;
  rules?: Partial<Record<string, FormRuleValidator>>;
}

export interface FormRuleContext {
  field: {
    label?: string;
    name: string;
  };
  label?: string;
  name: string;
}

export type FormRuleValidator = (
  value: any,
  params: any,
  context: FormRuleContext,
) => boolean | Promise<boolean | string> | string;
