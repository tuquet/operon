import type { KeyValueStorageDriver } from './drivers';

import { LocalStorageDriver, TauriStorageDriver } from './drivers';
import { isTauriEnvironment } from './index';

let activeStorageDriver: KeyValueStorageDriver | null = null;

/**
 * Returns or initializes the current active storage driver based on runtime environment.
 * Allows driver injection for testing or extending.
 */
export function getStorageDriver(): KeyValueStorageDriver {
  if (!activeStorageDriver) {
    activeStorageDriver = isTauriEnvironment()
      ? new TauriStorageDriver()
      : new LocalStorageDriver();
  }
  return activeStorageDriver;
}

/**
 * Injects a custom storage driver (DIP / testing).
 */
export function setStorageDriver(driver: KeyValueStorageDriver | null): void {
  activeStorageDriver = driver;
}

/**
 * Stores a value in secure desktop store (or localStorage on web).
 */
export async function setSecureItem<T>(key: string, value: T): Promise<void> {
  return getStorageDriver().setItem(key, value);
}

/**
 * Retrieves a value from secure desktop store (or localStorage on web).
 */
export async function getSecureItem<T>(
  key: string,
  defaultValue: null | T = null,
): Promise<null | T> {
  return getStorageDriver().getItem<T>(key, defaultValue);
}
