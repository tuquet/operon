<script setup lang="ts" generic="TData extends RowData">
import type { RowData, VueTable } from '@tanstack/vue-table';

import type { DataTableFeatures } from './features';

import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@operon-core/shadcn-ui';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@lucide/vue';

interface DataTablePaginationProps {
  pageSizes?: number[];
  selectable?: boolean;
  table: VueTable<DataTableFeatures, TData>;
}

withDefaults(defineProps<DataTablePaginationProps>(), {
  pageSizes: () => [10, 20, 30, 40, 50],
  selectable: true,
});
</script>

<template>
  <div
    class="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="text-muted-foreground flex-1 text-xs">
      <template v-if="selectable">
        <span class="text-foreground font-mono font-medium">
          {{ table.getFilteredSelectedRowModel().rows.length }}
        </span>
        of
        <span class="text-foreground font-mono font-medium">
          {{ table.getRowCount() }}
        </span>
        row(s) selected.
      </template>
      <template v-else>
        <span class="text-foreground font-mono font-medium">
          {{ table.getRowCount() }}
        </span>
        total row(s).
      </template>
    </div>

    <div class="flex flex-wrap items-center gap-4 lg:gap-6">
      <div class="flex items-center gap-2">
        <p class="text-muted-foreground text-xs font-medium">Rows per page</p>
        <Select
          :model-value="`${table.atoms.pagination.get().pageSize}`"
          @update:model-value="(val) => table.setPageSize(Number(val))"
        >
          <SelectTrigger class="h-8 w-[70px] font-mono text-xs">
            <SelectValue
              :placeholder="`${table.atoms.pagination.get().pageSize}`"
            />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectGroup>
              <SelectItem
                v-for="pageSize in pageSizes"
                :key="pageSize"
                :value="`${pageSize}`"
                class="font-mono text-xs"
              >
                {{ pageSize }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div
        class="flex min-w-[96px] items-center justify-center font-mono text-xs font-medium"
      >
        Page {{ table.atoms.pagination.get().pageIndex + 1 }} of
        {{ Math.max(1, table.getPageCount()) }}
      </div>

      <div class="flex items-center gap-1.5">
        <Button
          variant="outline"
          class="hidden size-8 p-0 lg:flex"
          :disabled="!table.getCanPreviousPage()"
          @click="table.setPageIndex(0)"
        >
          <span class="sr-only">Go to first page</span>
          <ChevronsLeft class="size-4" />
        </Button>
        <Button
          variant="outline"
          class="size-8 p-0"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          <span class="sr-only">Go to previous page</span>
          <ChevronLeft class="size-4" />
        </Button>
        <Button
          variant="outline"
          class="size-8 p-0"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          <span class="sr-only">Go to next page</span>
          <ChevronRight class="size-4" />
        </Button>
        <Button
          variant="outline"
          class="hidden size-8 p-0 lg:flex"
          :disabled="!table.getCanNextPage()"
          @click="table.setPageIndex(table.getPageCount() - 1)"
        >
          <span class="sr-only">Go to last page</span>
          <ChevronsRight class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
