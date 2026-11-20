<script setup lang="ts">
import { Pin, PinOff } from '@operon-core/icons';
import { VbenButton } from '@operon-core/shadcn-ui';

const expandOnHover = defineModel<boolean>('expandOnHover');
const expandOnHovering = defineModel<boolean>('expandOnHovering');
const collapse = defineModel<boolean>('collapse');

function toggleFixed() {
  expandOnHover.value = !expandOnHover.value;
  collapse.value = false;
  if (!expandOnHover.value) {
    expandOnHovering.value = true;
  }
}
</script>

<template>
  <VbenButton
    type="button"
    variant="ghost"
    size="icon"
    :aria-label="expandOnHover ? 'Pin sidebar' : 'Unpin sidebar'"
    :title="expandOnHover ? 'Pin sidebar' : 'Unpin sidebar'"
    :aria-pressed="!expandOnHover"
    class="flex-center size-8 shrink-0 rounded-md text-muted-foreground"
    @click="toggleFixed"
  >
    <PinOff v-show="!expandOnHover" class="size-4" />
    <Pin v-show="expandOnHover" class="size-4" />
  </VbenButton>
</template>
