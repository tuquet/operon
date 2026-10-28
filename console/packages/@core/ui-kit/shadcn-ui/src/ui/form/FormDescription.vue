<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { useFormField } from './useFormField';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const { formDescriptionId } = useFormField();
</script>

<template>
  <p
    :id="formDescriptionId"
    data-slot="form-description"
    :class="cn('text-muted-foreground ', props.class)"
  >
    <slot></slot>
  </p>
</template>
