<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="cn('w-full caption-bottom ', props.class)">
      <slot></slot>
    </table>
  </div>
</template>
