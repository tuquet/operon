/**
 * Universal component adapter for Vben Form / Common UI
 * Powered by @operon-core/shadcn-ui
 */

/* eslint-disable vue/one-component-per-file */

import type { Component } from 'vue';

import type { BaseFormComponentType, IconPickerProps } from '@operon/common-ui';

import { defineComponent, h, ref } from 'vue';

import { globalShareState, IconPicker } from '@operon/common-ui';
import { $t } from '@operon/locales';

import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
  toast,
} from '@operon-core/shadcn-ui';

const withDefaultPlaceholder = (
  component: Component,
  type: 'input' | 'select',
  defaultClass?: string,
) => {
  return defineComponent({
    name: component.name,
    inheritAttrs: false,
    setup: (props: any, { attrs, expose, slots }) => {
      const innerRef = ref();
      expose(
        new Proxy(
          {},
          {
            get: (_target, key) => innerRef.value?.[key],
            has: (_target, key) => key in (innerRef.value || {}),
          },
        ),
      );
      return () => {
        const placeholder =
          props?.placeholder ||
          attrs?.placeholder ||
          $t(`ui.placeholder.${type}`);

        if (type === 'input') {
          const rawValue =
            props?.modelValue ??
            attrs?.modelValue ??
            props?.value ??
            attrs?.value;
          const modelValue = rawValue ?? '';

          const handleUpdate = (val: any) => {
            if (typeof attrs['onUpdate:modelValue'] === 'function') {
              attrs['onUpdate:modelValue'](val);
            }
            if (typeof attrs['onUpdate:value'] === 'function') {
              attrs['onUpdate:value'](val);
            }
            if (typeof props['onUpdate:modelValue'] === 'function') {
              props['onUpdate:modelValue'](val);
            }
            if (typeof props['onUpdate:value'] === 'function') {
              props['onUpdate:value'](val);
            }
            if (typeof attrs.onChange === 'function') {
              attrs.onChange(val);
            }
            if (typeof props.onChange === 'function') {
              props.onChange(val);
            }
          };

          const restAttrs: Record<string, any> = { ...props, ...attrs };
          delete restAttrs.value;
          delete restAttrs.modelValue;
          delete restAttrs['onUpdate:value'];
          delete restAttrs['onUpdate:modelValue'];
          delete restAttrs.onChange;
          delete restAttrs.onInput;
          delete restAttrs.clearable;

          return h(
            component,
            {
              ...restAttrs,
              class: [defaultClass, restAttrs.class],
              modelValue,
              'onUpdate:modelValue': handleUpdate,
              placeholder,
              ref: innerRef,
            },
            slots,
          );
        }

        return h(
          component,
          { placeholder, ...props, ...attrs, ref: innerRef },
          slots,
        );
      };
    },
  });
};

const createBooleanAdapter = (component: Component) => {
  return defineComponent({
    name: component.name,
    inheritAttrs: false,
    setup: (props: any, { attrs, slots }) => {
      return () => {
        const rawValue =
          props?.modelValue ??
          attrs?.modelValue ??
          props?.checked ??
          attrs?.checked ??
          props?.value ??
          attrs?.value;
        const modelValue = Boolean(rawValue);

        const handleUpdate = (val: boolean) => {
          if (typeof attrs['onUpdate:modelValue'] === 'function') {
            attrs['onUpdate:modelValue'](val);
          }
          if (typeof attrs['onUpdate:checked'] === 'function') {
            attrs['onUpdate:checked'](val);
          }
          if (typeof attrs['onUpdate:value'] === 'function') {
            attrs['onUpdate:value'](val);
          }
          if (typeof props['onUpdate:modelValue'] === 'function') {
            props['onUpdate:modelValue'](val);
          }
          if (typeof props['onUpdate:checked'] === 'function') {
            props['onUpdate:checked'](val);
          }
          if (typeof props['onUpdate:value'] === 'function') {
            props['onUpdate:value'](val);
          }
          if (typeof attrs.onChange === 'function') {
            attrs.onChange(val);
          }
          if (typeof props.onChange === 'function') {
            props.onChange(val);
          }
        };

        const restAttrs: Record<string, any> = { ...props, ...attrs };
        delete restAttrs.checked;
        delete restAttrs.value;
        delete restAttrs.modelValue;
        delete restAttrs['onUpdate:checked'];
        delete restAttrs['onUpdate:value'];
        delete restAttrs['onUpdate:modelValue'];
        delete restAttrs.onChange;

        return h(
          component,
          {
            ...restAttrs,
            modelValue,
            'onUpdate:modelValue': handleUpdate,
          },
          slots,
        );
      };
    },
  });
};

const FallbackComponent = defineComponent({
  name: 'FallbackComponent',
  props: {
    modelValue: {
      default: undefined,
      type: [String, Number, Boolean, Object, Array],
    },
    value: {
      default: undefined,
      type: [String, Number, Boolean, Object, Array],
    },
  },
  setup(_props, { attrs, slots }) {
    return () => h('div', attrs, slots);
  },
});

export type ComponentType =
  | 'ApiCascader'
  | 'ApiSelect'
  | 'ApiTreeSelect'
  | 'AutoComplete'
  | 'Cascader'
  | 'Checkbox'
  | 'CheckboxGroup'
  | 'DatePicker'
  | 'DefaultButton'
  | 'Divider'
  | 'IconPicker'
  | 'Input'
  | 'InputNumber'
  | 'InputPassword'
  | 'Mentions'
  | 'PrimaryButton'
  | 'Radio'
  | 'RadioGroup'
  | 'RangePicker'
  | 'Rate'
  | 'Select'
  | 'Space'
  | 'Switch'
  | 'Textarea'
  | 'TimePicker'
  | 'TreeSelect'
  | 'Upload'
  | BaseFormComponentType;

export interface ComponentPropsMap {
  ApiCascader: Record<string, any>;
  ApiSelect: Record<string, any>;
  ApiTreeSelect: Record<string, any>;
  AutoComplete: Record<string, any>;
  Cascader: Record<string, any>;
  Checkbox: Record<string, any>;
  CheckboxGroup: Record<string, any>;
  DatePicker: Record<string, any>;
  DefaultButton: Record<string, any>;
  Divider: Record<string, any>;
  IconPicker: IconPickerProps;
  Input: Record<string, any>;
  InputNumber: Record<string, any>;
  InputPassword: Record<string, any>;
  Mentions: Record<string, any>;
  PrimaryButton: Record<string, any>;
  Radio: Record<string, any>;
  RadioGroup: Record<string, any>;
  RangePicker: Record<string, any>;
  Rate: Record<string, any>;
  Select: Record<string, any>;
  Space: Record<string, any>;
  Switch: Record<string, any>;
  Textarea: Record<string, any>;
  TimePicker: Record<string, any>;
  TreeSelect: Record<string, any>;
  Upload: Record<string, any>;
}

const INPUT_DEFAULT_CLASS = 'h-9 bg-background/90 shadow-2xs';

async function initComponentAdapter() {
  const components: Partial<Record<ComponentType, Component>> = {
    ApiCascader: FallbackComponent,
    ApiSelect: FallbackComponent,
    ApiTreeSelect: FallbackComponent,
    AutoComplete: FallbackComponent,
    Cascader: FallbackComponent,
    Checkbox: createBooleanAdapter(Checkbox),
    CheckboxGroup: FallbackComponent,
    DatePicker: FallbackComponent,
    DefaultButton: (props, { attrs, slots }) => {
      return h(
        Button,
        { size: 'sm', ...props, ...attrs, variant: 'outline' },
        slots,
      );
    },
    Divider: (props, { attrs }) =>
      h(Separator, { class: 'my-4', ...props, ...attrs }),
    IconPicker: withDefaultPlaceholder(IconPicker, 'select'),
    Input: withDefaultPlaceholder(Input, 'input', INPUT_DEFAULT_CLASS),
    InputNumber: withDefaultPlaceholder(
      (props: any, { attrs }: any) =>
        h(Input, { type: 'number', ...props, ...attrs }),
      'input',
      INPUT_DEFAULT_CLASS,
    ),
    InputPassword: withDefaultPlaceholder(
      (props: any, { attrs }: any) =>
        h(Input, { type: 'password', ...props, ...attrs }),
      'input',
      INPUT_DEFAULT_CLASS,
    ),
    Mentions: withDefaultPlaceholder(Input, 'input', INPUT_DEFAULT_CLASS),
    PrimaryButton: (props, { attrs, slots }) => {
      return h(
        Button,
        { size: 'sm', ...props, ...attrs, variant: 'default' },
        slots,
      );
    },
    Radio: (props, { attrs }) =>
      h('input', {
        class: 'size-4 text-primary',
        type: 'radio',
        ...props,
        ...attrs,
      }),
    RadioGroup: FallbackComponent,
    RangePicker: FallbackComponent,
    Rate: FallbackComponent,
    Select: withDefaultPlaceholder((props: any, { attrs }: any) => {
      const options: Array<{
        disabled?: boolean;
        label?: string;
        title?: string;
        value: any;
      }> = props?.options || attrs?.options || [];
      const rawValue =
        props?.modelValue ?? attrs?.modelValue ?? props?.value ?? attrs?.value;
      const modelValue =
        rawValue !== undefined && rawValue !== null
          ? String(rawValue)
          : undefined;
      const placeholder =
        props?.placeholder || attrs?.placeholder || $t('ui.placeholder.select');
      const disabled = props?.disabled ?? attrs?.disabled ?? false;

      const handleUpdate = (val: any) => {
        if (attrs['onUpdate:modelValue']) attrs['onUpdate:modelValue'](val);
        if (attrs['onUpdate:value']) attrs['onUpdate:value'](val);
        if (props['onUpdate:modelValue']) props['onUpdate:modelValue'](val);
        if (props['onUpdate:value']) props['onUpdate:value'](val);
        if (attrs.onChange) attrs.onChange(val);
        if (props.onChange) props.onChange(val);
      };

      return h(
        Select,
        {
          disabled,
          modelValue,
          'onUpdate:modelValue': handleUpdate,
        },
        () => [
          h(
            SelectTrigger,
            {
              class:
                'h-9 w-full bg-background/90 shadow-2xs transition-colors hover:bg-accent/40',
            },
            () => h(SelectValue, { placeholder }),
          ),
          h(
            SelectContent,
            {
              class: 'z-popup min-w-[8rem]',
            },
            () =>
              options.map((opt) =>
                h(
                  SelectItem,
                  {
                    class: 'cursor-pointer',
                    disabled: opt.disabled,
                    key: String(opt.value),
                    value: String(opt.value),
                  },
                  () => opt.label ?? opt.title ?? String(opt.value),
                ),
              ),
          ),
        ],
      );
    }, 'select'),
    Space: (props, { attrs, slots }) =>
      h('div', { class: 'flex items-center gap-2', ...props, ...attrs }, slots),
    Switch: createBooleanAdapter(Switch),
    Textarea: withDefaultPlaceholder(
      Textarea,
      'input',
      'bg-background/90 shadow-2xs',
    ),
    TimePicker: FallbackComponent,
    TreeSelect: FallbackComponent,
    Upload: FallbackComponent,
  };

  globalShareState.setComponents(components);

  globalShareState.defineMessage({
    copyPreferencesSuccess: (title, content) => {
      toast.success(
        title ? `${title}: ${content ?? ''}` : (content ?? 'Copied'),
      );
    },
  });
}

export { initComponentAdapter };
