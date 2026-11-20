<script setup lang="ts">
import type { MenubarContentProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { MenubarContent, MenubarPortal } from 'reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  MenubarContentProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <MenubarPortal>
    <MenubarContent
      data-slot="menubar-content"
      v-bind="{ ...$attrs, ...delegatedProps }"
      :align="align ?? 'start'"
      :class="
        cn(
          'z-popup bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md',
          props.class,
        )
      "
    >
      <slot></slot>
    </MenubarContent>
  </MenubarPortal>
</template>
