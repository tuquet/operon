<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { useId, useSlots } from 'vue';

import { CircleHelp, CircleX } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
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

const inputValue = defineModel<string | undefined>({ default: undefined });

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
    <InputGroup class="h-8 w-41.25">
      <InputGroupInput
        :aria-labelledby="id"
        v-model="inputValue"
        :disabled="disabled"
        :placeholder="placeholder"
      />
      <InputGroupAddon align="inline-end">
        <Button
          v-if="inputValue"
          type="button"
          variant="ghost"
          size="icon"
          class="size-6"
          :disabled="disabled"
          :aria-label="$t('common.clear')"
          @click="inputValue = ''"
        >
          <CircleX />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  </div>
</template>
