<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { computed } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { Primitive } from 'reka-ui';

import { useCommand } from './context';

const props = defineProps<
  PrimitiveProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');

const { filterState } = useCommand();
const isRender = computed(
  () => !!filterState.search && filterState.filtered.count === 0,
);
</script>

<template>
  <Primitive
    v-if="isRender"
    v-bind="delegatedProps"
    :class="cn('py-6 text-center text-sm', props.class)"
  >
    <slot></slot>
  </Primitive>
</template>
