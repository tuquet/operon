<script setup lang="ts">
import type { NumberFieldDecrementProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { Minus } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { NumberFieldDecrement, useForwardProps } from 'reka-ui';

const props = defineProps<
  NumberFieldDecrementProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <NumberFieldDecrement
    data-slot="decrement"
    v-bind="forwarded"
    :class="
      cn(
        'absolute top-1 left-1 flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20',
        props.class,
      )
    "
  >
    <slot>
      <Minus class="size-4" />
    </slot>
  </NumberFieldDecrement>
</template>
