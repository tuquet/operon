import { beforeEach, describe, expect, it } from 'vitest';

import {
  createScopedStorage,
  createStorageKey,
  definePersistedState,
} from '../storage';

describe('scoped Storage & Prefix Helper (@operon/kernel)', () => {
  let mockStorageMap: Map<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorageMap = new Map();
    mockStorage = {
      getItem: (key: string) => mockStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mockStorageMap.set(key, String(value));
      },
      removeItem: (key: string) => {
        mockStorageMap.delete(key);
      },
      clear: () => {
        mockStorageMap.clear();
      },
      key: (index: number) => [...mockStorageMap.keys()][index] ?? null,
      get length() {
        return mockStorageMap.size;
      },
    };
  });

  it('createStorageKey generates properly formatted keys', () => {
    expect(createStorageKey('automation', 'filters')).toBe(
      'operon:automation:filters',
    );
    expect(createStorageKey('operon-system', 'user_pref')).toBe(
      'operon:system:user_pref',
    );
    expect(createStorageKey('tenants', 'active_workspace')).toBe(
      'operon:tenants:active_workspace',
    );
  });

  it('createScopedStorage isolates keys by application namespace', () => {
    const autoStorage = createScopedStorage('automation', mockStorage);
    const systemStorage = createScopedStorage('system', mockStorage);

    autoStorage.setItem('theme', 'dark');
    systemStorage.setItem('theme', 'light');

    expect(autoStorage.getItem('theme')).toBe('dark');
    expect(systemStorage.getItem('theme')).toBe('light');
    expect(mockStorage.getItem('operon:automation:theme')).toBe('dark');
    expect(mockStorage.getItem('operon:system:theme')).toBe('light');
  });

  it('createScopedStorage handles JSON objects and primitives cleanly', () => {
    const storage = createScopedStorage('tenants', mockStorage);
    storage.setItem('config', { id: 123, enabled: true });

    expect(storage.getItem('config')).toEqual({ id: 123, enabled: true });
    expect(storage.getAllKeys()).toEqual(['config']);

    storage.removeItem('config');
    expect(storage.getItem('config')).toBeNull();
    expect(storage.getAllKeys()).toEqual([]);
  });

  it('definePersistedState produces valid Pinia persist configuration', () => {
    const config = definePersistedState('automation', 'workflow_store', {
      paths: ['items'],
    });
    expect(config.key).toBe('operon:automation:workflow_store');
    expect(config.paths).toEqual(['items']);
  });
});
