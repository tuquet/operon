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
        'relative has-[[data-slot=decrement]]:[&>[data-slot=input]]:pl-9 has-[[data-slot=increment]]:[&>[data-slot=input]]:pr-9',
        props.class,
      )
    "
  >
    <slot></slot>
  </div>
</template>
