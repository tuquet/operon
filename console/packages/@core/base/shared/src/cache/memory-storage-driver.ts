import type { IStorageDriver } from './types';

/**
 * In-memory storage driver
 * Suitable for test environments and SSR without persistence
 */
class MemoryStorageDriver implements IStorageDriver {
  private store = new Map<string, unknown>();

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getItem<T>(key: string): Promise<null | T> {
    const value = this.store.get(key);
    return (value as T) ?? null;
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async setItem(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

export { MemoryStorageDriver };
