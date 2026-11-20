/**
 * Admin Desktop Native Adapter
 * Safe abstractions over Tauri v2 APIs with zero-crash web browser fallbacks.
 */

import { isTauriEnvironment } from '#/utils/platform';

export { isTauriEnvironment };

type WebviewWindow = Awaited<
  ReturnType<
    (typeof import('@tauri-apps/api/webviewWindow'))['getCurrentWebviewWindow']
  >
>;
type TauriInvoke = (typeof import('@tauri-apps/api/core'))['invoke'];

async function withWebviewWindow<T>(
  action: string,
  fallback: T,
  fn: (win: WebviewWindow) => Promise<T>,
): Promise<T> {
  if (!isTauriEnvironment()) return fallback;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    return await fn(getCurrentWebviewWindow());
  } catch (error) {
    console.error(`[Desktop] ${action} failed:`, error);
    return fallback;
  }
}

async function withTauriCore<T>(
  action: string,
  fallback: T,
  fn: (invoke: TauriInvoke) => Promise<T>,
  silent = false,
): Promise<T> {
  if (!isTauriEnvironment()) return fallback;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await fn(invoke);
  } catch (error) {
    if (!silent) {
      console.error(`[Desktop] ${action} failed:`, error);
    }
    return fallback;
  }
}

/** Minimizes the native window. */
export const minimizeWindow = (): Promise<void> =>
  withWebviewWindow('minimize window', undefined, (win) => win.minimize());

/** Toggles maximize / restore on the native window. */
export const toggleMaximizeWindow = (): Promise<boolean> =>
  withWebviewWindow('toggle maximize window', false, async (win) => {
    await win.toggleMaximize();
    return await win.isMaximized();
  });

/** Closes the native window (or exits the application). */
export const closeWindow = (): Promise<void> =>
  withWebviewWindow('close window', undefined, (win) => win.close());

/** Checks if the native window is currently maximized. */
export const isWindowMaximized = (): Promise<boolean> =>
  withWebviewWindow('check maximized state', false, (win) => win.isMaximized());

/** Reveals the native window smoothly once the frontend DOM has initialized. */
export const revealWindow = (): Promise<void> =>
  withWebviewWindow('reveal window', undefined, async (win) => {
    await win.show();
    await win.setFocus();
  });

/** Starts window dragging on mousedown in Tauri environment. */
export const startDragging = (): Promise<void> =>
  withWebviewWindow('start window dragging', undefined, (win) =>
    win.startDragging(),
  );

/** Toggles developer tools window. */
export const toggleDevtools = (): Promise<boolean> =>
  withTauriCore('toggle DevTools', false, (invoke) =>
    invoke<boolean>('toggle_devtools'),
  );

/** Opens developer tools window. */
export const openDevtools = (): Promise<void> =>
  withTauriCore('open DevTools', undefined, async (invoke) => {
    await invoke('open_devtools');
  });

/** Returns the canonical workstation log path on the host. */
export const getLogPath = (): Promise<string> =>
  withTauriCore('get log path', '', (invoke) => invoke<string>('get_log_path'));

/** Appends a log line to the persistent workstation log file (~/.operon/logs/workstation.log). */
export const appendDesktopLog = (
  level: 'debug' | 'error' | 'info' | 'warn',
  message: string,
): Promise<void> =>
  withTauriCore(
    'append_log',
    undefined,
    async (invoke) => {
      await invoke('append_log', { level, message });
    },
    true,
  );

/**
 * Initializes desktop keyboard shortcuts (F12, Ctrl+Shift+I) and intercepts
 * uncaught frontend errors to persist them into workstation.log.
 */
export function initDesktopLoggingAndShortcuts(): void {
  if (!isTauriEnvironment() || typeof window === 'undefined') return;

  window.addEventListener('keydown', (event) => {
    if (
      event.key === 'F12' ||
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === 'I' || event.key === 'i'))
    ) {
      event.preventDefault();
      toggleDevtools().catch(console.error);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg =
      event.error?.stack ||
      event.error?.message ||
      event.message ||
      'Unknown window error';
    appendDesktopLog('error', `[Frontend] Uncaught error: ${errorMsg}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason =
      event.reason?.stack || event.reason?.message || String(event.reason);
    appendDesktopLog('error', `[Frontend] Unhandled rejection: ${reason}`);
  });

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    try {
      const msg = args
        .map((arg) =>
          typeof arg === 'object'
            ? arg?.stack || JSON.stringify(arg)
            : String(arg),
        )
        .join(' ');
      appendDesktopLog('error', `[Frontend] ${msg}`);
    } catch {
      // Fail-safe
    }
  };

  appendDesktopLog(
    'info',
    '[Frontend] Webview runtime initialized with DevTools listener active',
  );
}

export * from './deep-link';

// ---------------------------------------------------------------------------
// Webview Zoom
// ---------------------------------------------------------------------------

const ZOOM_KEY = '--operon-zoom';
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

/** Returns the persisted zoom factor (default 1.0 = 100%). */
export function getCurrentZoom(): number {
  return Number(localStorage.getItem(ZOOM_KEY) ?? '1');
}

async function applyZoom(
  action: string,
  next: number,
  persist = true,
): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    await getCurrentWebview().setZoom(next);
    if (persist) {
      localStorage.setItem(ZOOM_KEY, String(next));
    }
  } catch (error) {
    if (persist) {
      console.error(`[Desktop] ${action} failed:`, error);
    }
  }
}

/** Increases webview zoom by 10% (max 200%). */
export const zoomIn = (): Promise<void> =>
  applyZoom(
    'zoomIn',
    Math.min(ZOOM_MAX, Number((getCurrentZoom() + ZOOM_STEP).toFixed(1))),
  );

/** Decreases webview zoom by 10% (min 50%). */
export const zoomOut = (): Promise<void> =>
  applyZoom(
    'zoomOut',
    Math.max(ZOOM_MIN, Number((getCurrentZoom() - ZOOM_STEP).toFixed(1))),
  );

/** Resets webview zoom to 100%. */
export const resetZoom = (): Promise<void> => applyZoom('resetZoom', 1);

/** Restores persisted zoom on app startup. Call once in app.vue onMounted. */
export async function restoreZoom(): Promise<void> {
  const saved = getCurrentZoom();
  if (saved !== 1) {
    await applyZoom('restoreZoom', saved, false);
  }
}
