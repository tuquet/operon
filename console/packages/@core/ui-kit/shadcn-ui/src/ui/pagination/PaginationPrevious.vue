<script setup lang="ts">
import type { PaginationPrevProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ButtonVariants } from '../button';

import { cn } from '@operon-core/shared/utils';

import { ChevronLeft } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { PaginationPrev, useForwardProps } from 'reka-ui';

import { buttonVariants } from '../button';

const props = withDefaults(
  defineProps<
    PaginationPrevProps & {
      class?: HTMLAttributes['class'];
      size?: ButtonVariants['size'];
    }
  >(),
  {
    size: 'icon',
  },
);

const delegatedProps = reactiveOmit(props, 'class', 'size');
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <PaginationPrev
    data-slot="pagination-previous"
    :class="
      cn(
        !props.asChild && [buttonVariants({ variant: 'outline', size }), 'p-0'],
        props.class,
      )
    "
    v-bind="forwarded"
  >
    <slot>
      <ChevronLeft class="size-4" />
    </slot>
  </PaginationPrev>
</template>
