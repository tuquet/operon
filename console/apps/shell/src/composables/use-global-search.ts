/**
 * Singleton event-bus composable for triggering the Global Search modal
 * from anywhere in the app (e.g. titlebar menubar, keyboard shortcuts).
 *
 * Usage:
 *   // In GlobalSearch host component:
 *   onMounted(() => registerGlobalSearchOpener(() => modalApi.open()));
 *
 *   // From anywhere:
 *   openGlobalSearch();
 */

let _openFn: (() => void) | null = null;

/** Called once by the GlobalSearch host to register the open callback. */
export function registerGlobalSearchOpener(fn: () => void): void {
  _openFn = fn;
}

/** Triggers the Global Search modal to open. No-op if not registered yet. */
export function openGlobalSearch(): void {
  _openFn?.();
}

/** Dispatches the global command palette event in command (`>`) or navigation mode. */
export function openCommandPalette(
  mode: 'command' | 'navigation' = 'command',
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('open-command-palette', {
      detail: {
        initialValue: mode === 'command' ? '>' : '',
        mode,
      },
    }),
  );
}
