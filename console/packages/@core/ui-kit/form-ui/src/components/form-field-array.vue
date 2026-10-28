<script setup lang="ts">
// oxlint-disable unicorn/no-nested-ternary
import type { FormCommonConfig, FormFieldSchema } from '../types';

import { computed } from 'vue';

import { Plus, X } from '@operon-core/icons';
import {
  VbenButton,
  VbenIconButton,
  VbenRenderContent,
} from '@operon-core/shadcn-ui';
import { cn, get, set } from '@operon-core/shared/utils';

import { injectRenderFormProps } from '../form-render/context';
import FormField from '../form-render/form-field.vue';
import { createArrayChildSchema } from '../form-render/schema';

defineOptions({ name: 'VbenFormFieldArray', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Action column header text */
    actionText?: string;
    /** "Add" button text */
    addButtonText?: string;
    /** Common configuration for sub-fields */
    commonConfig?: FormCommonConfig;
    /**
     * Default data generated when adding a row; defaults to empty object based on schema fieldNames
     */
    createRow?: () => Record<string, any>;
    disabled?: boolean;
    /** Empty data text */
    emptyText?: string;
    /** Global common configuration for sub-fields */
    globalCommonConfig?: FormCommonConfig;
    /** Maximum row count */
    max?: number;
    /** Minimum row count */
    min?: number;
    /** Field path passed through from outer FormField via componentField */
    name?: string;
    /**
     * Column definitions, each column is a sub-field (reuses FormFieldSchema)
     */
    schema?: FormFieldSchema[];
    /** Whether to show index column */
    showIndex?: boolean;
  }>(),
  {
    actionText: 'Action',
    addButtonText: 'Add Row',
    createRow: undefined,
    disabled: false,
    emptyText: 'No data',
    commonConfig: () => ({}),
    globalCommonConfig: () => ({}),
    max: Number.POSITIVE_INFINITY,
    min: 0,
    name: '',
    schema: () => [],
    showIndex: true,
  },
);

const arrayPath = computed(() => props.name);
const formRenderProps = injectRenderFormProps();
const form = formRenderProps.form;
if (!form) {
  throw new Error('Form api is required in <VbenFormFieldArray />');
}
const formActions = form;
const arrayLength = formActions.useSelector((state) => {
  const value = get(state.values, props.name);
  return Array.isArray(value) ? value.length : 0;
});
const rowIndexes = computed(() =>
  Array.from({ length: arrayLength.value }, (_, index) => index),
);

const canAdd = computed(() => arrayLength.value < props.max);
const canRemove = computed(() => arrayLength.value > props.min);
const gridStyle = computed(() => {
  const columns = [
    ...(props.showIndex ? ['3rem'] : []),
    ...props.schema.map(() => 'minmax(0, 1fr)'),
    '4rem',
  ];
  return {
    gridTemplateColumns: columns.join(' '),
  };
});

function buildDefaultRow(): Record<string, any> {
  if (props.createRow) {
    return props.createRow();
  }

  const row: Record<string, any> = {};
  props.schema.forEach((col) => {
    let value: any = null;
    if (Reflect.has(col, 'defaultValue') && col.defaultValue !== undefined) {
      value = col.defaultValue;
    } else if ('type' in col && col.type === 'array') {
      value = [];
    }
    set(row, col.fieldName, value);
  });
  return row;
}

function addRow() {
  if (props.disabled || !canAdd.value) {
    return;
  }
  formActions.pushFieldValue(arrayPath.value, buildDefaultRow());
}

function removeRow(index: number) {
  if (props.disabled || !canRemove.value) {
    return;
  }
  void formActions.removeFieldValue(arrayPath.value, index);
}

function rowSchemas(index: number) {
  return props.schema.map((col) =>
    createArrayChildSchema(col as never, {
      arrayField: arrayPath.value,
      commonConfig: props.commonConfig,
      disabled: props.disabled,
      globalCommonConfig: props.globalCommonConfig,
      index,
    }),
  );
}

const normalizedRowSchemas = computed(() =>
  Array.from({ length: arrayLength.value }, (_, index) => rowSchemas(index)),
);
</script>

<template>
  <div :class="cn('w-full', $attrs.class as string)">
    <div class="border-border/70 overflow-hidden rounded-md border">
      <div
        class="bg-muted/30 border-border hidden border-b px-2 sm:grid"
        :style="gridStyle"
      >
        <div v-if="showIndex" class="text-muted-foreground px-2 py-2 text-left">
          #
        </div>
        <div
          v-for="col in schema"
          :key="col.fieldName"
          class="text-muted-foreground px-2 py-2 text-left"
        >
          <VbenRenderContent :content="col.label" />
        </div>
        <div class="text-muted-foreground px-2 py-2 text-left">
          {{ actionText }}
        </div>
      </div>

      <div
        v-for="index in rowIndexes"
        :key="`${arrayPath}-${index}`"
        class="border-border/60 border-b p-3 last:border-b-0 sm:grid sm:p-0"
        :style="gridStyle"
      >
        <div
          v-if="showIndex"
          class="text-muted-foreground mb-2 sm:mb-0 sm:px-4 sm:py-3"
        >
          <span class="sm:hidden">#</span>
          {{ index + 1 }}
        </div>

        <template
          v-for="(childSchema, childIndex) in normalizedRowSchemas[index]"
          :key="childSchema.fieldName"
        >
          <div class="min-w-0 py-2 sm:px-2">
            <div class="text-muted-foreground mb-1 sm:hidden">
              <VbenRenderContent :content="schema?.[childIndex]?.label" />
            </div>
            <FormField
              v-bind="childSchema"
              :class="childSchema.formItemClass"
            />
          </div>
        </template>

        <div class="flex justify-end pt-1 sm:block sm:px-2 sm:py-3">
          <VbenIconButton
            type="button"
            :disabled="disabled || !canRemove"
            :on-click="() => removeRow(index)"
            class="text-muted-foreground hover:text-destructive"
          >
            <X class="size-4" />
          </VbenIconButton>
        </div>
      </div>

      <div
        v-if="arrayLength === 0"
        class="text-muted-foreground py-6 text-center"
      >
        {{ emptyText }}
      </div>
    </div>

    <VbenButton
      variant="outline"
      size="sm"
      type="button"
      :disabled="disabled || !canAdd"
      class="mt-3 w-full border-dashed"
      @click="addRow"
    >
      <Plus class="mr-1 size-4" />
      {{ addButtonText }}
    </VbenButton>
  </div>
</template>
