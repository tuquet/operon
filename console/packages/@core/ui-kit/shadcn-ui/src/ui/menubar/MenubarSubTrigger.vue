<script setup lang="ts">
import type { MenubarSubTriggerProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { ChevronRight } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { MenubarSubTrigger } from 'reka-ui';

const props = defineProps<
  MenubarSubTriggerProps & {
    class?: HTMLAttributes['class'];
    inset?: boolean;
  }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <MenubarSubTrigger
    data-slot="menubar-sub-trigger"
    :data-inset="inset ? '' : undefined"
    v-bind="delegatedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot></slot>
    <ChevronRight class="ml-auto size-4" />
  </MenubarSubTrigger>
</template>
