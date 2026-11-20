<script setup lang="ts">
import type { AlertDialogCancelProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ButtonVariants } from '../button';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { AlertDialogCancel } from 'reka-ui';

import { buttonVariants } from '../button';

const props = withDefaults(
  defineProps<
    AlertDialogCancelProps & {
      class?: HTMLAttributes['class'];
      size?: ButtonVariants['size'];
      variant?: ButtonVariants['variant'];
    }
  >(),
  {
    variant: 'outline',
  },
);

const delegatedProps = reactiveOmit(props, 'class', 'size', 'variant');
</script>

<template>
  <AlertDialogCancel
    data-slot="alert-dialog-cancel"
    v-bind="delegatedProps"
    :class="
      cn(
        !props.asChild && [buttonVariants({ variant, size }), 'mt-2 sm:mt-0'],
        props.class,
      )
    "
  >
    <slot></slot>
  </AlertDialogCancel>
</template>
