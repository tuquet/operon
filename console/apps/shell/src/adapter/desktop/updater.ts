import { useAppUpdater } from '#/composables/use-app-updater';

import { isTauriEnvironment } from './index';

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  error?: string;
  notes?: string;
  version?: string;
}

/**
 * Checks for desktop updates via configured Tauri updater endpoint.
 */
export async function checkDesktopUpdate(): Promise<UpdateInfo> {
  const { setUpdateAvailable } = useAppUpdater();

  if (!isTauriEnvironment()) {
    return {
      available: false,
      error:
        'Desktop updater is only available in the native desktop application.',
    };
  }

  let currentVersion: string | undefined;
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    currentVersion = await getVersion();
  } catch {
    // Non-critical fallback if getVersion fails
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (update) {
      setUpdateAvailable({
        body: update.body ?? undefined,
        date: update.date ?? undefined,
        version: update.version,
      });

      return {
        available: true,
        currentVersion: update.currentVersion || currentVersion,
        notes: update.body ?? undefined,
        version: update.version,
      };
    }

    setUpdateAvailable(null);
    return {
      available: false,
      currentVersion,
    };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[Desktop Updater] Check failed:', message);
    return {
      available: false,
      currentVersion,
      error: message,
    };
  }
}

/**
 * Checks for updates and surfaces a toast notification with the result.
 * - Non-desktop environment → informational toast
 * - Network / check error   → warning toast with real error details
 * - Update available        → success toast with version
 * - Up to date             → info toast with current version (e.g. Operon v5.8.0 is up to date)
 */
export async function checkAndNotifyUpdate(): Promise<void> {
  const { toast } = await import('@operon-core/shadcn-ui');

  if (!isTauriEnvironment()) {
    toast.info('Desktop update is only available in the native desktop app.', {
      duration: 3000,
    });
    return;
  }

  try {
    const info = await checkDesktopUpdate();

    if (info.error) {
      toast.warning(`Update check failed: ${info.error}`, {
        duration: 5000,
      });
      return;
    }

    if (info.available) {
      toast.success(
        `Update v${info.version} is available! Restart the app to install.`,
        { duration: 8000 },
      );
    } else {
      const verText = info.currentVersion ? `v${info.currentVersion} ` : '';
      toast.info(`Operon ${verText}is up to date.`, {
        duration: 3000,
      });
    }
  } catch (error: any) {
    toast.warning(`Could not check for updates: ${error?.message || error}`, {
      duration: 4000,
    });
  }
}
