import type {
  NativeNotificationOptions,
  NotificationDriver,
  NotificationPermissionState,
  NotificationPlatform,
} from '@operon/kernel';

import { getNotificationPlatform } from '#/utils/platform';

import {
  PwaNotificationDriver,
  TauriNotificationDriver,
  WebNotificationDriver,
} from './drivers';

export type NotificationOptions = NativeNotificationOptions;

let customNotificationDriver: NotificationDriver | null = null;
const cachedDrivers: Partial<Record<NotificationPlatform, NotificationDriver>> =
  {};

function createDriverForPlatform(
  platform: NotificationPlatform,
): NotificationDriver {
  switch (platform) {
    case 'pwa': {
      return new PwaNotificationDriver();
    }
    case 'tauri': {
      return new TauriNotificationDriver();
    }
    default: {
      return new WebNotificationDriver();
    }
  }
}

/**
 * Returns the active notification driver for the current runtime platform
 * (Tauri, PWA, or Web), or a custom injected driver when overridden.
 */
export function getNotificationDriver(): NotificationDriver {
  if (customNotificationDriver) {
    return customNotificationDriver;
  }
  const platform = getNotificationPlatform();
  if (!cachedDrivers[platform]) {
    cachedDrivers[platform] = createDriverForPlatform(platform);
  }
  return cachedDrivers[platform]!;
}

/**
 * Injects a custom notification driver (DIP / testing).
 */
export function setNotificationDriver(driver: NotificationDriver | null): void {
  customNotificationDriver = driver;
}

/**
 * Checks whether native notifications are supported on the active platform.
 */
export async function isNotificationSupported(): Promise<boolean> {
  return getNotificationDriver().isSupported();
}

/**
 * Queries the current native notification permission state.
 */
export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  return getNotificationDriver().getPermission();
}

/**
 * Requests native notification permission on the active platform.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  return getNotificationDriver().requestPermission();
}

/**
 * Dispatches a native notification through the active platform driver (Tauri, PWA, or Web).
 */
export async function sendDesktopNotification(
  options: NotificationOptions,
): Promise<boolean> {
  return getNotificationDriver().send(options);
}
