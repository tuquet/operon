<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ButtonVariants } from '../button';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { AlertDialogAction } from 'reka-ui';

import { buttonVariants } from '../button';

const props = defineProps<
  AlertDialogActionProps & {
    class?: HTMLAttributes['class'];
    size?: ButtonVariants['size'];
    variant?: ButtonVariants['variant'];
  }
>();

const delegatedProps = reactiveOmit(props, 'class', 'size', 'variant');
</script>

<template>
  <AlertDialogAction
    data-slot="alert-dialog-action"
    v-bind="delegatedProps"
    :class="
      cn(!props.asChild && buttonVariants({ variant, size }), props.class)
    "
  >
    <slot></slot>
  </AlertDialogAction>
</template>
