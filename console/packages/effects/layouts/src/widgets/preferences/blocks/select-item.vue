<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { useId, useSlots } from 'vue';

import { CircleHelp } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

const selectValue = defineModel<string | undefined>({ default: undefined });

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
    <Select v-model="selectValue" :disabled="disabled">
      <SelectTrigger :aria-labelledby="id" class="h-8 w-41.25">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <template v-for="item in items" :key="item.value">
            <SelectItem :value="item.value">{{ item.label }}</SelectItem>
          </template>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>
