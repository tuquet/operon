<script setup lang="ts">
import type { ListboxFilterProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { watch } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { Search } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { ListboxFilter, useForwardProps } from 'reka-ui';

import { useCommand } from './context';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<
  {
    class?: HTMLAttributes['class'];
    /** Optional external controlled value — syncs bidirectionally with filterState. */
    modelValue?: string;
  } & ListboxFilterProps
>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const delegatedProps = reactiveOmit(props, 'class', 'modelValue');

const forwardedProps = useForwardProps(delegatedProps);

const { filterState } = useCommand();

// When external modelValue prop changes, push into filterState
watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined && val !== filterState.search) {
      filterState.search = val;
    }
  },
  { immediate: true },
);

// When filterState changes (typed into input), emit update
watch(
  () => filterState.search,
  (val) => {
    if (props.modelValue !== undefined && val !== props.modelValue) {
      emit('update:modelValue', val);
    }
  },
);
</script>

<template>
  <div class="flex items-center border-b px-3" cmdk-input-wrapper>
    <Search class="mr-2 size-4 shrink-0 opacity-50" />
    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="filterState.search"
      auto-focus
      :class="
        cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
    />
  </div>
</template>
