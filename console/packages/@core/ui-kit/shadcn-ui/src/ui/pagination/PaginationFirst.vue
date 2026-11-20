<script setup lang="ts">
import type { PaginationFirstProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ButtonVariants } from '../button';

import { cn } from '@operon-core/shared/utils';

import { ChevronsLeft } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { PaginationFirst, useForwardProps } from 'reka-ui';

import { buttonVariants } from '../button';

const props = withDefaults(
  defineProps<
    PaginationFirstProps & {
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
  <PaginationFirst
    data-slot="pagination-first"
    :class="
      cn(
        !props.asChild && [buttonVariants({ variant: 'outline', size }), 'p-0'],
        props.class,
      )
    "
    v-bind="forwarded"
  >
    <slot>
      <ChevronsLeft class="size-4" />
    </slot>
  </PaginationFirst>
</template>
