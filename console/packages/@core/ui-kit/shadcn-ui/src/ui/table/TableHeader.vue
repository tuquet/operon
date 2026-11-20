<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <thead :class="cn('[&_tr]:border-b', props.class)">
    <slot></slot>
  </thead>
</template>
