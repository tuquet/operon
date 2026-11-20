<script setup lang="ts" generic="TData extends RowData">
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  VueTable,
} from '@tanstack/vue-table';

import type { DataTableFeatures } from './features';
import type { DataTableDensity } from './types';

import { computed, ref, watch } from 'vue';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { SearchX } from '@lucide/vue';
import { FlexRender, useTable } from '@tanstack/vue-table';

import DataTablePagination from './DataTablePagination.vue';
import { dataTableFeatures } from './features';
import { DATA_TABLE_DENSITY_CLASSES, getDataTableColumnMeta } from './types';

export interface DataTableProps<TData extends RowData> {
  autoResetPageIndex?: boolean;
  columnFilters?: ColumnFiltersState;
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  data: TData[];
  density?: DataTableDensity;
  emptyDescription?: string;
  emptyTitle?: string;
  enableRowSelection?:
    | ((row: Row<DataTableFeatures, TData>) => boolean)
    | boolean;
  initialColumnVisibility?: ColumnVisibilityState;
  initialPageSize?: number;
  interactiveRows?: boolean;
  loading?: boolean;
  manualFiltering?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  pageSizes?: number[];
  pagination?: PaginationState;
  rowCount?: number;
  rowKey?: ((row: TData, index: number) => string) | (keyof TData & string);
  skeletonRows?: number;
  sorting?: SortingState;
}

const props = withDefaults(defineProps<DataTableProps<TData>>(), {
  autoResetPageIndex: false,
  columnFilters: undefined,
  density: undefined,
  emptyDescription: 'No records match your current search or filter criteria.',
  emptyTitle: 'No matching records',
  enableRowSelection: false,
  initialColumnVisibility: () => ({}),
  initialPageSize: 10,
  interactiveRows: false,
  loading: false,
  manualFiltering: false,
  manualPagination: false,
  manualSorting: false,
  pageSizes: () => [10, 20, 30, 40, 50],
  pagination: undefined,
  rowCount: undefined,
  rowKey: undefined,
  skeletonRows: 5,
  sorting: undefined,
});

const emit = defineEmits<{
  resetFilters: [];
  rowClick: [row: TData];
  'update:columnFilters': [value: ColumnFiltersState];
  'update:density': [value: DataTableDensity];
  'update:pagination': [value: PaginationState];
  'update:sorting': [value: SortingState];
}>();

defineSlots<{
  empty?: (props: {
    resetFilters: () => void;
    table: VueTable<DataTableFeatures, TData>;
  }) => any;
  footer?: (props: {
    clearSelection: () => void;
    selectedRows: TData[];
    table: VueTable<DataTableFeatures, TData>;
  }) => any;
  header?: (props: { table: VueTable<DataTableFeatures, TData> }) => any;
  toolbar?: (props: {
    density: DataTableDensity;
    isFiltered: boolean;
    resetFilters: () => void;
    setDensity: (value: DataTableDensity) => void;
    table: VueTable<DataTableFeatures, TData>;
  }) => any;
}>();

const rowSelection = ref<RowSelectionState>({});
const internalDensity = ref<DataTableDensity>(props.density ?? 'normal');
const internalPagination = ref<PaginationState>({
  pageIndex: 0,
  pageSize: props.initialPageSize,
});
const internalSorting = ref<SortingState>([]);
const internalColumnFilters = ref<ColumnFiltersState>([]);

const activeDensity = computed<DataTableDensity>(() =>
  props.density === undefined ? internalDensity.value : props.density,
);

function setDensity(value: DataTableDensity) {
  internalDensity.value = value;
  emit('update:density', value);
}

const activePagination = computed<PaginationState>(() =>
  props.pagination === undefined ? internalPagination.value : props.pagination,
);

const activeSorting = computed<SortingState>(() =>
  props.sorting === undefined ? internalSorting.value : props.sorting,
);

const activeColumnFilters = computed<ColumnFiltersState>(() =>
  props.columnFilters === undefined
    ? internalColumnFilters.value
    : props.columnFilters,
);

function resolveRowId(row: TData, index: number): string {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row, index);
  }
  if (typeof props.rowKey === 'string') {
    const val = row[props.rowKey];
    if (val !== undefined && val !== null) return String(val);
  }
  if (row && typeof row === 'object' && 'id' in row) {
    const idVal = (row as Record<string, unknown>).id;
    if (idVal !== undefined && idVal !== null) return String(idVal);
  }
  return String(index);
}

// Prune stale selected IDs when client-side rows are removed
watch(
  () => props.data,
  (nextRows) => {
    if (props.manualPagination) return;
    const validIds = new Set(
      nextRows.map((row, idx) => resolveRowId(row, idx)),
    );
    let changed = false;
    const cleaned: RowSelectionState = {};
    for (const [id, selected] of Object.entries(rowSelection.value)) {
      if (selected && validIds.has(id)) {
        cleaned[id] = true;
      } else if (selected) {
        changed = true;
      }
    }
    if (changed) rowSelection.value = cleaned;
  },
);

const table = useTable({
  features: dataTableFeatures,
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  getRowId: (row: TData, index: number) => resolveRowId(row, index),
  get autoResetPageIndex() {
    return props.autoResetPageIndex;
  },
  get manualPagination() {
    return props.manualPagination;
  },
  get manualSorting() {
    return props.manualSorting;
  },
  get manualFiltering() {
    return props.manualFiltering;
  },
  get rowCount() {
    return props.rowCount;
  },
  get enableRowSelection() {
    return props.enableRowSelection;
  },
  initialState: {
    columnVisibility: props.initialColumnVisibility,
  },
  state: {
    get columnFilters() {
      return activeColumnFilters.value;
    },
    get pagination() {
      return activePagination.value;
    },
    get rowSelection() {
      return rowSelection.value;
    },
    get sorting() {
      return activeSorting.value;
    },
  },
  onColumnFiltersChange: (updater) => {
    const next =
      typeof updater === 'function'
        ? updater(activeColumnFilters.value)
        : updater;
    internalColumnFilters.value = next;
    emit('update:columnFilters', next);
  },
  onPaginationChange: (updater) => {
    const next =
      typeof updater === 'function' ? updater(activePagination.value) : updater;
    internalPagination.value = next;
    emit('update:pagination', next);
  },
  onRowSelectionChange: (updater) => {
    rowSelection.value =
      typeof updater === 'function' ? updater(rowSelection.value) : updater;
  },
  onSortingChange: (updater) => {
    const next =
      typeof updater === 'function' ? updater(activeSorting.value) : updater;
    internalSorting.value = next;
    emit('update:sorting', next);
  },
});

const selectedRows = computed(() =>
  table.getFilteredSelectedRowModel().rows.map((row) => row.original),
);

const isFiltered = computed(() => activeColumnFilters.value.length > 0);

const loadingRowCount = computed(() =>
  Math.max(1, Math.min(props.skeletonRows, activePagination.value.pageSize)),
);

function clearSelection() {
  rowSelection.value = {};
}

function resetFilters() {
  table.resetColumnFilters();
  emit('resetFilters');
}

defineExpose({
  clearSelection,
  resetFilters,
  selectedRows,
  table,
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3.5">
    <slot name="header" :table="table"></slot>

    <slot
      name="toolbar"
      :table="table"
      :density="activeDensity"
      :set-density="setDensity"
      :is-filtered="isFiltered"
      :reset-filters="resetFilters"
    ></slot>

    <div
      class="bg-card border-border min-h-0 flex-1 overflow-auto rounded-lg border shadow-2xs"
    >
      <Table>
        <TableHeader class="bg-muted/35">
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="hover:bg-transparent"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="
                cn(
                  'h-9 text-xs',
                  getDataTableColumnMeta(header.column.columnDef.meta)?.class,
                )
              "
            >
              <FlexRender v-if="!header.isPlaceholder" :header="header" />
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody
          :class="
            cn(
              loading &&
                table.getRowModel().rows?.length &&
                'opacity-60 transition-opacity',
            )
          "
        >
          <template v-if="loading && !table.getRowModel().rows?.length">
            <TableRow
              v-for="rowIdx in loadingRowCount"
              :key="`skeleton-${rowIdx}`"
              class="hover:bg-transparent"
            >
              <TableCell
                v-for="col in table.getVisibleLeafColumns()"
                :key="col.id"
                :class="
                  cn(
                    DATA_TABLE_DENSITY_CLASSES[activeDensity],
                    getDataTableColumnMeta(col.columnDef.meta)?.class,
                  )
                "
              >
                <Skeleton class="h-4 w-full" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() && 'selected'"
              :class="
                cn(
                  'group/row transition-colors',
                  interactiveRows && 'cursor-pointer',
                )
              "
              @click="interactiveRows && emit('rowClick', row.original)"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :class="
                  cn(
                    DATA_TABLE_DENSITY_CLASSES[activeDensity],
                    getDataTableColumnMeta(cell.column.columnDef.meta)?.class,
                  )
                "
              >
                <FlexRender :cell="cell" />
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-else class="hover:bg-transparent">
            <TableCell
              :colspan="Math.max(1, table.getVisibleLeafColumns().length)"
              class="p-0"
            >
              <slot name="empty" :table="table" :reset-filters="resetFilters">
                <Empty class="min-h-[240px]">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchX class="text-muted-foreground size-5" />
                    </EmptyMedia>
                    <EmptyTitle>{{ emptyTitle }}</EmptyTitle>
                    <EmptyDescription>
                      {{ emptyDescription }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    v-if="isFiltered"
                    variant="outline"
                    size="sm"
                    class="mt-4"
                    @click="resetFilters"
                  >
                    Clear all filters
                  </Button>
                </Empty>
              </slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DataTablePagination
      :table="table"
      :page-sizes="pageSizes"
      :selectable="Boolean(enableRowSelection)"
    />

    <slot
      name="footer"
      :table="table"
      :selected-rows="selectedRows"
      :clear-selection="clearSelection"
    ></slot>
  </div>
</template>
