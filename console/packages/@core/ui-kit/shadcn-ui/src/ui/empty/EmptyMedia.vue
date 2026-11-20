<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    :class="
      cn(
        'mb-2 flex items-center justify-center text-muted-foreground',
        props.class,
      )
    "
  >
    <slot></slot>
  </div>
</template>
