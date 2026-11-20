<script setup lang="ts">
import type { MenuRecordRaw } from '@operon/types';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Search } from '@operon/icons';
import { $t } from '@operon/locales';
import { isWindowsOs } from '@operon/utils';

import {
  Button,
  Command,
  CommandInput,
  CommandList,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@operon-core/shadcn-ui';

import SearchPanel from './search-panel.vue';

defineOptions({
  name: 'GlobalSearch',
});

const props = withDefaults(
  defineProps<{
    enableShortcutKey?: boolean;
    menus?: MenuRecordRaw[];
    /** Whether to show trigger button (can hide when embedded in containers like dropdown) */
    showButton?: boolean;
  }>(),
  {
    enableShortcutKey: true,
    menus: () => [],
    showButton: true,
  },
);

const open = ref(false);
const keyword = ref('');

const placeholder = computed(() => {
  return keyword.value.startsWith('>')
    ? $t('ui.widgets.search.placeholderCommand') || 'Type a command to run...'
    : $t('ui.widgets.search.placeholderNav') ||
        "Search navigation... (Type '>' for commands)";
});

function handleClose() {
  open.value = false;
  keyword.value = '';
}

function toggleOpen() {
  open.value = !open.value;
  if (open.value) {
    keyword.value = '';
  }
}

// Reset keyword when dialog closes
function handleOpenChange(val: boolean) {
  if (!val) keyword.value = '';
}

interface PaletteDetail {
  initialValue?: string;
  mode?: 'command' | 'navigation';
}

function openWithMode(detail?: PaletteDetail) {
  if (detail?.initialValue !== undefined) {
    keyword.value = detail.initialValue;
  } else if (detail?.mode === 'command') {
    keyword.value = '>';
  } else {
    keyword.value = '';
  }
  open.value = true;
}

// Global hotkey capture listener to preempt browser defaults on Web (Chrome print, etc.)
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!props.enableShortcutKey) return;

  const isMac = !isWindowsOs();
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key?.toLowerCase();
  const isP = key === 'p' || event.code === 'KeyP';
  const isK = key === 'k' || event.code === 'KeyK';
  const isF1 = event.key === 'F1';

  // 1. Command Mode: Ctrl+Shift+P, Cmd+Shift+P, or F1
  if ((ctrlOrCmd && event.shiftKey && isP) || isF1) {
    event.preventDefault();
    event.stopPropagation();
    openWithMode({ mode: 'command', initialValue: '>' });
    return;
  }

  // 2. Navigation Mode: Ctrl+P, Cmd+P, or Ctrl+K, Cmd+K
  if ((ctrlOrCmd && !event.shiftKey && isP) || (ctrlOrCmd && isK)) {
    event.preventDefault();
    event.stopPropagation();
    openWithMode({ mode: 'navigation', initialValue: '' });
  }
};

// Expose to parent component to allow triggering search modal externally
defineExpose({
  close: () => (open.value = false),
  open: (mode?: 'command' | 'navigation') => openWithMode({ mode }),
  toggle: toggleOpen,
});

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown, { capture: true });

  // Custom events dispatched by app menubar, titlebar, or external scripts
  const handlePaletteEvent = (e: Event) => {
    const custom = e as CustomEvent<PaletteDetail>;
    openWithMode(custom.detail);
  };
  const handleLegacyOpen = () => openWithMode({ mode: 'navigation' });

  window.addEventListener('open-command-palette', handlePaletteEvent);
  window.addEventListener('open-global-search', handleLegacyOpen);

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown, {
      capture: true,
    });
    window.removeEventListener('open-command-palette', handlePaletteEvent);
    window.removeEventListener('open-global-search', handleLegacyOpen);
  });
});
</script>

<template>
  <div>
    <Dialog v-model:open="open" @update:open="handleOpenChange">
      <DialogContent
        :open="open"
        modal
        :centered="false"
        close-class="top-3"
        :aria-describedby="undefined"
        class="overflow-hidden p-0 sm:max-w-2xl border border-border shadow-2xl rounded-xl"
        @close="open = false"
      >
        <DialogTitle class="sr-only">
          {{ $t('ui.widgets.search.title') }}
        </DialogTitle>
        <Command>
          <!--
            We bypass Command's internal text filter in favor of SearchPanel's
            dual-mode fuzzy matching. CommandInput acts as the styled search input.
          -->
          <CommandInput
            v-model="keyword"
            :filter-fn="() => true"
            :placeholder="placeholder"
          />
          <CommandList class="max-h-[460px]">
            <SearchPanel
              :keyword="keyword"
              :menus="menus"
              @close="handleClose"
              @update:keyword="(val) => (keyword = val)"
            />
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>

    <Button
      v-if="showButton"
      type="button"
      variant="ghost"
      size="icon"
      :title="$t('ui.widgets.search.title')"
      :aria-label="$t('ui.widgets.search.title')"
      :aria-keyshortcuts="
        enableShortcutKey ? (isWindowsOs() ? 'Control+K' : 'Meta+K') : undefined
      "
      @click="toggleOpen"
    >
      <Search />
    </Button>
  </div>
</template>
