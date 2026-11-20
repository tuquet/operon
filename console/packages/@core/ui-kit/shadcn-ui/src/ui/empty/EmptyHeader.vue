<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    :class="cn('flex flex-col items-center gap-1.5 text-center', props.class)"
  >
    <slot></slot>
  </div>
</template>
