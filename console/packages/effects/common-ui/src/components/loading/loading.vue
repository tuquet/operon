<script lang="ts" setup>
import { VbenLoading } from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

interface LoadingProps {
  class?: string;
  /**
   * Minimum loading duration
   * @en_US Minimum loading time
   */
  minLoadingTime?: number;

  /**
   * Loading active state
   */
  spinning?: boolean;
  /**
   * Text label
   */
  text?: string;
}

defineOptions({ name: 'Loading' });
const props = defineProps<LoadingProps>();
</script>
<template>
  <div :class="cn('relative min-h-20', props.class)">
    <slot></slot>
    <VbenLoading
      :min-loading-time="props.minLoadingTime"
      :spinning="props.spinning"
      :text="props.text"
    >
      <template v-if="$slots.icon" #icon>
        <slot name="icon"></slot>
      </template>
    </VbenLoading>
  </div>
</template>
