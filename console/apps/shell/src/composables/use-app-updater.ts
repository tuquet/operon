import { ref } from 'vue';

import { isDesktop } from '#/utils/platform';

export interface UpdateInfo {
  body?: string;
  date?: string;
  version: string;
}

// Global reactive singleton state shared across all components (Titlebar, Menu, Dialogs)
const isChecking = ref(false);
const isUpdating = ref(false);
const updateAvailable = ref<null | UpdateInfo>(null);
const updateError = ref<null | string>(null);

export function useAppUpdater() {
  function setUpdateAvailable(info: null | UpdateInfo) {
    updateAvailable.value = info;
  }

  async function checkForUpdates(silent = true) {
    if (!isDesktop()) {
      return null;
    }
    isChecking.value = true;
    updateError.value = null;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        const info: UpdateInfo = {
          body: update.body ?? undefined,
          date: update.date ?? undefined,
          version: update.version,
        };
        updateAvailable.value = info;
        return update;
      }
      updateAvailable.value = null;
      return null;
    } catch (error: any) {
      if (!silent) {
        console.warn('[Updater] Failed to check for updates:', error);
      }
      updateError.value = error?.message || String(error);
      return null;
    } finally {
      isChecking.value = false;
    }
  }

  async function installUpdate() {
    if (!isDesktop() || !updateAvailable.value) {
      return;
    }
    isUpdating.value = true;
    updateError.value = null;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      }
    } catch (error: any) {
      updateError.value = error?.message || String(error);
      console.error('[Updater] Failed to download and install update:', error);
      try {
        const { toast } = await import('@operon-core/shadcn-ui');
        toast.error(`Update failed: ${updateError.value}`, { duration: 6000 });
      } catch {
        // Fallback if toast component is unavailable
      }
    } finally {
      isUpdating.value = false;
    }
  }

  return {
    checkForUpdates,
    installUpdate,
    isChecking,
    isUpdating,
    setUpdateAvailable,
    updateAvailable,
    updateError,
  };
}
