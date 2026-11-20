<script setup lang="ts">
import type { MenubarSeparatorProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { MenubarSeparator } from 'reka-ui';

const props = defineProps<
  MenubarSeparatorProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <MenubarSeparator
    data-slot="menubar-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>
