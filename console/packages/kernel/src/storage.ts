/**
 * Scoped Storage & Pinia PersistedState Helper for Operon Micro-Apps.
 * Ensures strict key namespacing across multiple micro-apps running on the same origin/host.
 */

export interface ScopedStorage {
  getItem: <T = string>(key: string) => null | T;
  setItem: <T>(key: string, value: T) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  getAllKeys: () => string[];
}

/**
 * Builds a standardized, namespaced storage key: `operon:<appName>:<key>`.
 */
export function createStorageKey(appName: string, key: string): string {
  const cleanApp = appName
    .trim()
    .toLowerCase()
    .replace(/^operon[-:]/, '');
  const cleanKey = key.trim();
  return `operon:${cleanApp}:${cleanKey}`;
}

/**
 * Creates a scoped storage adapter that prefixes all keys with `operon:<appName>:`.
 * Automatically serializes and deserializes JSON objects.
 */
export function createScopedStorage(
  appName: string,
  storage: Storage = typeof window === 'undefined'
    ? (null as any)
    : window.localStorage,
): ScopedStorage {
  const prefix = `operon:${appName
    .trim()
    .toLowerCase()
    .replace(/^operon[-:]/, '')}:`;

  return {
    getItem: <T = string>(key: string): null | T => {
      if (!storage) return null;
      const raw = storage.getItem(`${prefix}${key}`);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    setItem: <T>(key: string, value: T): void => {
      if (!storage) return;
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      storage.setItem(`${prefix}${key}`, serialized);
    },
    removeItem: (key: string): void => {
      if (!storage) return;
      storage.removeItem(`${prefix}${key}`);
    },
    clear: (): void => {
      if (!storage) return;
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    },
    getAllKeys: (): string[] => {
      if (!storage) return [];
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) {
          keys.push(k.slice(prefix.length));
        }
      }
      return keys;
    },
  };
}

/**
 * Pinia plugin-persistedstate options generator.
 * Generates an isolated persist configuration with namespaced key.
 */
export function definePersistedState(
  appName: string,
  storeId: string,
  options?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    key: createStorageKey(appName, storeId),
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
    ...options,
  };
}
