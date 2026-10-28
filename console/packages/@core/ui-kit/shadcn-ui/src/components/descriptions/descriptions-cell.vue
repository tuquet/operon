<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { DescriptionsRenderNode, DescriptionsSize } from './types';

import { computed } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { VbenRenderContent } from '../render-content';

interface Props {
  /** Whether border mode */
  bordered?: boolean;
  /** Whether to show colon (only effective in non-border mode) */
  colon?: boolean;
  /** Content */
  content?: DescriptionsRenderNode | null;
  /** Content style */
  contentStyle?: CSSProperties;
  /** Single item custom class name */
  itemClass?: string;
  /** Label */
  label?: DescriptionsRenderNode | null;
  /** Label style */
  labelStyle?: CSSProperties;
  /** Size */
  size?: DescriptionsSize;
  /** Span count */
  span?: number;
  /** Whether to render th or td */
  tag: 'td' | 'th';
  /** Cell type */
  type: 'content' | 'item' | 'label';
}

const props = withDefaults(defineProps<Props>(), {
  bordered: false,
  colon: true,
  content: null,
  contentStyle: undefined,
  itemClass: undefined,
  label: null,
  labelStyle: undefined,
  size: 'middle',
  span: 1,
});

const BORDERED_PADDING: Record<DescriptionsSize, string> = {
  large: 'px-6 py-4',
  middle: 'px-4 py-2.5',
  small: 'px-3 py-2',
};

const PLAIN_PADDING: Record<DescriptionsSize, string> = {
  large: 'pb-6',
  middle: 'pb-4',
  small: 'pb-2',
};

// Colon appended via pseudo-element to avoid concatenation issues when label is render function
const COLON_CLASS = "after:content-[':']";

const hasLabel = computed(
  () => props.label !== null && props.label !== undefined,
);
const hasContent = computed(
  () => props.content !== null && props.content !== undefined,
);

// Number 0 is treated as falsy by VbenRenderContent; convert to string to ensure display;
// also normalize null to undefined to match VbenRenderContent content type
const displayLabel = computed(() => {
  if (props.label === null || props.label === undefined) return undefined;
  return typeof props.label === 'number' ? String(props.label) : props.label;
});
const displayContent = computed(() => {
  if (props.content === null || props.content === undefined) return undefined;
  return typeof props.content === 'number'
    ? String(props.content)
    : props.content;
});

const cellClass = computed(() => {
  if (props.bordered) {
    return cn(
      'border border-border align-top break-words',
      BORDERED_PADDING[props.size],
      props.type === 'label'
        ? 'bg-muted/50 text-start  text-foreground'
        : 'text-foreground',
      props.itemClass,
    );
  }
  return cn('align-top', PLAIN_PADDING[props.size], props.itemClass);
});

const labelClass = computed(() =>
  cn('mr-2 shrink-0 text-muted-foreground', props.colon && COLON_CLASS),
);
</script>

<template>
  <component :is="tag" :class="cellClass" :colspan="span">
    <!-- Bordered mode: each cell hosts only label or content -->
    <template v-if="bordered">
      <span v-if="hasLabel" :style="labelStyle">
        <VbenRenderContent :content="displayLabel" />
      </span>
      <span v-if="hasContent" :style="contentStyle">
        <VbenRenderContent :content="displayContent" />
      </span>
    </template>

    <!-- Non-bordered mode: label + content container -->
    <div v-else class="flex">
      <span v-if="hasLabel" :class="labelClass" :style="labelStyle">
        <VbenRenderContent :content="displayLabel" />
      </span>
      <span
        v-if="hasContent"
        class="break-words text-foreground"
        :style="contentStyle"
      >
        <VbenRenderContent :content="displayContent" />
      </span>
    </div>
  </component>
</template>
