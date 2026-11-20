import type {
  NotificationPayload,
  NotificationPermissionState,
  NotificationSeverity,
} from '@operon/kernel';
import type { NotificationItem } from '@operon/layouts';

import { computed, ref } from 'vue';

import { toast } from '@operon-core/shadcn-ui';

import { defineStore } from 'pinia';

import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
} from '#/adapter/desktop/notification';
import { getNotificationPlatform } from '#/utils/platform';

const STORAGE_KEY = 'operon-notifications';
const MAX_STORED_NOTIFICATIONS = 50;

function loadStoredNotifications(): NotificationItem[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(items: NotificationItem[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_STORED_NOTIFICATIONS)),
    );
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

function generateNotificationId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(): string {
  try {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date().toISOString();
  }
}

function dispatchToast(
  severity: NotificationSeverity,
  title: string,
  body?: string,
): void {
  const options = body ? { description: body } : undefined;
  switch (severity) {
    case 'error': {
      toast.error(title, options);
      break;
    }
    case 'success': {
      toast.success(title, options);
      break;
    }
    case 'warning': {
      toast.warning(title, options);
      break;
    }
    default: {
      toast.info(title, options);
      break;
    }
  }
}

export const useNotificationStore = defineStore('shell-notification', () => {
  const items = ref<NotificationItem[]>(loadStoredNotifications());

  const unreadCount = computed(
    () => items.value.filter((item) => !item.isRead).length,
  );
  const hasUnread = computed(() => unreadCount.value > 0);
  const platform = computed(() => getNotificationPlatform());

  function persist() {
    saveStoredNotifications(items.value);
  }

  async function push(
    payload: NotificationPayload,
  ): Promise<NotificationItem | null> {
    const channels = payload.channels ?? ['in-app', 'toast'];
    const severity: NotificationSeverity = payload.severity ?? 'info';
    let created: NotificationItem | null = null;

    if (channels.includes('in-app')) {
      const id = payload.id ?? generateNotificationId();
      created = {
        avatar: payload.icon ?? '',
        date: formatTimestamp(),
        id,
        isRead: false,
        link: payload.link,
        message: payload.body ?? '',
        query: payload.query,
        severity,
        state: payload.state,
        title: payload.title,
      };
      items.value = [
        created,
        ...items.value.filter((existing) => existing.id !== id),
      ].slice(0, MAX_STORED_NOTIFICATIONS);
      persist();
    }

    if (channels.includes('toast')) {
      dispatchToast(severity, payload.title, payload.body);
    }

    if (channels.includes('native')) {
      await sendDesktopNotification({
        badge: payload.badge,
        body: payload.body,
        icon: payload.icon,
        link: payload.link,
        silent: payload.silent,
        tag: payload.tag,
        title: payload.title,
      });
    }

    return created;
  }

  function markRead(id: number | string) {
    const target = items.value.find((item) => item.id === id);
    if (target && !target.isRead) {
      target.isRead = true;
      persist();
    }
  }

  function markAllRead() {
    let changed = false;
    for (const item of items.value) {
      if (!item.isRead) {
        item.isRead = true;
        changed = true;
      }
    }
    if (changed) {
      persist();
    }
  }

  function remove(id: number | string) {
    const next = items.value.filter((item) => item.id !== id);
    if (next.length !== items.value.length) {
      items.value = next;
      persist();
    }
  }

  function clear() {
    if (items.value.length > 0) {
      items.value = [];
      persist();
    }
  }

  function getPermission(): Promise<NotificationPermissionState> {
    return getNotificationPermission();
  }

  function requestPermission(): Promise<NotificationPermissionState> {
    return requestNotificationPermission();
  }

  return {
    clear,
    getPermission,
    hasUnread,
    items,
    markAllRead,
    markRead,
    platform,
    push,
    remove,
    requestPermission,
    unreadCount,
  };
});
