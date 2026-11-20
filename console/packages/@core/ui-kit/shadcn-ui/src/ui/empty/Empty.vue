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
        'flex min-h-[300px] flex-col items-center justify-center p-8 text-center animate-in fade-in-50',
        props.class,
      )
    "
  >
    <slot></slot>
  </div>
</template>
