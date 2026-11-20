<script lang="ts">
import type { PropType } from 'vue';

import type { DescriptionsItemSpan, DescriptionsRenderNode } from './types';

import { defineComponent } from 'vue';

import { DESCRIPTIONS_ITEM_NAME } from './use-descriptions';

/**
 * Marker component for child node usage, does not render content directly.
 * Its props and default slot are collected as items by parent VbenDescriptions.
 */
const VbenDescriptionsItem = defineComponent({
  name: DESCRIPTIONS_ITEM_NAME,
  props: {
    content: {
      default: undefined,
      type: [
        String,
        Number,
        Function,
        Object,
      ] as PropType<DescriptionsRenderNode>,
    },
    contentStyle: {
      default: undefined,
      type: Object,
    },
    label: {
      default: undefined,
      type: [
        String,
        Number,
        Function,
        Object,
      ] as PropType<DescriptionsRenderNode>,
    },
    labelStyle: {
      default: undefined,
      type: Object,
    },
    span: {
      default: undefined,
      type: [Number, String, Object] as PropType<DescriptionsItemSpan>,
    },
  },
  setup() {
    return () => null;
  },
});

// Extra marker for robust identification in vnodes
(VbenDescriptionsItem as Record<string, any>).__isDescriptionsItem = true;

export default VbenDescriptionsItem;
</script>
