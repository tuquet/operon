import type { Component } from 'vue';

export type DataTableDensity = 'comfortable' | 'compact' | 'normal';

export const DATA_TABLE_DENSITY_CLASSES: Record<DataTableDensity, string> = {
  compact: 'py-1.5',
  normal: 'py-2.5',
  comfortable: 'py-3.5',
};

export interface DataTableColumnMeta {
  class?: string;
  label?: string;
}

export interface DataTableFacetOption {
  icon?: Component;
  label: string;
  value: string;
}

export interface DataTableSortableColumn {
  getCanHide: () => boolean;
  getCanSort: () => boolean;
  getIsSorted: () => 'asc' | 'desc' | false;
  toggleSorting: (desc?: boolean, isMulti?: boolean) => void;
  toggleVisibility: (value?: boolean) => void;
}

export function getDataTableColumnMeta(
  meta: unknown,
): DataTableColumnMeta | undefined {
  return meta && typeof meta === 'object'
    ? (meta as DataTableColumnMeta)
    : undefined;
}
