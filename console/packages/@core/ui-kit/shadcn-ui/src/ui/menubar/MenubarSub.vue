<script setup lang="ts">
import type { MenubarSubProps } from 'reka-ui';

import { MenubarSub } from 'reka-ui';

const props = defineProps<MenubarSubProps>();
</script>

<template>
  <MenubarSub v-bind="props">
    <slot></slot>
  </MenubarSub>
</template>
