<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { computed, useSlots } from 'vue';

import { CircleHelp } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'PreferenceCheckboxItem',
});

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    items?: SelectOption[];
    multiple?: boolean;
    onBtnClick?: (value: string) => void;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: '',
    items: () => [],
    onBtnClick: () => {},
    multiple: false,
  },
);

const inputValue = defineModel<string[] | undefined>({ default: undefined });

const selection = computed({
  get: () =>
    props.multiple ? (inputValue.value ?? []) : inputValue.value?.[0],
  set: (value: string | string[] | undefined) => {
    let next: string[] = [];
    if (Array.isArray(value)) {
      next = value;
    } else if (value) {
      next = [value];
    }
    const changed =
      next.find((item) => !inputValue.value?.includes(item)) ??
      inputValue.value?.find((item) => !next.includes(item));
    inputValue.value = next;
    if (changed) props.onBtnClick(changed);
  },
});
const slots = useSlots();
</script>

<template>
  <div
    :class="{
      'pointer-events-none opacity-50': disabled,
    }"
    class="my-1 flex w-full items-center justify-between rounded-md px-2 py-1"
  >
    <span class="flex items-center">
      <slot></slot>

      <TooltipProvider>
        <Tooltip v-if="slots.tip">
          <TooltipTrigger as-child>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-5"
              :aria-label="$t('common.help')"
            >
              <CircleHelp />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <slot name="tip"></slot>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
    <ToggleGroup
      v-model="selection"
      :type="multiple ? 'multiple' : 'single'"
      :disabled="disabled"
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem
        v-for="item in items"
        :key="item.value"
        :value="item.value"
      >
        {{ item.label }}
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
</template>
