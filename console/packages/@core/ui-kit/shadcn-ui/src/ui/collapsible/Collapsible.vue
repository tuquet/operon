<script setup lang="ts">
import type { CollapsibleRootEmits, CollapsibleRootProps } from 'reka-ui';

import { CollapsibleRoot, useForwardPropsEmits } from 'reka-ui';

const props = withDefaults(defineProps<CollapsibleRootProps>(), {
  unmountOnHide: false,
});
const emits = defineEmits<CollapsibleRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <CollapsibleRoot
    v-slot="slotProps"
    data-slot="collapsible"
    v-bind="forwarded"
    :unmount-on-hide="props.unmountOnHide"
  >
    <slot v-bind="slotProps"></slot>
  </CollapsibleRoot>
</template>
