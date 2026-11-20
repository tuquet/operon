<script setup lang="ts">
import { isWindowsOs } from '@operon/utils';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@operon-core/shadcn-ui';

import {
  closeWindow,
  minimizeWindow,
  resetZoom,
  toggleMaximizeWindow,
  zoomIn,
  zoomOut,
} from '#/adapter/desktop';
import { checkAndNotifyUpdate } from '#/adapter/desktop/updater';
import { useAppVersion } from '#/composables/use-app-version';
import { openCommandPalette } from '#/composables/use-global-search';
import { $t } from '#/locales';

defineOptions({ name: 'TitlebarMenubar' });

const { version } = useAppVersion();

function handleOpenCommandPalette() {
  openCommandPalette('command');
}

// ── Keyboard shortcut labels (OS-aware) ────────────────────────────────────
const mod = isWindowsOs() ? 'Ctrl' : '⌘';
</script>

<template>
  <Menubar
    class="h-full border-none bg-transparent p-0 shadow-none"
    @dblclick.stop
  >
    <!-- ── Operon ─────────────────────────────────────────────────────── -->
    <MenubarMenu>
      <MenubarTrigger
        class="h-7 px-2.5 text-xs font-semibold cursor-default text-foreground data-[state=open]:text-foreground"
      >
        {{ $t('page.app.menu_operon') }}
      </MenubarTrigger>
      <MenubarContent class="min-w-[200px]">
        <!-- Version badge — non-interactive label -->
        <MenubarLabel
          v-if="version"
          class="font-normal text-xs text-muted-foreground"
        >
          Version {{ version }}
        </MenubarLabel>
        <MenubarSeparator v-if="version" />
        <MenubarItem @select="checkAndNotifyUpdate">
          {{ $t('page.app.menu_check_updates') }}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- ── Tenant ────────────────────────────────────────────────────── -->
    <MenubarMenu>
      <MenubarTrigger
        class="h-7 px-2.5 text-xs font-medium cursor-default text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
      >
        {{ $t('page.app.menu_tenant') }}
      </MenubarTrigger>
      <MenubarContent class="min-w-[220px]">
        <MenubarItem @select="handleOpenCommandPalette">
          {{ $t('page.app.menu_command_palette') }}
          <MenubarShortcut>{{ mod }}+Shift+P</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- ── View ──────────────────────────────────────────────────────── -->
    <MenubarMenu>
      <MenubarTrigger
        class="h-7 px-2.5 text-xs font-medium cursor-default text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
      >
        {{ $t('page.app.menu_view') }}
      </MenubarTrigger>
      <MenubarContent class="min-w-[200px]">
        <MenubarItem @select="zoomIn">
          {{ $t('page.app.menu_zoom_in') }}
          <MenubarShortcut>{{ mod }}=</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @select="zoomOut">
          {{ $t('page.app.menu_zoom_out') }}
          <MenubarShortcut>{{ mod }}-</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @select="resetZoom">
          {{ $t('page.app.menu_reset_zoom') }}
          <MenubarShortcut>{{ mod }}0</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- ── Window ────────────────────────────────────────────────────── -->
    <MenubarMenu>
      <MenubarTrigger
        class="h-7 px-2.5 text-xs font-medium cursor-default text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
      >
        {{ $t('page.app.menu_window') }}
      </MenubarTrigger>
      <MenubarContent class="min-w-[200px]">
        <MenubarItem @select="minimizeWindow">
          {{ $t('common.windowMinimize') }}
        </MenubarItem>
        <MenubarItem @select="toggleMaximizeWindow">
          {{ $t('common.windowMaximize') }}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @select="closeWindow">
          {{ $t('common.windowClose') }}
          <MenubarShortcut>Alt + F4</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
