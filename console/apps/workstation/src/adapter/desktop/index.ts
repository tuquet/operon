/**
 * Admin Desktop Native Adapter
 * Safe abstractions over Tauri v2 APIs with zero-crash web browser fallbacks.
 */

/**
 * Checks if the current runtime environment is a Tauri Desktop Webview.
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

/**
 * Minimizes the native window.
 */
export async function minimizeWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    await getCurrentWebviewWindow().minimize();
  } catch (error) {
    console.error('[Desktop] Failed to minimize window:', error);
  }
}

/**
 * Toggles maximize / restore on the native window.
 */
export async function toggleMaximizeWindow(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    const win = getCurrentWebviewWindow();
    await win.toggleMaximize();
    return await win.isMaximized();
  } catch (error) {
    console.error('[Desktop] Failed to toggle maximize window:', error);
    return false;
  }
}

/**
 * Closes the native window (or exits the application).
 */
export async function closeWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    await getCurrentWebviewWindow().close();
  } catch (error) {
    console.error('[Desktop] Failed to close window:', error);
  }
}

/**
 * Checks if the native window is currently maximized.
 */
export async function isWindowMaximized(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    return await getCurrentWebviewWindow().isMaximized();
  } catch {
    return false;
  }
}

/**
 * Reveals the native window smoothly once the frontend DOM has initialized.
 */
export async function revealWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    const win = getCurrentWebviewWindow();
    await win.show();
    await win.setFocus();
  } catch (error) {
    console.warn('[Desktop] revealWindow fallback:', error);
  }
}

/**
 * Starts window dragging on mousedown in Tauri environment.
 */
export async function startDragging(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { getCurrentWebviewWindow } =
      await import('@tauri-apps/api/webviewWindow');
    await getCurrentWebviewWindow().startDragging();
  } catch (error) {
    console.error('[Desktop] Failed to start window dragging:', error);
  }
}

export * from './deep-link';
