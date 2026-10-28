<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <h5 :class="cn('mb-1  leading-none tracking-tight', props.class)">
    <slot></slot>
  </h5>
</template>
