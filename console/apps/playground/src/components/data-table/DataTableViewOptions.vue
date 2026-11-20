<script setup lang="ts" generic="TData extends RowData">
import type { RowData, VueTable } from '@tanstack/vue-table';

import type { DataTableFeatures } from './features';

import { computed } from 'vue';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@operon-core/shadcn-ui';

import { Settings2 } from '@lucide/vue';

import { getDataTableColumnMeta } from './types';

interface DataTableViewOptionsProps {
  table: VueTable<DataTableFeatures, TData>;
}

const props = defineProps<DataTableViewOptionsProps>();

const hideableColumns = computed(() =>
  props.table
    .getAllColumns()
    .filter((column) => column.accessorFn !== undefined && column.getCanHide()),
);

function getColumnLabel(
  column: (typeof hideableColumns.value)[number],
): string {
  return getDataTableColumnMeta(column.columnDef.meta)?.label ?? column.id;
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="text-muted-foreground hover:text-foreground hidden h-8 text-xs font-normal lg:flex"
      >
        <Settings2 class="mr-1.5 size-3.5 opacity-70" />
        Columns
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[160px]">
      <DropdownMenuLabel class="text-xs">Toggle columns</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          v-for="column in hideableColumns"
          :key="column.id"
          class="capitalize"
          :model-value="column.getIsVisible()"
          @update:model-value="(value) => column.toggleVisibility(!!value)"
        >
          {{ getColumnLabel(column) }}
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
