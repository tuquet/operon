<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { ToggleGroup, ToggleGroupItem } from '@operon-core/shadcn-ui';

defineOptions({
  name: 'PreferenceToggleItem',
});

withDefaults(defineProps<{ disabled?: boolean; items?: SelectOption[] }>(), {
  disabled: false,
  items: () => [],
});

const modelValue = defineModel<string | undefined>({ default: undefined });
</script>

<template>
  <div
    :class="{
      'pointer-events-none opacity-50': disabled,
    }"
    class="flex w-full items-center justify-between rounded-md p-2"
  >
    <span>
      <slot></slot>
    </span>
    <ToggleGroup
      v-model="modelValue"
      :disabled="disabled"
      size="sm"
      type="single"
      variant="outline"
    >
      <template v-for="item in items" :key="item.value">
        <ToggleGroupItem :value="item.value">
          {{ item.label }}
        </ToggleGroupItem>
      </template>
    </ToggleGroup>
  </div>
</template>
