// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendDesktopNotificationMock, toastMock } = vi.hoisted(() => ({
  sendDesktopNotificationMock: vi.fn().mockResolvedValue(true),
  toastMock: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@operon-core/shadcn-ui', () => ({
  toast: toastMock,
}));

vi.mock('#/adapter/desktop/notification', () => ({
  getNotificationPermission: vi.fn().mockResolvedValue('granted'),
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  sendDesktopNotification: sendDesktopNotificationMock,
}));

const memoryStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    clear: () => memoryStore.clear(),
    getItem: (key: string) => memoryStore.get(key) ?? null,
    removeItem: (key: string) => memoryStore.delete(key),
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value));
    },
  },
  writable: true,
});

import { useNotificationStore } from '../notification';

describe('useNotificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('pushes in-app and toast notifications by default', async () => {
    const store = useNotificationStore();

    const item = await store.push({
      body: 'Job #42 finished',
      severity: 'success',
      title: 'Workflow Completed',
    });

    expect(item).not.toBeNull();
    expect(store.items).toHaveLength(1);
    expect(store.unreadCount).toBe(1);
    expect(store.hasUnread).toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith('Workflow Completed', {
      description: 'Job #42 finished',
    });
    expect(sendDesktopNotificationMock).not.toHaveBeenCalled();
  });

  it('dispatches native channel when requested', async () => {
    const store = useNotificationStore();

    await store.push({
      body: 'Daemon offline',
      channels: ['in-app', 'native'],
      severity: 'warning',
      title: 'Bridge Warning',
    });

    expect(store.items).toHaveLength(1);
    expect(toastMock.warning).not.toHaveBeenCalled();
    expect(sendDesktopNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Daemon offline',
        title: 'Bridge Warning',
      }),
    );
  });

  it('marks read, marks all read, removes, and clears notifications', async () => {
    const store = useNotificationStore();
    const first = await store.push({ channels: ['in-app'], title: 'First' });
    await store.push({ channels: ['in-app'], title: 'Second' });

    expect(store.unreadCount).toBe(2);

    store.markRead(first!.id);
    expect(store.unreadCount).toBe(1);

    store.markAllRead();
    expect(store.unreadCount).toBe(0);
    expect(store.hasUnread).toBe(false);

    store.remove(first!.id);
    expect(store.items).toHaveLength(1);

    store.clear();
    expect(store.items).toHaveLength(0);
  });
});
