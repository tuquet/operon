import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue';

import type { FormValidationTrigger } from './types';

import { computed, inject, onUnmounted, provide, toRaw, watch } from 'vue';

import { cloneDeep, isEqual } from '@operon-core/shared/utils';

export interface FormCustomFieldContext {
  /** Registered getter function; a form item only accepts one */
  customValue: ShallowRef<(() => any) | undefined>;
  disabled: ComputedRef<boolean>;
  error: Readonly<Ref<string | undefined>>;
  fieldName: string;
  resetValidation: () => void;
  setValue: (value: any) => void;
  validateWithTrigger: (trigger: FormValidationTrigger) => void;
  value: Readonly<Ref<any>>;
}

export interface UseCustomFieldValueOptions {
  /** Enable when value is object/array mutated in place */
  deep?: boolean;
  /** Write current value to form on mount (without triggering validation) */
  immediate?: boolean;
}

export interface UseCustomFieldValueReturn<T> {
  /** Disabled state of form item (including form-level, schema-level, dependencies) */
  disabled: ComputedRef<boolean>;
  /** Current validation error of form item */
  error: Readonly<Ref<string | undefined>>;
  /** Field name of containing form item; undefined when not inside a form item */
  fieldName: string | undefined;
  /** Clear validation state of this form item */
  resetValidation: () => void;
  /** Form value of this field, can be used to react to setValues / resetForm */
  value: ComputedRef<T | undefined>;
}

const CUSTOM_FIELD_INJECTION_KEY: InjectionKey<FormCustomFieldContext> = Symbol(
  'VbenFormCustomField',
);

export function provideFormCustomField(context: FormCustomFieldContext) {
  provide(CUSTOM_FIELD_INJECTION_KEY, context);
}

/**
 * Allow custom components inside VbenForm form items to deliver their values to the form.
 *
 * When component neither binds `componentProps` (slot usage) nor implements `modelValue`,
 * the form cannot retrieve its value and schema rules cannot validate it. After calling this function, the getter
 * result writes back to the form field and triggers validation according to the form item's `validateOn`.
 *
 * Value remains owned by form: component should continue using `modelValue` to receive form values (slot usage is
 * `v-bind="slotProps.componentProps"`), allowing `setValues` and reset to flow back to the component.
 * Only components holding internal state completely independently need to sync with the returned `value`.
 */
export function useCustomFieldValue<T = any>(
  customValue: () => T,
  options: UseCustomFieldValueOptions = {},
): UseCustomFieldValueReturn<T> {
  const field = inject(CUSTOM_FIELD_INJECTION_KEY, null);

  if (!field) {
    console.warn(
      'useCustomFieldValue can only be used inside a VbenForm field item',
    );
    return {
      disabled: computed(() => false),
      error: computed(() => undefined),
      fieldName: undefined,
      resetValidation: () => {},
      value: computed(() => undefined),
    };
  }

  // A field can only have one value source; later registrations overwrite previous ones
  if (field.customValue.value) {
    console.warn(
      `Form field ${field.fieldName} already has a custom getter; this registration was ignored`,
    );
  } else {
    field.customValue.value = customValue;

    onUnmounted(() => {
      if (field.customValue.value === customValue) {
        field.customValue.value = undefined;
      }
    });

    // When deep is true, component mutates this object in place; store a copy in the form,
    // so next comparison does not compare against itself and in-place changes are detected
    const toFormValue = (value: T) =>
      options.deep ? cloneDeep(toRaw(value)) : value;

    if (options.immediate) {
      field.setValue(toFormValue(customValue()));
    }

    watch(
      customValue,
      (value) => {
        // When component is driven by form (v-model / componentProps), new values from setValues or reset
        // flow through component back here matching form value: do not rewrite or trigger validation,
        // otherwise clicking reset immediately triggers required validation errors
        if (isEqual(value, toRaw(field.value.value))) {
          return;
        }
        field.setValue(toFormValue(value));
        field.resetValidation();
        field.validateWithTrigger('change');
      },
      { deep: options.deep },
    );
  }

  return {
    disabled: field.disabled,
    error: field.error,
    fieldName: field.fieldName,
    resetValidation: field.resetValidation,
    value: computed(() => field.value.value as T | undefined),
  };
}
