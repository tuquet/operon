<script setup lang="ts">
import type { MenubarRootEmits, MenubarRootProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import { MenubarRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<
  MenubarRootProps & { class?: HTMLAttributes['class'] }
>();
const emits = defineEmits<MenubarRootEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <MenubarRoot
    data-slot="menubar"
    v-bind="forwarded"
    :class="cn('flex h-9 items-center gap-0.5', props.class)"
  >
    <slot></slot>
  </MenubarRoot>
</template>
