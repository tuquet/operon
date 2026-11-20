<script setup lang="ts">
import { useId, useSlots } from 'vue';

import { CircleHelp } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  Label,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'PreferenceSwitchItem',
});

withDefaults(defineProps<{ disabled?: boolean; tip?: string }>(), {
  disabled: false,
  tip: '',
});

const id = useId();
const checked = defineModel<boolean>();

const slots = useSlots();
</script>

<template>
  <div
    :class="{
      'pointer-events-none opacity-50': disabled,
    }"
    class="my-1 flex w-full items-center justify-between rounded-md px-2 py-2.5"
  >
    <span class="flex items-center">
      <Label :for="id"><slot></slot></Label>

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
    <span v-if="$slots.shortcut" class="mr-2 ml-auto opacity-60">
      <slot name="shortcut"></slot>
    </span>
    <Switch :id="id" v-model="checked" :disabled="disabled" />
  </div>
</template>
