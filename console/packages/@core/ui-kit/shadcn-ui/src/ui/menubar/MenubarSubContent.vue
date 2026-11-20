<script setup lang="ts">
import type { MenubarSubContentEmits, MenubarSubContentProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import {
  MenubarPortal,
  MenubarSubContent,
  useForwardPropsEmits,
} from 'reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  MenubarSubContentProps & { class?: HTMLAttributes['class'] }
>();
const emits = defineEmits<MenubarSubContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <MenubarPortal>
    <MenubarSubContent
      data-slot="menubar-sub-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'z-popup bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg',
          props.class,
        )
      "
    >
      <slot></slot>
    </MenubarSubContent>
  </MenubarPortal>
</template>
