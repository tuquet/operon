/**
 * Storage driver interface (strategy pattern abstraction)
 * Implemented by all storage drivers (localStorage, IndexedDB, Memory, etc.)
 * Driver layer handles raw KV storage without awareness of TTL or prefixes
 */
interface IStorageDriver {
  /** Clear all storage items */
  clear(): Promise<void>;

  /** Get storage item */
  getItem<T>(key: string): Promise<null | T>;

  /** Get all keys */
  keys(): Promise<string[]>;

  /** Remove storage item */
  removeItem(key: string): Promise<void>;

  /** Set storage item */
  setItem(key: string, value: unknown): Promise<void>;
}

/**
 * Storage item wrapper with TTL metadata
 * TTL logic is managed by StorageManager; Driver layer does not inspect it
 */
interface StorageItem<T> {
  expiry?: number;
  value: T;
}

interface StorageManagerOptions {
  /** Storage driver instance */
  driver?: IStorageDriver;
  /** Key prefix for namespace isolation */
  prefix?: string;
}

export type { IStorageDriver, StorageItem, StorageManagerOptions };
