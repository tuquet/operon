/* oxlint-disable unicorn/no-nested-ternary */
import type { VxeGridProps as VxeTableGridProps } from 'vxe-table';

import type {
  ViewedRowOptions,
  ViewedRowPersistOptions,
  ViewedRowStorageAdapter,
} from './types';

import { isRef, shallowRef, toRaw, triggerRef, watch } from 'vue';

import { isBoolean, isFunction } from '@operon/utils';

import {
  IndexedDBDriver,
  LocalStorageDriver,
  StorageManager,
} from '@operon-core/shared/cache';

import { useDebounceFn } from '@vueuse/core';

const DEFAULT_VIEWED_CLASS = 'vxe-row--viewed';

// ========== Persistence Strategy ==========

/**
 * localStorage / sessionStorage adapter
 * Monolithic storage: key → [1, 2, 3]
 */
function createWebStorageAdapter(
  storageType: 'localStorage' | 'sessionStorage',
  key: string,
  ttl?: number,
): ViewedRowStorageAdapter {
  const manager = new StorageManager({
    driver: new LocalStorageDriver({ storageType }),
  });

  return {
    async getKeys() {
      const stored = await manager.getItem<Array<number | string>>(key);
      return stored ?? [];
    },
    async removeKeys() {
      await manager.removeItem(key);
    },
    async setKeys(keys) {
      await manager.setItem(key, keys, ttl);
    },
  };
}

/**
 * IndexedDB adapter
 * Individual entry storage: prefix:1 → { expiry, value: 1 }
 */
function createIndexedDBAdapter(
  opts: Extract<ViewedRowPersistOptions, { type: 'indexedDB' }>,
): ViewedRowStorageAdapter {
  const prefix = opts.key;
  const manager = new StorageManager({
    driver: new IndexedDBDriver({
      dbName: opts.dbName || 'viewed-table-db',
      dbVersion: opts.dbVersion || 1,
      storeName: opts.storeName || 'viewed-table-row',
    }),
    prefix,
  });

  return {
    async getKeys() {
      try {
        // Get all keys under prefix via StorageManager and read sequentially (auto-filters expired)
        const shortKeys = await manager.keys();

        const results: Array<number | string> = [];
        for (const shortKey of shortKeys) {
          const value = await manager.getItem<number | string>(shortKey);
          if (value !== null) {
            results.push(value);
          }
        }
        return results;
      } catch (error) {
        console.error('[viewedRow] indexedDB restore failed:', error);
        return [];
      }
    },
    async removeKeys() {
      try {
        await manager.clear();
      } catch (error) {
        console.error('[viewedRow] indexedDB clear failed:', error);
      }
    },
    async setKeys(keys) {
      try {
        const newKeySet = new Set(keys.map(String));
        // Fetch existing keys to avoid rewriting and resetting expiration
        const existingKeys = await manager.keys();
        const existingKeySet = new Set(existingKeys);

        // Only write newly added keys, preserving expiration on existing entries
        const toAdd = keys.filter((key) => !existingKeySet.has(String(key)));
        if (toAdd.length > 0) {
          await Promise.all(
            toAdd.map((key) => manager.setItem(String(key), key, opts.ttl)),
          );
        }

        // Clean up old keys not present in new set
        const toRemove = existingKeys.filter((k) => !newKeySet.has(k));
        if (toRemove.length > 0) {
          await Promise.all(toRemove.map((k) => manager.removeItem(k)));
        }
      } catch (error) {
        console.error('[viewedRow] indexedDB persist failed:', error);
      }
    },
  };
}

/**
 * Create storage adapter based on persist config
 */
function createStorageAdapter(
  persist?: string | ViewedRowPersistOptions,
): null | ViewedRowStorageAdapter {
  if (!persist) return null;

  // Shorthand mode: string → localStorage
  if (typeof persist === 'string') {
    return createWebStorageAdapter('localStorage', persist);
  }

  switch (persist.type) {
    case 'custom': {
      // Custom adapter: unwrap Vue reactive proxy
      return toRaw(persist.storage);
    }
    case 'indexedDB': {
      return createIndexedDBAdapter(persist);
    }
    case 'localStorage': {
      return createWebStorageAdapter('localStorage', persist.key, persist.ttl);
    }
    case 'memory': {
      return null;
    }
    case 'sessionStorage': {
      return createWebStorageAdapter(
        'sessionStorage',
        persist.key,
        persist.ttl,
      );
    }
    default: {
      return null;
    }
  }
}

// ========== maxSize Eviction ==========

/**
 * Enforce maxSize constraint: evict oldest inserted key (FIFO) when exceeded
 */
function enforceMaxSize(set: Set<number | string>, maxSize: number): void {
  if (maxSize > 0 && set.size > maxSize) {
    const iterator = set.values();
    while (set.size > maxSize) {
      const oldest = iterator.next().value;
      if (oldest !== undefined) {
        set.delete(oldest);
      }
    }
  }
}

// ========== Core Composable ==========

export function useViewedRow<T = any>(
  options: ViewedRowOptions<T> & { keyField: string },
) {
  // ========== Parse Persistence Config ==========
  const persistOpts: null | ViewedRowPersistOptions = options.persist
    ? typeof options.persist === 'string'
      ? { key: options.persist, type: 'localStorage' }
      : options.persist
    : null;

  const adapter = createStorageAdapter(options.persist);
  const maxSize = persistOpts?.maxSize ?? 100;

  // ========== Initialize Viewed Set ==========
  const viewedSet = shallowRef<Set<number | string>>(new Set());

  // ========== Persistence (Debounced) ==========
  function persistImmediate() {
    if (!adapter) return;
    adapter.setKeys([...viewedSet.value]).catch((error) => {
      console.error('[viewedRow] persist failed:', error);
    });
  }

  const persist = useDebounceFn(persistImmediate, 300);

  // ========== Restore from Storage ==========
  async function restoreFromStorage(): Promise<void> {
    if (!adapter) return;

    try {
      const stored = await adapter.getKeys();
      if (stored && stored.length > 0) {
        for (const key of stored) {
          viewedSet.value.add(key);
        }
        if (maxSize > 0) {
          enforceMaxSize(viewedSet.value, maxSize);
        }
        triggerRef(viewedSet);
      }
    } catch (error) {
      console.error('[viewedRow] restore failed:', error);
    }
  }

  // Restore storage first, then merge external viewedKeys to ensure viewedKeys are latest
  restoreFromStorage().then(() => {
    if (options.viewedKeys) {
      const keys = isRef(options.viewedKeys)
        ? options.viewedKeys.value
        : options.viewedKeys;
      updateViewedSet((set) => {
        let changed = false;
        for (const key of keys) {
          if (!set.has(key)) {
            set.add(key);
            changed = true;
          }
        }
        return changed;
      });
    }
  });

  // ========== Unified Entry to Update viewedSet ==========
  function updateViewedSet(updater: (set: Set<number | string>) => boolean) {
    const changed = updater(viewedSet.value);

    if (changed) {
      if (maxSize > 0) {
        enforceMaxSize(viewedSet.value, maxSize);
      }
      triggerRef(viewedSet);
      persist();
    }
  }

  // ========== Watch External viewedKeys Changes (if Ref) ==========
  if (isRef(options.viewedKeys)) {
    watch(options.viewedKeys, (newKeys) => {
      updateViewedSet((set) => {
        let changed = false;
        for (const key of newKeys) {
          if (!set.has(key)) {
            set.add(key);
            changed = true;
          }
        }
        return changed;
      });
    });
  }

  // ========== Mark Viewed ==========
  function markAsViewed(record: T) {
    const key = (record as Record<string, any>)[options.keyField] as
      | number
      | string;
    if (key === null || key === undefined) return;

    updateViewedSet((set) => {
      if (set.has(key)) return false;
      set.add(key);
      return true;
    });
  }

  function markKeysAsViewed(keys: Array<number | string>) {
    updateViewedSet((set) => {
      let changed = false;
      for (const key of keys) {
        if (!set.has(key)) {
          set.add(key);
          changed = true;
        }
      }
      return changed;
    });
  }

  // ========== Query ==========
  function isViewed(record: T): boolean {
    const key = (record as Record<string, any>)[options.keyField] as
      | number
      | string;
    return viewedSet.value.has(key);
  }

  // ========== Clear ==========
  function clearViewed() {
    const hadData = viewedSet.value.size > 0;
    viewedSet.value.clear();

    if (hadData) {
      triggerRef(viewedSet);
    }

    if (adapter) {
      adapter.removeKeys().catch((error) => {
        console.error('[viewedRow] clear persist failed:', error);
      });
    }
  }

  // ========== Remove Specified Keys ==========
  function removeKeys(keys: Array<number | string>) {
    updateViewedSet((set) => {
      let changed = false;
      for (const key of keys) {
        if (set.has(key)) {
          set.delete(key);
          changed = true;
        }
      }
      return changed;
    });
  }

  // ========== rowClassName Function ==========
  function getRowClassName(params: any): string {
    if (!isViewed(params.row)) return '';

    const { rowClassName } = options;
    if (rowClassName === undefined || rowClassName === null) {
      return DEFAULT_VIEWED_CLASS;
    }
    if (typeof rowClassName === 'string') {
      return rowClassName;
    }
    if (isFunction(rowClassName)) {
      return normalizeClassName(rowClassName(params));
    }
    return DEFAULT_VIEWED_CLASS;
  }

  // ========== rowStyle Function ==========
  function getRowStyle(params: any): any {
    if (!isViewed(params.row)) return undefined;

    const { rowStyle } = options;
    if (rowStyle === undefined || rowStyle === null) {
      return undefined;
    }
    if (isFunction(rowStyle)) {
      return rowStyle(params);
    }
    return rowStyle;
  }

  return {
    clearViewed,
    getRowClassName,
    getRowStyle,
    isViewed,
    markAsViewed,
    markKeysAsViewed,
    removeKeys,
    viewedSet,
  };
}

export type ViewedRowHelper<T = any> = ReturnType<typeof useViewedRow<T>>;

// ========== Utility Functions ==========

function normalizeClassName(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return '';
}

function mergeClassNames(...classNames: any[]): string {
  return classNames
    .map((c) => normalizeClassName(c))
    .filter(Boolean)
    .join(' ');
}

/**
 * Wrap columns to intercept CellOperation onClick and mark viewed based on actionCodes
 * Note: columns are fresh cloneDeep objects each time; no duplicate wrapping risk
 */
function wrapColumnsForViewedRow(
  columns: any[],
  actionCodes: string[],
  markAsViewed: (record: any) => void,
): any[] {
  return columns.map((column) => {
    if (!column || typeof column !== 'object') return column;

    const nextColumn = { ...column };

    if (nextColumn.cellRender?.name === 'CellOperation') {
      const cellRender = { ...nextColumn.cellRender };
      const attrs = { ...cellRender.attrs };
      const originalOnClick = attrs.onClick;

      attrs.onClick = (params: { code: string; row: any }) => {
        originalOnClick?.(params);
        if (actionCodes.includes(params.code)) {
          markAsViewed(params.row);
        }
      };

      cellRender.attrs = attrs;
      nextColumn.cellRender = cellRender;
    }

    if (Array.isArray(nextColumn.children)) {
      nextColumn.children = wrapColumnsForViewedRow(
        nextColumn.children,
        actionCodes,
        markAsViewed,
      );
    }

    return nextColumn;
  });
}

/**
 * Apply viewedRow config onto mergedOptions
 * Inject rowClassName, rowStyle, and column intercepts
 */
export function applyViewedRowOptions(
  mergedOptions: VxeTableGridProps,
  viewedRowConfig: boolean | ViewedRowOptions,
  helper: ReturnType<typeof useViewedRow>,
) {
  // Read rowClassName and rowStyle from latest config (supports runtime mutation)
  const viewedRowClassName = isBoolean(viewedRowConfig)
    ? undefined
    : viewedRowConfig.rowClassName;
  const viewedRowStyle = isBoolean(viewedRowConfig)
    ? undefined
    : viewedRowConfig.rowStyle;

  // Inject rowClassName
  const originalRowClassName = mergedOptions.rowClassName;
  mergedOptions.rowClassName = (params: any) => {
    if (!helper.isViewed(params.row)) {
      return normalizeClassName(
        isFunction(originalRowClassName)
          ? originalRowClassName(params)
          : originalRowClassName,
      );
    }

    let viewedClass: string;
    if (viewedRowClassName === undefined || viewedRowClassName === null) {
      viewedClass = DEFAULT_VIEWED_CLASS;
    } else if (typeof viewedRowClassName === 'string') {
      viewedClass = viewedRowClassName;
    } else if (isFunction(viewedRowClassName)) {
      viewedClass = normalizeClassName(viewedRowClassName(params));
    } else {
      viewedClass = DEFAULT_VIEWED_CLASS;
    }

    return mergeClassNames(
      isFunction(originalRowClassName)
        ? originalRowClassName(params)
        : originalRowClassName,
      viewedClass,
    );
  };

  // Inject rowStyle
  const originalRowStyle = mergedOptions.rowStyle;
  mergedOptions.rowStyle = (params: any) => {
    const originalStyle = isFunction(originalRowStyle)
      ? originalRowStyle(params)
      : originalRowStyle;

    if (!helper.isViewed(params.row)) {
      return originalStyle || undefined;
    }

    let viewedStyle: any;
    if (viewedRowStyle === undefined || viewedRowStyle === null) {
      viewedStyle = undefined;
    } else if (isFunction(viewedRowStyle)) {
      viewedStyle = viewedRowStyle(params);
    } else {
      viewedStyle = viewedRowStyle;
    }

    if (!viewedStyle && !originalStyle) return undefined;
    if (!originalStyle) return viewedStyle;
    if (!viewedStyle) return originalStyle;
    return { ...originalStyle, ...viewedStyle };
  };

  // Intercept CellOperation columns
  const actionCodes =
    !isBoolean(viewedRowConfig) && viewedRowConfig.actionCodes
      ? Array.isArray(viewedRowConfig.actionCodes)
        ? viewedRowConfig.actionCodes
        : [viewedRowConfig.actionCodes]
      : [];

  if (actionCodes.length > 0 && Array.isArray(mergedOptions.columns)) {
    mergedOptions.columns = wrapColumnsForViewedRow(
      mergedOptions.columns,
      actionCodes,
      helper.markAsViewed,
    );
  }
}
