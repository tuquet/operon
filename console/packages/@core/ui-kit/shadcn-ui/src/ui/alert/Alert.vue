<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import type { AlertVariants } from './alert';

import { cn } from '@operon-core/shared/utils';

import { alertVariants } from './alert';

const props = defineProps<{
  class?: HTMLAttributes['class'];
  variant?: AlertVariants['variant'];
}>();
</script>

<template>
  <div :class="cn(alertVariants({ variant }), props.class)" role="alert">
    <slot></slot>
  </div>
</template>
