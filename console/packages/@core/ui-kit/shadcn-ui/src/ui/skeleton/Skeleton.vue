<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

interface SkeletonProps {
  class?: HTMLAttributes['class'];
}

const props = defineProps<SkeletonProps>();
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', props.class)"></div>
</template>
