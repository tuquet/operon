<script setup lang="ts">
import type {
  PopoverContentProps,
  PopoverRootEmits,
  PopoverRootProps,
} from 'reka-ui';

import type { ClassType } from '@operon-core/typings';

import { computed } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { useForwardPropsEmits } from 'reka-ui';

import {
  PopoverContent,
  Popover as PopoverRoot,
  PopoverTrigger,
} from '../../ui';

interface Props extends PopoverRootProps {
  class?: ClassType;
  contentClass?: ClassType;
  contentProps?: PopoverContentProps;
  triggerClass?: ClassType;
}

const props = withDefaults(defineProps<Props>(), {});

const emits = defineEmits<PopoverRootEmits>();

const delegatedProps = computed(() => {
  const {
    class: _cls,
    contentClass: _,
    contentProps: _cProps,
    triggerClass: _tClass,
    ...delegated
  } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <PopoverRoot v-bind="forwarded">
    <PopoverTrigger as="span" :class="triggerClass">
      <slot name="trigger"></slot>

      <PopoverContent
        :class="cn('side-content z-popup', contentClass)"
        v-bind="contentProps"
      >
        <slot></slot>
      </PopoverContent>
    </PopoverTrigger>
  </PopoverRoot>
</template>
