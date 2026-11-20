<script lang="ts" setup>
import { VbenSpinner } from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

interface SpinnerProps {
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
}
defineOptions({ name: 'Spinner' });
const props = defineProps<SpinnerProps>();
</script>
<template>
  <div :class="cn('relative min-h-20', props.class)">
    <slot></slot>
    <VbenSpinner
      :min-loading-time="props.minLoadingTime"
      :spinning="props.spinning"
    />
  </div>
</template>
