<script setup lang="ts">
import type { PaginationLastProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ButtonVariants } from '../button';

import { cn } from '@operon-core/shared/utils';

import { ChevronsRight } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { PaginationLast, useForwardProps } from 'reka-ui';

import { buttonVariants } from '../button';

const props = withDefaults(
  defineProps<
    PaginationLastProps & {
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
  <PaginationLast
    data-slot="pagination-last"
    :class="
      cn(
        !props.asChild && [buttonVariants({ variant: 'outline', size }), 'p-0'],
        props.class,
      )
    "
    v-bind="forwarded"
  >
    <slot>
      <ChevronsRight class="size-4" />
    </slot>
  </PaginationLast>
</template>
