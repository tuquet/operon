import { markRaw } from 'vue';

import {
  ArrowUpCircle,
  BookOpenText,
  Languages,
  LockKeyhole,
  Maximize,
  PanelLeft,
  RotateCcw,
  RotateCw,
  Settings,
  SunMoon,
  SvgGithubIcon,
  Terminal,
  ZoomIn,
  ZoomOut,
} from '@operon/icons';
import { $t } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';
import { isWindowsOs } from '@operon/utils';

export interface CommandAction {
  id: string;
  title: string;
  category: string;
  icon: any;
  shortcut?: string;
  keywords?: string[];
  handler: () => Promise<void> | void;
  desktopOnly?: boolean;
}

/**
 * Creates the collection of built-in system and operational commands
 * for the VS Code-grade Command Palette.
 */
export function getBuiltinCommands(): CommandAction[] {
  const mod = isWindowsOs() ? 'Ctrl' : '⌘';

  return [
    // ── Preferences ────────────────────────────────────────────────────────
    {
      id: 'preferences-open',
      title: $t('preferences.settingsTitle') || 'Open Settings',
      category: 'Preferences',
      icon: markRaw(Settings),
      shortcut: `${mod}+,`,
      keywords: ['settings', 'preferences', 'config', 'cài đặt', 'tuỳ chọn'],
      handler: () => {
        window.dispatchEvent(new Event('open-preferences'));
      },
    },
    {
      id: 'preferences-theme-toggle',
      title: $t('preferences.theme.title') || 'Toggle Dark / Light Theme',
      category: 'Preferences',
      icon: markRaw(SunMoon),
      keywords: [
        'theme',
        'dark',
        'light',
        'mode',
        'giao diện',
        'sáng',
        'tối',
        'màu sắc',
      ],
      handler: () => {
        const nextMode = preferences.theme.mode === 'dark' ? 'light' : 'dark';
        updatePreferences({ theme: { mode: nextMode } });
      },
    },
    {
      id: 'preferences-language',
      title:
        $t('preferences.language') || 'Switch Language (Tiếng Việt / English)',
      category: 'Preferences',
      icon: markRaw(Languages),
      keywords: [
        'language',
        'locale',
        'ngôn ngữ',
        'tiếng việt',
        'english',
        'translate',
      ],
      handler: () => {
        const nextLocale =
          preferences.app.locale === 'en-US' ? 'vi-VN' : 'en-US';
        updatePreferences({ app: { locale: nextLocale } });
      },
    },

    // ── View ───────────────────────────────────────────────────────────────
    {
      id: 'view-toggle-sidebar',
      title: 'Toggle Sidebar',
      category: 'View',
      icon: markRaw(PanelLeft),
      shortcut: `${mod}+B`,
      keywords: [
        'sidebar',
        'menu',
        'collapse',
        'expand',
        'thanh bên',
        'thu gọn',
      ],
      handler: () => {
        updatePreferences({
          sidebar: { collapsed: !preferences.sidebar.collapsed },
        });
      },
    },
    {
      id: 'view-toggle-fullscreen',
      title: 'Toggle Fullscreen',
      category: 'View',
      icon: markRaw(Maximize),
      shortcut: 'F11',
      keywords: ['fullscreen', 'screen', 'toàn màn hình', 'phóng to'],
      handler: async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          } else if (document.exitFullscreen) {
            await document.exitFullscreen();
          }
        } catch {
          // Ignore
        }
      },
    },
    {
      id: 'view-zoom-in',
      title: 'Zoom In',
      category: 'View',
      icon: markRaw(ZoomIn),
      shortcut: `${mod}+=`,
      keywords: ['zoom', 'in', 'larger', 'scale', 'phóng to'],
      handler: () => {
        window.dispatchEvent(new Event('operon-zoom-in'));
      },
    },
    {
      id: 'view-zoom-out',
      title: 'Zoom Out',
      category: 'View',
      icon: markRaw(ZoomOut),
      shortcut: `${mod}+-`,
      keywords: ['zoom', 'out', 'smaller', 'scale', 'thu nhỏ'],
      handler: () => {
        window.dispatchEvent(new Event('operon-zoom-out'));
      },
    },
    {
      id: 'view-reset-zoom',
      title: 'Reset Zoom (100%)',
      category: 'View',
      icon: markRaw(RotateCcw),
      shortcut: `${mod}+0`,
      keywords: ['zoom', 'reset', '100%', 'mặc định'],
      handler: () => {
        window.dispatchEvent(new Event('operon-zoom-reset'));
      },
    },

    // ── System ─────────────────────────────────────────────────────────────
    {
      id: 'system-lock-screen',
      title: $t('ui.widgets.lockScreen.title') || 'Lock Screen',
      category: 'System',
      icon: markRaw(LockKeyhole),
      shortcut: `${mod}+L`,
      keywords: ['lock', 'screen', 'security', 'khóa màn hình', 'bảo mật'],
      handler: () => {
        window.dispatchEvent(new Event('open-lock-screen-modal'));
      },
    },
    {
      id: 'system-reload-view',
      title: 'Reload / Refresh View',
      category: 'System',
      icon: markRaw(RotateCw),
      shortcut: `${mod}+R`,
      keywords: ['reload', 'refresh', 'làm mới', 'tải lại'],
      handler: () => {
        window.location.reload();
      },
    },

    // ── Developer ──────────────────────────────────────────────────────────
    {
      id: 'developer-toggle-devtools',
      title: 'Developer: Toggle Developer Tools',
      category: 'Developer',
      icon: markRaw(Terminal),
      shortcut: 'F12',
      keywords: ['devtools', 'debug', 'console', 'inspect', 'gỡ lỗi'],
      handler: () => {
        window.dispatchEvent(new Event('toggle-desktop-devtools'));
      },
    },
    {
      id: 'developer-check-updates',
      title: 'Developer: Check for Application Updates',
      category: 'Developer',
      icon: markRaw(ArrowUpCircle),
      keywords: ['update', 'version', 'upgrade', 'cập nhật', 'phiên bản'],
      handler: () => {
        window.dispatchEvent(new Event('check-desktop-updates'));
      },
    },

    // ── Help ───────────────────────────────────────────────────────────────
    {
      id: 'help-documentation',
      title: 'Documentation',
      category: 'Help',
      icon: markRaw(BookOpenText),
      keywords: ['docs', 'manual', 'guide', 'help', 'tài liệu', 'hướng dẫn'],
      handler: () => {
        window.open('https://docs.operon.com', '_blank');
      },
    },
    {
      id: 'help-github',
      title: 'GitHub Repository',
      category: 'Help',
      icon: markRaw(SvgGithubIcon),
      keywords: ['github', 'git', 'source', 'repository', 'mã nguồn'],
      handler: () => {
        window.open('https://github.com/operon/console', '_blank');
      },
    },
  ];
}
