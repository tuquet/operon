/**
 * Key-Value Storage Driver Interface
 * Adheres to Dependency Inversion Principle (DIP) & Open/Closed Principle (OCP).
 */
export interface KeyValueStorageDriver {
  getItem<T>(key: string, defaultValue?: null | T): Promise<null | T>;
  setItem<T>(key: string, value: T): Promise<void>;
}

export class TauriStorageDriver implements KeyValueStorageDriver {
  private storeInstance: any = null;

  async getItem<T>(
    key: string,
    defaultValue: null | T = null,
  ): Promise<null | T> {
    try {
      const store = await this.getStore();
      if (store) {
        const val = await store.get(key);
        if (val !== undefined && val !== null) {
          return val as T;
        }
      }
    } catch (error) {
      console.warn('[Desktop Storage] get error:', error);
    }
    return defaultValue;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const store = await this.getStore();
      if (store) {
        await store.set(key, value);
        await store.save();
      }
    } catch (error) {
      console.warn('[Desktop Storage] set error:', error);
    }
  }

  private async getStore() {
    if (!this.storeInstance) {
      try {
        const { Store } = await import('@tauri-apps/plugin-store');
        this.storeInstance = await Store.load('desktop-storage.json');
      } catch (error) {
        console.warn('[Desktop Storage] Store load failed:', error);
      }
    }
    return this.storeInstance;
  }
}

export class LocalStorageDriver implements KeyValueStorageDriver {
  async getItem<T>(
    key: string,
    defaultValue: null | T = null,
  ): Promise<null | T> {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
      } catch {
        // Return default
      }
    }
    return defaultValue;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignored
      }
    }
  }
}
