import { isTauriEnvironment } from './index';

export interface DialogFilter {
  extensions: string[];
  name: string;
}

export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: DialogFilter[];
  title?: string;
}

export interface OpenDialogOptions {
  directory?: boolean;
  filters?: DialogFilter[];
  multiple?: boolean;
  title?: string;
}

async function runTauriDialog<T>(
  actionName: string,
  runner: (
    plugin: typeof import('@tauri-apps/plugin-dialog'),
  ) => Promise<null | T>,
): Promise<null | T> {
  if (!isTauriEnvironment()) {
    return null;
  }
  try {
    const plugin = await import('@tauri-apps/plugin-dialog');
    return await runner(plugin);
  } catch (error) {
    console.warn(`[Desktop Dialog] ${actionName} error:`, error);
    return null;
  }
}

/**
 * Prompts native file save dialog, returning selected file path.
 */
export async function showSaveDialog(
  options: SaveDialogOptions = {},
): Promise<null | string> {
  return runTauriDialog('Save', ({ save }) => save(options));
}

/**
 * Prompts native file open dialog, returning selected file path(s).
 */
export async function showOpenDialog(
  options: OpenDialogOptions = {},
): Promise<null | string | string[]> {
  return runTauriDialog('Open', ({ open }) => open(options));
}
