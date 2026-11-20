import type { NotificationPlatform } from '@operon/kernel';

/**
 * Single Source of Truth for Platform Detection across Web, PWA & Desktop (Tauri).
 */

export type AppPlatform = 'desktop' | 'web';

let platformOverride: AppPlatform | null = null;

/**
 * Checks if running inside a Tauri native desktop webview.
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

/**
 * Checks if running as an installed standalone PWA (outside Tauri).
 */
export function isPwaEnvironment(): boolean {
  if (isTauriEnvironment() || typeof window === 'undefined') {
    return false;
  }
  const isStandaloneDisplay =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches);
  const isIosStandalone =
    'navigator' in window &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
  return isStandaloneDisplay || isIosStandalone;
}

/**
 * Resolves the active notification runtime platform across Web, PWA, and Tauri.
 */
export function getNotificationPlatform(): NotificationPlatform {
  if (isTauriEnvironment()) {
    return 'tauri';
  }
  if (isPwaEnvironment()) {
    return 'pwa';
  }
  return 'web';
}

/**
 * Determines current runtime platform, respecting runtime overrides or environment variables.
 */
export function getPlatform(): AppPlatform {
  if (platformOverride) {
    return platformOverride;
  }
  const envTarget = import.meta.env?.VITE_TARGET_PLATFORM;
  if (envTarget === 'desktop' || envTarget === 'web') {
    return envTarget;
  }
  return isTauriEnvironment() ? 'desktop' : 'web';
}

/**
 * Convenience helper: returns true if running on Desktop (Tauri).
 */
export function isDesktop(): boolean {
  return getPlatform() === 'desktop';
}

/**
 * Convenience helper: returns true if running on Web browser.
 */
export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * Testing & simulation helper to override the platform dynamically.
 */
export function setPlatformOverride(platform: AppPlatform | null): void {
  platformOverride = platform;
}
