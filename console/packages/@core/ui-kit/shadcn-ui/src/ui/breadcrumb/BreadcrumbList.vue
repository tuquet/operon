<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <ol
    data-slot="breadcrumb-list"
    :class="
      cn(
        'text-muted-foreground flex flex-wrap items-center text-sm break-words',
        props.class,
      )
    "
  >
    <slot></slot>
  </ol>
</template>
