<script setup lang="ts">
import type { ExtendedFormApi, VbenFormProps, VbenFormSlots } from './types';

import { nextTick, onMounted, readonly, watch } from 'vue';

import { useForwardPriorityValues } from '@operon-core/composables';
import { get, isEqual } from '@operon-core/shared/utils';

import { useDebounceFn } from '@vueuse/core';

import FormActions from './components/form-actions.vue';
import {
  COMPONENT_BIND_EVENT_MAP,
  COMPONENT_MAP,
  DEFAULT_FORM_COMMON_CONFIG,
} from './config';
import { Form } from './form-render';
import { getFormFieldSchemas } from './form-render/schema';
import {
  provideComponentRefMap,
  provideFormProps,
  useFormInitial,
} from './use-form-context';

// Using extends causes hot reload to freeze, so duplicated here
interface Props extends VbenFormProps {
  formApi?: ExtendedFormApi<any, any, any, any>;
}

const props = defineProps<Props>();
defineSlots<
  Record<string, ((props: Record<string, any>) => any) | undefined> &
    VbenFormSlots<any, any, any>
>();

const formApi = props.formApi;
if (!formApi) {
  throw new Error('Form api is required in <VbenUseForm />');
}

const state = formApi.useStore();

const forward = useForwardPriorityValues(props, state);

const componentRefMap = new Map<string, unknown>();

const { delegatedSlots, form } = useFormInitial(forward);
const values = form.useValues();

provideFormProps([forward, form]);
provideComponentRefMap(componentRefMap);

formApi.mount(form, componentRefMap);

function handleUpdateCollapsed(value: boolean) {
  props.formApi?.setState({ collapsed: value });
  // Trigger collapse/expand state change callback
  forward.value.handleCollapsedChange?.(value);
}

function handleKeyDownEnter(event: KeyboardEvent) {
  if (!state?.value.submitOnEnter || !forward.value.formApi?.isMounted) {
    return;
  }
  // If textarea, do not prevent default behavior to allow line breaks.
  // Skip enter submit handling for textarea
  if (event.target instanceof HTMLTextAreaElement) {
    return;
  }
  event.preventDefault();

  forward.value.formApi?.validateAndSubmit();
}

const handleValuesChangeDebounced = useDebounceFn(async () => {
  state?.value.submitOnChange && forward.value.formApi?.validateAndSubmit();
}, state?.value?.changeDebouncedTime ?? 300);

let valuesChangeReady = false;

onMounted(async () => {
  // Only start listening after mount; form.values undergoes an initialization process
  await nextTick();
  valuesChangeReady = true;
});

watch(values, (currentValues, previousValues) => {
  if (!valuesChangeReady) {
    return;
  }
  const handleValuesChange = forward.value.handleValuesChange;
  const submitOnChange = state?.value.submitOnChange;
  if (!handleValuesChange && !submitOnChange) {
    return;
  }
  const fields = getFormFieldSchemas(state?.value.schema ?? []).map(
    (item) => item.fieldName,
  );
  if (handleValuesChange && fields.length > 0) {
    const changedFields = fields.filter((field) => {
      return !isEqual(
        get(currentValues, field),
        get(previousValues ?? {}, field),
      );
    });
    if (changedFields.length > 0) {
      handleValuesChange(readonly(currentValues), changedFields, () =>
        formApi.formatValues(currentValues),
      );
    }
  }
  if (submitOnChange) {
    handleValuesChangeDebounced();
  }
});
</script>

<template>
  <Form
    @keydown.enter="handleKeyDownEnter"
    v-bind="forward"
    :collapsed="state?.collapsed"
    :component-bind-event-map="COMPONENT_BIND_EVENT_MAP"
    :component-map="COMPONENT_MAP"
    :form="form"
    :global-common-config="DEFAULT_FORM_COMMON_CONFIG"
  >
    <template
      v-for="slotName in delegatedSlots"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps"
        :form-api="formApi"
        :values="form.values"
      ></slot>
    </template>
    <template #default="slotProps">
      <slot
        v-if="$slots.default"
        v-bind="slotProps"
        :form-api="formApi"
        :values="form.values"
      ></slot>
      <FormActions
        v-else-if="forward.showDefaultActions"
        :model-value="state?.collapsed"
        @update:model-value="handleUpdateCollapsed"
      >
        <template #reset-before="resetSlotProps">
          <slot
            name="reset-before"
            v-bind="resetSlotProps"
            :form-api="formApi"
            :values="form.values"
          ></slot>
        </template>
        <template #submit-before="submitSlotProps">
          <slot
            name="submit-before"
            v-bind="submitSlotProps"
            :form-api="formApi"
            :values="form.values"
          ></slot>
        </template>
        <template #expand-before="expandBeforeSlotProps">
          <slot
            name="expand-before"
            v-bind="expandBeforeSlotProps"
            :form-api="formApi"
            :values="form.values"
          ></slot>
        </template>
        <template #expand-after="expandAfterSlotProps">
          <slot
            name="expand-after"
            v-bind="expandAfterSlotProps"
            :form-api="formApi"
            :values="form.values"
          ></slot>
        </template>
      </FormActions>
    </template>
  </Form>
</template>
