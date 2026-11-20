<script setup lang="ts">
import type { CustomRenderType } from '../types';

import { useForwardExpose } from '@operon-core/composables';
import {
  FormLabel,
  VbenHelpTooltip,
  VbenRenderContent,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

interface Props {
  class?: string;
  colon?: boolean;
  help?: CustomRenderType;
  label?: CustomRenderType;
  required?: boolean;
}

const props = defineProps<Props>();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <FormLabel :ref="forwardRef" :class="cn('flex items-center', props.class)">
    <span v-if="required" class="mr-1 text-destructive">*</span>
    <slot></slot>
    <VbenHelpTooltip v-if="help" trigger-class="size-3.5 ml-1">
      <VbenRenderContent :content="help" />
    </VbenHelpTooltip>
    <slot name="extra"></slot>
    <span v-if="colon && label" class="ml-0.5 mr-1">:</span>
  </FormLabel>
</template>
