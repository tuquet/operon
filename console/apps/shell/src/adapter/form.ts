import type {
  VbenFormProps as FormProps,
  VbenFormSchema as FormSchema,
  FormValues,
} from '@operon/common-ui';

import type { ComponentPropsMap, ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@operon/common-ui';
import { $t } from '@operon/locales';

async function initSetupVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      // @operon-core/shadcn-ui components follow Vue 3 standard v-model (modelValue / onUpdate:modelValue)
      baseModelPropName: 'modelValue',
      modelPropNameMap: {
        Upload: 'fileList',
      },
    },
    rules: {
      // Input required field i18n adaptation
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // Select required field i18n adaptation
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

function useVbenForm<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
>(
  options: FormProps<
    ComponentType,
    ComponentPropsMap,
    TFormValues,
    TSubmitValues
  >,
) {
  return useForm<TFormValues, ComponentType, ComponentPropsMap, TSubmitValues>(
    options,
  );
}

export { initSetupVbenForm, useVbenForm, z };

export type VbenFormSchema<TValues extends FormValues = FormValues> =
  FormSchema<ComponentType, ComponentPropsMap, TValues>;
export type VbenFormProps<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> = FormProps<ComponentType, ComponentPropsMap, TFormValues, TSubmitValues>;
