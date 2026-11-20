<script setup lang="ts">
import type { DataTableDensity } from './types';

import {
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@operon-core/shadcn-ui';

import { AlignJustify, List, Rows3 } from '@lucide/vue';

defineProps<{
  modelValue: DataTableDensity;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DataTableDensity];
}>();
</script>

<template>
  <TooltipProvider :delay-duration="150">
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      :model-value="modelValue"
      class="hidden sm:flex"
      @update:model-value="
        (val) => val && emit('update:modelValue', val as DataTableDensity)
      "
    >
      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleGroupItem
            value="compact"
            aria-label="Compact rows"
            class="h-8 px-2"
          >
            <AlignJustify class="size-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Compact density</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleGroupItem
            value="normal"
            aria-label="Default rows"
            class="h-8 px-2"
          >
            <List class="size-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Default density</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleGroupItem
            value="comfortable"
            aria-label="Comfortable rows"
            class="h-8 px-2"
          >
            <Rows3 class="size-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Comfortable density</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  </TooltipProvider>
</template>
