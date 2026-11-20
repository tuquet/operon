<script lang="ts" setup>
import { ChevronDown } from '@operon-core/icons';
import { cn } from '@operon-core/shared/utils';

const props = defineProps<{
  class?: string;
}>();

// Control arrow expand/collapse state
const collapsed = defineModel<boolean>({ default: false });
</script>

<template>
  <div
    :class="cn('vben-link inline-flex items-center', props.class)"
    @click="collapsed = !collapsed"
  >
    <slot :is-expanded="collapsed">
      {{ collapsed }}
      <!-- <span>{{ isExpanded ? 'Collapse' : 'Expand' }}</span> -->
    </slot>
    <div
      :class="{ 'rotate-180': !collapsed }"
      class="transition-transform duration-300"
    >
      <slot name="icon">
        <ChevronDown class="size-4" />
      </slot>
    </div>
  </div>
</template>
