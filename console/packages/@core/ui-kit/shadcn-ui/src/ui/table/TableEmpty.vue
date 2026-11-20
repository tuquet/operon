<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@operon-core/shared/utils';

import TableCell from './TableCell.vue';
import TableRow from './TableRow.vue';

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class'];
    colspan?: number;
  }>(),
  {
    colspan: 1,
  },
);
</script>

<template>
  <TableRow
    data-slot="table-empty"
    :class="
      cn(
        'text-foreground hover:bg-transparent whitespace-nowrap align-middle text-sm',
        props.class,
      )
    "
  >
    <TableCell :colspan="props.colspan" class="p-4 align-middle">
      <div class="flex items-center justify-center py-10">
        <slot></slot>
      </div>
    </TableCell>
  </TableRow>
</template>
