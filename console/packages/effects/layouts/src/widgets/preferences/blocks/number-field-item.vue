<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { useId, useSlots } from 'vue';

import { CircleHelp } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'PreferenceSelectItem',
});

withDefaults(
  defineProps<{
    disabled?: boolean;
    items?: SelectOption[];
    placeholder?: string;
    tip?: string;
  }>(),
  {
    disabled: false,
    placeholder: '',
    tip: '',
    items: () => [],
  },
);

const inputValue = defineModel<number | undefined>({ default: undefined });

const id = useId();
const slots = useSlots();
</script>

<template>
  <div
    :class="{
      'pointer-events-none opacity-50': disabled,
    }"
    class="my-1 flex w-full items-center justify-between rounded-md px-2 py-1"
  >
    <span :id="id" class="flex items-center">
      <slot></slot>

      <TooltipProvider>
        <Tooltip v-if="slots.tip || tip">
          <TooltipTrigger as-child>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-5"
              :aria-label="tip || $t('common.help')"
            >
              <CircleHelp />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <slot name="tip">
              <template v-if="tip">
                <p v-for="(line, index) in tip.split('\n')" :key="index">
                  {{ line }}
                </p>
              </template>
            </slot>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>

    <NumberField
      :disabled="disabled"
      v-model="inputValue"
      v-bind="$attrs"
      class="w-41.25"
    >
      <NumberFieldContent>
        <NumberFieldDecrement />
        <NumberFieldInput :aria-labelledby="id" />
        <NumberFieldIncrement />
      </NumberFieldContent>
    </NumberField>
  </div>
</template>
