<script setup lang="ts">
import type { MenuRecordRaw } from '@operon/types';

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { ArrowDown, ArrowUp, CornerDownLeft, Search, X } from '@operon/icons';
import { $t } from '@operon/locales';
import { isWindowsOs } from '@operon/utils';

import { useVbenModal } from '@operon-core/popup-ui';
import { Input, Kbd } from '@operon-core/shadcn-ui';

import { useMagicKeys, whenever } from '@vueuse/core';

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

const keyword = ref('');
const searchInputRef = ref<InstanceType<typeof Input> | null>(null);

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      keyword.value = '';
    }
  },
});
const open = modalApi.useStore((state) => state.isOpen);

function handleClose() {
  modalApi.close();
  keyword.value = '';
}

const keys = useMagicKeys();
const cmd = isWindowsOs() ? keys['ctrl+k'] : keys['cmd+k'];
if (cmd) {
  whenever(cmd, () => {
    if (props.enableShortcutKey) {
      modalApi.open();
    }
  });
}

whenever(open, () => {
  nextTick(() => {
    const el = (searchInputRef.value?.$el ?? searchInputRef.value) as
      | HTMLElement
      | undefined;
    el?.focus?.();
  });
});

const preventDefaultBrowserSearchHotKey = (event: KeyboardEvent) => {
  if (event.key?.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
  }
};

const toggleKeydownListener = () => {
  if (props.enableShortcutKey) {
    window.addEventListener('keydown', preventDefaultBrowserSearchHotKey);
  } else {
    window.removeEventListener('keydown', preventDefaultBrowserSearchHotKey);
  }
};

const toggleOpen = () => {
  open.value ? modalApi.close() : modalApi.open();
};

watch(() => props.enableShortcutKey, toggleKeydownListener);

onMounted(() => {
  toggleKeydownListener();

  onUnmounted(() => {
    window.removeEventListener('keydown', preventDefaultBrowserSearchHotKey);
  });
});

// Expose to parent component to allow triggering search modal externally (e.g. from user-dropdown)
defineExpose({
  open: () => modalApi.open(),
  close: () => modalApi.close(),
  toggle: toggleOpen,
});
</script>

<template>
  <div>
    <Modal
      :fullscreen-button="false"
      class="w-150"
      header-class="py-2 border-b"
    >
      <template #title>
        <div class="flex items-center">
          <Search class="mr-2 size-4 text-muted-foreground" />
          <Input
            ref="searchInputRef"
            v-model="keyword"
            :placeholder="$t('ui.widgets.search.searchNavigate')"
            class="h-8 w-[80%] border-none bg-transparent px-2.5 py-1 shadow-none outline-hidden focus-visible:ring-0 focus-visible:ring-transparent"
          />
        </div>
      </template>

      <SearchPanel :keyword="keyword" :menus="menus" @close="handleClose" />
      <template #footer>
        <div class="flex w-full justify-start">
          <div class="mr-2 flex items-center">
            <CornerDownLeft class="mr-1 size-3" />
            {{ $t('ui.widgets.search.select') }}
          </div>
          <div class="mr-2 flex items-center">
            <ArrowUp class="mr-1 size-3" />
            <ArrowDown class="mr-1 size-3" />
            {{ $t('ui.widgets.search.navigate') }}
          </div>
          <div class="flex items-center">
            <X class="mr-1 size-3" />
            {{ $t('ui.widgets.search.close') }}
          </div>
        </div>
      </template>
    </Modal>
    <div
      v-if="showButton"
      class="group flex h-8 cursor-pointer items-center gap-3 rounded-2xl border-none bg-none px-2 py-0.5 outline-hidden md:bg-accent"
      @click="toggleOpen()"
    >
      <Search
        class="size-4 text-muted-foreground group-hover:text-foreground group-hover:opacity-100"
      />
      <span
        class="hidden text-muted-foreground duration-300 group-hover:text-foreground md:block"
      >
        {{ $t('ui.widgets.search.title') }}
      </span>
      <Kbd
        v-if="enableShortcutKey"
        class="hidden rounded-sm rounded-r-xl bg-background px-1.5 py-1 leading-none text-muted-foreground group-hover:text-foreground md:inline-flex"
      >
        {{ isWindowsOs() ? 'Ctrl' : '⌘' }} K
      </Kbd>
      <span v-else></span>
    </div>
  </div>
</template>
