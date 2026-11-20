import type {
  IStorageDriver,
  StorageItem,
  StorageManagerOptions,
} from './types';

import { LocalStorageDriver } from './local-storage-driver';
import { MemoryStorageDriver } from './memory-storage-driver';

/**
 * Storage Manager (Strategy Pattern)
 * - Handles prefix (namespace isolation) at this layer
 * - Handles TTL (expiration) at this layer
 * - Driver layer handles only raw KV access
 */
class StorageManager {
  private driver: IStorageDriver;
  private prefix: string;

  constructor({ driver, prefix = '' }: StorageManagerOptions = {}) {
    this.driver = driver || this.createDefaultDriver();
    this.prefix = prefix;
    if (!this.prefix && this.driver instanceof LocalStorageDriver) {
      console.warn(
        '[StorageManager] empty prefix combined with LocalStorageDriver — clear()/keys() will affect every localStorage entry.',
      );
    }
  }

  /**
   * Clear all storage items with prefix
   */
  async clear(): Promise<void> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    const prefixedKeys = allKeys.filter((key) => key.startsWith(fullPrefix));
    await Promise.all(prefixedKeys.map((key) => this.driver.removeItem(key)));
  }

  /**
   * Clear all expired storage items
   */
  async clearExpiredItems(): Promise<void> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    const prefixedKeys = allKeys.filter((key) => key.startsWith(fullPrefix));

    for (const fullKey of prefixedKeys) {
      const raw = await this.driver.getItem<StorageItem<unknown>>(fullKey);
      if (raw && raw.expiry && Date.now() > raw.expiry) {
        await this.driver.removeItem(fullKey);
      }
    }
  }

  /**
   * Get storage item
   * @param key Key
   * @param defaultValue Fallback value when absent or expired
   * @returns Stored value, or defaultValue if expired
   */
  async getItem<T>(
    key: string,
    defaultValue: null | T = null,
  ): Promise<null | T> {
    const fullKey = this.getFullKey(key);
    const raw = await this.driver.getItem<StorageItem<T>>(fullKey);

    if (!raw) {
      return defaultValue;
    }

    // TTL check
    if (raw.expiry && Date.now() > raw.expiry) {
      await this.driver.removeItem(fullKey);
      return defaultValue;
    }

    return raw.value;
  }

  /**
   * Get all storage keys under current prefix (stripped of prefix)
   */
  async keys(): Promise<string[]> {
    const allKeys = await this.driver.keys();
    const fullPrefix = this.prefix ? `${this.prefix}-` : '';
    if (!fullPrefix) return allKeys;
    return allKeys
      .filter((key) => key.startsWith(fullPrefix))
      .map((key) => key.slice(fullPrefix.length));
  }

  /**
   * Remove storage item
   * @param key Key
   */
  async removeItem(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.driver.removeItem(fullKey);
  }

  /**
   * Set storage item
   * @param key Key
   * @param value Value
   * @param ttl Time-to-live in milliseconds
   */
  async setItem(key: string, value: unknown, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expiry = ttl ? Date.now() + ttl : undefined;
    const item: StorageItem<unknown> = { expiry, value };
    await this.driver.setItem(fullKey, item);
  }

  /**
   * Create default driver based on runtime environment:
   * - Browser environment (window.localStorage available) -> LocalStorageDriver
   * - SSR / Node environment -> MemoryStorageDriver
   */
  private createDefaultDriver(): IStorageDriver {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return new LocalStorageDriver();
      }
    } catch (error) {
      // localStorage access denied (e.g. Safari private mode)
      console.warn(
        'localStorage is not accessible, falling back to MemoryStorageDriver:',
        error,
      );
    }
    return new MemoryStorageDriver();
  }

  /**
   * Get full storage key with prefix
   * @param key Raw key
   * @returns Full key with prefix
   */
  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}-${key}` : key;
  }
}

export { StorageManager };
