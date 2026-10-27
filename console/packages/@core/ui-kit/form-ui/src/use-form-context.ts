import type { ZodType } from 'zod';

import type { ComputedRef } from 'vue';

import type { ExtendedFormApi, FormActions, VbenFormProps } from './types';

import { computed, toRaw, unref, useSlots } from 'vue';

import { createContext } from '@operon-core/shadcn-ui';
import {
  isString,
  mergeWithArrayOverride,
  set,
} from '@operon-core/shared/utils';

import {
  object,
  ZodIntersection,
  ZodNumber,
  ZodObject,
  ZodString,
  string as zodString,
  ZodStringFormat,
} from 'zod';
import { getDefaultsForSchema } from 'zod-defaults';

import { getFormFieldSchemas } from './form-render/schema';
import { useFormRuntime } from './form-runtime';

type ExtendFormProps = VbenFormProps & {
  formApi?: ExtendedFormApi<any, any, any>;
};

export const [injectFormProps, provideFormProps] =
  createContext<[ComputedRef<ExtendFormProps> | ExtendFormProps, FormActions]>(
    'VbenFormProps',
  );

export const [injectComponentRefMap, provideComponentRefMap] =
  createContext<Map<string, unknown>>('ComponentRefMap');

/**
 * Rebuild the schema used by zod-defaults, replacing native format nodes that
 * zod-defaults does not recognise while retaining supported wrappers.
 */
function normalizeSchemaForDefaults(rule: ZodType): ZodType {
  const rawRule = toRaw(rule) as any;

  if (rawRule instanceof ZodStringFormat) {
    return zodString();
  }

  if (rawRule instanceof ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(rawRule.shape).map(([key, value]) => [
        key,
        normalizeSchemaForDefaults(value as ZodType),
      ]),
    );
    return object(shape);
  }

  if (rawRule instanceof ZodIntersection) {
    const { left, right } = (rawRule as any).def;
    return normalizeSchemaForDefaults(left as ZodType).and(
      normalizeSchemaForDefaults(right as ZodType),
    );
  }

  if (rawRule.constructor.name === 'ZodDefault') {
    const inner = normalizeSchemaForDefaults(rawRule.unwrap());
    return inner.default(rawRule.def.defaultValue);
  }

  if (rawRule.constructor.name === 'ZodPipe') {
    return normalizeSchemaForDefaults(rawRule.in).pipe(rawRule.out);
  }

  return rawRule;
}

export function useFormInitial(
  props: ComputedRef<VbenFormProps> | VbenFormProps,
) {
  const slots = useSlots();
  const initialValues = generateInitialValues();

  const form = useFormRuntime(initialValues);

  const delegatedSlots = computed(() => {
    const resultSlots: string[] = [];

    for (const key of Object.keys(slots)) {
      if (key !== 'default') {
        resultSlots.push(key);
      }
    }
    return resultSlots;
  });

  function generateInitialValues() {
    const initialValues: Record<string, any> = {};

    const zodObject: Record<string, ZodType> = {};
    getFormFieldSchemas(unref(props).schema ?? []).forEach((item) => {
      if (Reflect.has(item, 'defaultValue')) {
        set(initialValues, item.fieldName, item.defaultValue);
      } else if (item.rules && !isString(item.rules)) {
        // Check whether rule is suitable for extracting default value
        const rawRules = toRaw(item.rules);
        const customDefaultValue = getCustomDefaultValue(rawRules);
        zodObject[item.fieldName] = normalizeSchemaForDefaults(rawRules);
        if (customDefaultValue !== undefined) {
          initialValues[item.fieldName] = customDefaultValue;
        }
      }
    });

    const schemaInitialValues = getDefaultsForSchema(object(zodObject));

    const zodDefaults: Record<string, any> = {};
    for (const key in schemaInitialValues) {
      set(zodDefaults, key, schemaInitialValues[key]);
    }
    return mergeWithArrayOverride(initialValues, zodDefaults);
  }
  // Custom default value extraction logic
  function getCustomDefaultValue(rule: any): any {
    rule = toRaw(rule);
    if (rule instanceof ZodString || rule instanceof ZodStringFormat) {
      return ''; // Strings and formatted validations default to empty string
    } else if (rule instanceof ZodNumber) {
      return null; // Defaults to null (avoid displaying 0)
    } else if (rule instanceof ZodObject) {
      // Recursively extract default values for nested objects
      const defaultValues: Record<string, any> = {};
      for (const [key, valueSchema] of Object.entries(rule.shape)) {
        defaultValues[key] = getCustomDefaultValue(valueSchema);
      }
      return defaultValues;
    } else if (rule instanceof ZodIntersection) {
      return getDefaultsForSchema(normalizeSchemaForDefaults(rule) as any);
    } else {
      return undefined; // Other types provide no default value
    }
  }

  return {
    delegatedSlots,
    form,
  };
}
