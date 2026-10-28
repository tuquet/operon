<script setup lang="ts">
import type { FormGroupSchema } from '../types';

import { computed, ref, watch } from 'vue';

import { ChevronsDown } from '@operon-core/icons';
import { VbenCollapsible, VbenRenderContent } from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { injectRenderFormProps } from './context';

interface Props {
  /** Style for group content area (field grid) */
  contentClass?: string;
  /** Whether to hide current group when form collapse button is collapsed */
  hidden?: boolean;
  schema: FormGroupSchema;
}

const props = withDefaults(defineProps<Props>(), {
  contentClass: '',
  hidden: false,
});

const formRenderProps = injectRenderFormProps();

const collapseOpen = ref(
  props.schema.collapsible === false || !props.schema.defaultCollapsed,
);

const shouldCollapsible = computed(() => {
  return props.schema.collapsible !== false;
});

// Auto expand when any field in group fails validation, preventing error message from being hidden by collapsed area
const hasInvalidField = computed(() => {
  const errors = formRenderProps.form?.errors ?? {};
  return props.schema.children.some(({ fieldName }) =>
    Object.entries(errors).some(
      ([errorFieldName, error]) =>
        Boolean(error) &&
        (errorFieldName === fieldName ||
          errorFieldName.startsWith(`${fieldName}.`) ||
          errorFieldName.startsWith(`${fieldName}[`)),
    ),
  );
});

watch(hasInvalidField, (invalid) => {
  if (invalid && !collapseOpen.value) {
    collapseOpen.value = true;
  }
});

function toggleCollapsed() {
  if (!shouldCollapsible.value) {
    return;
  }
  collapseOpen.value = !collapseOpen.value;
}
</script>

<template>
  <div
    :class="
      cn(
        'form-group col-span-full flex w-full flex-col',
        { hidden: props.hidden },
        props.schema.formItemClass,
      )
    "
  >
    <VbenCollapsible v-model:open="collapseOpen" :show-trigger="false">
      <template #label>
        <div
          class="form-group-header mb-2 flex min-h-7 flex-1 items-center gap-2"
        >
          <component
            :is="shouldCollapsible ? 'button' : 'div'"
            :aria-expanded="shouldCollapsible ? collapseOpen : undefined"
            :class="
              cn('flex min-w-0 flex-1 items-center gap-2 text-left', {
                'focus-visible:ring-ring cursor-pointer select-none rounded-sm outline-none focus-visible:ring-2':
                  shouldCollapsible,
              })
            "
            :type="shouldCollapsible ? 'button' : undefined"
            class="form-group-trigger"
            @click="toggleCollapsed"
          >
            <span
              class="bg-primary h-3.5 w-[3px] flex-none rounded-full"
            ></span>
            <span v-if="props.schema.title" class="form-group-title leading-6">
              <VbenRenderContent :content="props.schema.title" />
            </span>
            <ChevronsDown
              v-if="shouldCollapsible"
              aria-hidden="true"
              :size="16"
              :class="
                cn(
                  'text-muted-foreground ml-auto flex-none transition-transform',
                  {
                    'rotate-180': collapseOpen,
                  },
                )
              "
            />
          </component>
          <div v-if="props.schema.extra" class="flex-none">
            <VbenRenderContent :content="props.schema.extra" />
          </div>
        </div>
      </template>
      <template #collapsibleContent>
        <div :class="props.contentClass">
          <slot></slot>
        </div>
      </template>
    </VbenCollapsible>
  </div>
</template>
