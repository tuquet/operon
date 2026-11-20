<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <h4
    :class="
      cn('text-base font-semibold tracking-tight text-foreground', props.class)
    "
  >
    <slot></slot>
  </h4>
</template>
