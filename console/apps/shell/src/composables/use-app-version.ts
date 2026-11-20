import { onMounted, ref } from 'vue';

import { isTauriEnvironment } from '#/adapter/desktop';

/**
 * Lazily reads the Tauri app version from the native runtime.
 * Returns an empty string in browser/web mode.
 */
export function useAppVersion() {
  const version = ref('');

  onMounted(async () => {
    if (!isTauriEnvironment()) return;
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      version.value = await getVersion();
    } catch {
      // non-critical — version badge stays empty
    }
  });

  return { version };
}
