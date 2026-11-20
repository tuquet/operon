import { onMounted, onUnmounted } from 'vue';

import { preferences, updatePreferences } from '@operon/preferences';

import { resetZoom, toggleDevtools, zoomIn, zoomOut } from '#/adapter/desktop';
import { checkAndNotifyUpdate } from '#/adapter/desktop/updater';
import { openCommandPalette } from '#/composables/use-global-search';

interface ShortcutBinding {
  desktopOnly?: boolean;
  ignoreEditable?: boolean;
  ignoreRepeat?: boolean;
  match: (event: KeyboardEvent, key: string, code: string) => boolean;
  run: () => void;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.isContentEditable ||
    Boolean(target.closest('.monaco-editor, [contenteditable="true"]'))
  );
}

function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  } catch {
    // Ignore fullscreen permission errors
  }
}

const SHORTCUTS: ShortcutBinding[] = [
  {
    ignoreRepeat: true,
    match: (e, key, code) =>
      ((e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (key === 'p' || code === 'KeyP')) ||
      e.key === 'F1' ||
      code === 'F1',
    run: () => openCommandPalette('command'),
  },
  {
    ignoreRepeat: true,
    match: (e, key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      (key === 'p' || code === 'KeyP' || key === 'k' || code === 'KeyK'),
    run: () => openCommandPalette('navigation'),
  },
  {
    ignoreRepeat: true,
    match: (e, _key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === ',' || code === 'Comma'),
    run: () => window.dispatchEvent(new CustomEvent('open-preferences')),
  },
  {
    ignoreEditable: true,
    ignoreRepeat: true,
    match: (e, key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !e.altKey &&
      (key === 'b' || code === 'KeyB'),
    run: () =>
      updatePreferences({
        sidebar: { collapsed: !preferences.sidebar.collapsed },
      }),
  },
  {
    ignoreRepeat: true,
    match: (e, key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !e.altKey &&
      (key === 'l' || code === 'KeyL'),
    run: () => window.dispatchEvent(new CustomEvent('open-lock-screen-modal')),
  },
  {
    desktopOnly: true,
    match: (e, _key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      (e.key === '=' ||
        e.key === '+' ||
        code === 'Equal' ||
        code === 'NumpadAdd'),
    run: () => void zoomIn(),
  },
  {
    desktopOnly: true,
    match: (e, _key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      (e.key === '-' || code === 'Minus' || code === 'NumpadSubtract'),
    run: () => void zoomOut(),
  },
  {
    desktopOnly: true,
    match: (e, _key, code) =>
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      (e.key === '0' || code === 'Digit0' || code === 'Numpad0'),
    run: () => void resetZoom(),
  },
  {
    match: (e, _key, code) =>
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === 'F11' || code === 'F11'),
    run: toggleFullscreen,
  },
  {
    desktopOnly: true,
    match: (e, _key, code) =>
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === 'F12' || code === 'F12'),
    run: () => void toggleDevtools(),
  },
];

/**
 * Registers global keyboard shortcuts and desktop window custom events (SRP + OCP).
 */
export function useGlobalShortcuts(isDesktop: boolean) {
  function handleKeydown(event: KeyboardEvent) {
    const key = event.key?.toLowerCase() ?? '';
    const code = event.code;

    for (const binding of SHORTCUTS) {
      if (binding.desktopOnly && !isDesktop) continue;
      if (binding.ignoreEditable && isEditableElement(event.target)) continue;
      if (!binding.match(event, key, code)) continue;

      event.preventDefault();
      event.stopPropagation();
      if (!binding.ignoreRepeat || !event.repeat) {
        binding.run();
      }
      return;
    }
  }

  const windowHandlers: Record<string, EventListener> = {
    'check-desktop-updates': () => void checkAndNotifyUpdate(),
    'operon-zoom-in': () => void zoomIn(),
    'operon-zoom-out': () => void zoomOut(),
    'operon-zoom-reset': () => void resetZoom(),
    'toggle-desktop-devtools': () => void toggleDevtools(),
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, { capture: true });
    for (const [eventName, handler] of Object.entries(windowHandlers)) {
      window.addEventListener(eventName, handler);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown, { capture: true });
    for (const [eventName, handler] of Object.entries(windowHandlers)) {
      window.removeEventListener(eventName, handler);
    }
  });
}
