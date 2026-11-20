<script setup lang="ts">
import type { ActionItem } from './types';

import { computed, ref } from 'vue';

import { useSimpleLocale } from '@operon-core/composables';
import { cn } from '@operon-core/shared/utils';

import {
  DropdownMenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui';
import { VbenButton } from '../button';
import { VbenIcon } from '../icon';

const props = defineProps<{ action: ActionItem }>();
const emit = defineEmits<{ confirm: [] }>();
const { $t } = useSimpleLocale();
const open = ref(false);

const itemClass = computed(() =>
  cn(
    'cursor-pointer gap-2',
    props.action.danger && 'text-destructive focus:text-destructive',
  ),
);

/**
 * Prevent default behavior of reka-ui events, used for:
 * - @select: prevent menu auto-closing after click to display popconfirm;
 * - @open-auto-focus: prevent popup from stealing focus (avoids conflict with menu focus trap);
 * - @focus-outside: prevent false dismissal when menu regains focus.
 */
function preventDefault(event: Event) {
  event.preventDefault();
}

function onClick() {
  if (props.action.disabled) return;
  props.action.onClick?.();
}

function onConfirm() {
  open.value = false;
  const pc = props.action.popConfirm;
  if (pc?.confirm) {
    pc.confirm();
  } else {
    props.action.onClick?.();
  }
  // Close entire dropdown menu after confirmation
  emit('confirm');
}

function onCancel() {
  open.value = false;
}
</script>

<template>
  <!--
    Popconfirm: menu item simultaneously acts as Popover trigger.
    Through dual as-child (DropdownMenuItem + PopoverTrigger merged into same leaf element),
    making this element both a menu item and a popover trigger; @select prevents menu from auto-closing on click.
  -->
  <Popover v-if="action.popConfirm" v-model:open="open">
    <PopoverTrigger as-child>
      <DropdownMenuItem
        as-child
        :class="itemClass"
        :disabled="action.disabled"
        @select="preventDefault"
      >
        <div>
          <VbenIcon v-if="action.icon" :icon="action.icon" class="size-4" />
          {{ action.text }}
        </div>
      </DropdownMenuItem>
    </PopoverTrigger>
    <PopoverContent
      class="z-popup w-60"
      side="left"
      @focus-outside="preventDefault"
      @open-auto-focus="preventDefault"
    >
      <div class="text-foreground mb-3">
        {{ action.popConfirm.title ?? $t('confirmTitle') }}
      </div>
      <div class="flex justify-end gap-2">
        <VbenButton size="sm" variant="outline" @click="onCancel">
          {{ action.popConfirm.cancelText ?? $t('cancel') }}
        </VbenButton>
        <VbenButton
          :variant="action.danger ? 'destructive' : 'default'"
          size="sm"
          @click="onConfirm"
        >
          {{ action.popConfirm.okText ?? $t('confirm') }}
        </VbenButton>
      </div>
    </PopoverContent>
  </Popover>

  <!-- Standard dropdown item -->
  <DropdownMenuItem
    v-else
    :class="itemClass"
    :disabled="action.disabled"
    @click="onClick"
  >
    <VbenIcon v-if="action.icon" :icon="action.icon" class="size-4" />
    {{ action.text }}
  </DropdownMenuItem>
</template>
