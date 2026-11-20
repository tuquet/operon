<script setup lang="ts">
import type { MenubarTriggerProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { MenubarTrigger } from 'reka-ui';

const props = defineProps<
  MenubarTriggerProps & { class?: HTMLAttributes['class'] }
>();
</script>

<template>
  <MenubarTrigger
    data-slot="menubar-trigger"
    v-bind="props"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2.5 py-1 text-sm font-medium outline-hidden',
        props.class,
      )
    "
  >
    <slot></slot>
  </MenubarTrigger>
</template>
