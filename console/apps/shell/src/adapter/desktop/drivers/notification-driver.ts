import type {
  NativeNotificationOptions,
  NotificationDriver,
  NotificationPermissionState,
} from '@operon/kernel';

import { isTauriEnvironment } from '#/utils/platform';

export type { NotificationDriver };

function mapBrowserPermission(
  permission: NotificationPermission | undefined,
): NotificationPermissionState {
  if (
    permission === 'granted' ||
    permission === 'denied' ||
    permission === 'default'
  ) {
    return permission;
  }
  return 'unsupported';
}

function dispatchBrowserNotification(
  options: NativeNotificationOptions,
): boolean {
  const { body, data, icon, link, onClick, silent, tag, title } = options;
  const instance = new Notification(title, {
    body,
    data: link ? { link, ...data } : data,
    icon,
    silent,
    tag,
  });

  if (onClick) {
    instance.addEventListener('click', () => {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      onClick();
    });
  }

  return true;
}

export class TauriNotificationDriver implements NotificationDriver {
  readonly platform = 'tauri' as const;

  async getPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    try {
      const { isPermissionGranted } =
        await import('@tauri-apps/plugin-notification');
      return (await isPermissionGranted()) ? 'granted' : 'default';
    } catch {
      return 'unsupported';
    }
  }

  isSupported(): boolean {
    return isTauriEnvironment();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    try {
      const { isPermissionGranted, requestPermission } =
        await import('@tauri-apps/plugin-notification');
      if (await isPermissionGranted()) {
        return 'granted';
      }
      const permission = await requestPermission();
      return permission === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }

  async send(options: NativeNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    const { body, icon, title } = options;
    try {
      const { sendNotification } =
        await import('@tauri-apps/plugin-notification');
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        sendNotification({ body, icon, title });
        return true;
      }
    } catch {
      // Ignored when native notification fails
    }
    return false;
  }
}

export class PwaNotificationDriver implements NotificationDriver {
  readonly platform = 'pwa' as const;

  async getPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return mapBrowserPermission(Notification.permission);
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    );
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      return mapBrowserPermission(result);
    } catch {
      return 'unsupported';
    }
  }

  async send(options: NativeNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      let permission = await this.getPermission();
      if (permission === 'default') {
        permission = await this.requestPermission();
      }
      if (permission !== 'granted') {
        return false;
      }

      const registration = await this.resolveServiceWorkerRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(options.title, {
          badge: options.badge,
          body: options.body,
          data: options.link ? { link: options.link, ...options.data } : options.data,
          icon: options.icon ?? '/pwa-192x192.png',
          silent: options.silent,
          tag: options.tag,
        });
        return true;
      }

      return dispatchBrowserNotification(options);
    } catch {
      return false;
    }
  }

  private async resolveServiceWorkerRegistration(): Promise<
    ServiceWorkerRegistration | undefined
  > {
    const sw = navigator.serviceWorker;
    const existing = await sw.getRegistration();
    if (existing) {
      return existing;
    }
    // Avoid hanging indefinitely when SW is not yet active (e.g. dev/tests)
    return Promise.race([
      sw.ready,
      new Promise<undefined>((resolve) => {
        setTimeout(() => resolve(undefined), 1500);
      }),
    ]);
  }
}

export class WebNotificationDriver implements NotificationDriver {
  readonly platform = 'web' as const;

  async getPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return mapBrowserPermission(Notification.permission);
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      return mapBrowserPermission(result);
    } catch {
      return 'unsupported';
    }
  }

  async send(options: NativeNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      let permission = await this.getPermission();
      if (permission === 'default') {
        permission = await this.requestPermission();
      }
      if (permission !== 'granted') {
        return false;
      }
      return dispatchBrowserNotification(options);
    } catch {
      // Ignored in non-secure or restricted contexts
      return false;
    }
  }
}
