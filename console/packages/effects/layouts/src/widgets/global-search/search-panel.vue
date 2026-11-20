<script setup lang="ts">
import type { MenuRecordRaw } from '@operon/types';

import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { X } from '@operon/icons';
import { $t } from '@operon/locales';
import { mapTree, traverseTreeValues, uniqueByField } from '@operon/utils';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Kbd,
  VbenIcon,
} from '@operon-core/shadcn-ui';
import { isHttpUrl } from '@operon-core/shared/utils';

import {
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useThrottleFn,
} from '@vueuse/core';

import { getBuiltinCommands } from './commands-registry';

defineOptions({
  name: 'SearchPanel',
});

const props = withDefaults(
  defineProps<{ keyword?: string; menus?: MenuRecordRaw[] }>(),
  {
    keyword: '',
    menus: () => [],
  },
);

const emit = defineEmits<{
  close: [];
  'update:keyword': [value: string];
}>();

export interface PaletteItem {
  category?: string;
  handler?: () => Promise<void> | void;
  icon: any;
  id: string;
  path?: string;
  shortcut?: string;
  title: string;
  type: 'command' | 'navigation';
}

const router = useRouter();

// Persistent search & command history
const searchHistory = useLocalStorage<PaletteItem[]>(
  `__operon_palette_history-${location.hostname}__`,
  [],
);

const activeIndex = ref(0);
const navigationItems = shallowRef<PaletteItem[]>([]);
const searchResults = ref<PaletteItem[]>([]);
const isNavigating = ref(false);

const isCommandMode = computed(() => props.keyword?.startsWith('>'));
const searchQuery = computed(() => {
  const raw = props.keyword || '';
  return isCommandMode.value ? raw.slice(1).trim() : raw.trim();
});

const isRecentView = computed(
  () =>
    !searchQuery.value &&
    !isCommandMode.value &&
    searchHistory.value.length > 0,
);

const handleSearch = useThrottleFn(performSearch, 150);

function performSearch() {
  const query = searchQuery.value.toLowerCase();
  const allCommands = getBuiltinCommands().map((cmd): PaletteItem => ({
    category: cmd.category,
    handler: cmd.handler,
    icon: cmd.icon,
    id: cmd.id,
    shortcut: cmd.shortcut,
    title: cmd.title,
    type: 'command',
  }));

  // ── Mode 1: Command Mode (prefix '>') ─────────────────────────────────────
  if (isCommandMode.value) {
    searchResults.value = query
      ? allCommands.filter((cmd) => {
          const titleMatch = cmd.title.toLowerCase().includes(query);
          const catMatch = cmd.category?.toLowerCase().includes(query);
          const keywordMatch = (
            getBuiltinCommands().find((c) => c.id === cmd.id)?.keywords || []
          ).some((k) => k.toLowerCase().includes(query));
          return titleMatch || catMatch || keywordMatch;
        })
      : allCommands;
    activeIndex.value = 0;
    return;
  }

  // ── Mode 2: Navigation Mode ───────────────────────────────────────────────
  if (query) {
    // Search in navigation routes
    const matchedNav: PaletteItem[] = [];
    for (const item of navigationItems.value) {
      if (item.title.toLowerCase().includes(query)) {
        matchedNav.push(item);
      }
    }

    // Also include matching commands for discoverability
    const matchedCmds = allCommands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(query);
      const keywordMatch = (
        getBuiltinCommands().find((c) => c.id === cmd.id)?.keywords || []
      ).some((k) => k.toLowerCase().includes(query));
      return titleMatch || keywordMatch;
    });

    searchResults.value = [...matchedNav, ...matchedCmds];
  } else {
    // Show recent history if available; otherwise show all navigation items (VS Code Quick Open behavior)
    searchResults.value =
      searchHistory.value.length > 0
        ? searchHistory.value
        : navigationItems.value;
  }
  activeIndex.value = 0;
}

function getHighlightedParts(text: string, query: string) {
  if (!query) return [{ highlight: false, text }];
  const lowerText = text.toLowerCase();
  const lowerKey = query.toLowerCase();
  const index = lowerText.indexOf(lowerKey);
  if (index === -1) {
    return [{ highlight: false, text }];
  }
  return [
    { highlight: false, text: text.slice(0, index) },
    { highlight: true, text: text.slice(index, index + lowerKey.length) },
    { highlight: false, text: text.slice(index + lowerKey.length) },
  ];
}

function scrollIntoView() {
  const element = document.querySelector(
    `[data-palette-item="${activeIndex.value}"]`,
  );
  if (element) {
    element.scrollIntoView({ block: 'nearest' });
  }
}

async function handleSelect(item?: PaletteItem) {
  const target = item || searchResults.value[activeIndex.value];
  if (!target) return;

  // Persist to history (deduplicated by id, max 10 recent items)
  searchHistory.value = uniqueByField(
    [target, ...searchHistory.value],
    'id',
  ).slice(0, 10);

  emit('close');
  await nextTick();

  if (target.type === 'command') {
    await target.handler?.();
  } else if (target.path) {
    if (isHttpUrl(target.path)) {
      window.open(target.path, '_blank');
    } else {
      router.push({ path: target.path, replace: true });
    }
  }
}

function handleUp() {
  if (searchResults.value.length === 0) return;
  isNavigating.value = true;
  activeIndex.value =
    activeIndex.value <= 0
      ? searchResults.value.length - 1
      : activeIndex.value - 1;
  scrollIntoView();
}

function handleDown() {
  if (searchResults.value.length === 0) return;
  isNavigating.value = true;
  activeIndex.value =
    activeIndex.value >= searchResults.value.length - 1
      ? 0
      : activeIndex.value + 1;
  scrollIntoView();
}

function handleMouseenter(e: MouseEvent) {
  if (isNavigating.value) return;
  const idx = (e.currentTarget as HTMLElement)?.dataset.index;
  if (idx !== undefined) {
    activeIndex.value = Number(idx);
  }
}

function removeItem(index: number) {
  if (isRecentView.value) {
    searchHistory.value.splice(index, 1);
    searchResults.value =
      searchHistory.value.length > 0
        ? searchHistory.value
        : navigationItems.value;
  } else {
    searchResults.value.splice(index, 1);
  }
  activeIndex.value = Math.max(
    0,
    Math.min(activeIndex.value, searchResults.value.length - 1),
  );
}

function handleClose() {
  searchResults.value = [];
  emit('close');
}

watch(
  () => props.keyword,
  () => {
    handleSearch();
  },
);

onMounted(() => {
  // Flatten router menu tree into searchable items
  const flatItems: PaletteItem[] = [];
  const translatedMenus = mapTree(props.menus, (item) => ({
    ...item,
    name: $t(item?.name),
  }));

  traverseTreeValues(translatedMenus, (item) => {
    if (item.path && item.name) {
      flatItems.push({
        category: $t('ui.widgets.search.groupNavigation') || 'Navigation',
        icon: item.icon || 'lucide:compass',
        id: item.path,
        path: item.path,
        title: item.name,
        type: 'navigation',
      });
    }
  });

  navigationItems.value = flatItems;
  performSearch();

  // Keyboard bindings
  onKeyStroke('Enter', (e) => {
    e.preventDefault();
    handleSelect();
  });
  onKeyStroke('ArrowUp', (e) => {
    e.preventDefault();
    handleUp();
  });
  onKeyStroke('ArrowDown', (e) => {
    e.preventDefault();
    handleDown();
  });
  onKeyStroke('Escape', (e) => {
    e.preventDefault();
    handleClose();
  });
});

useEventListener('mousemove', () => {
  isNavigating.value = false;
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Results / List Container -->
    <div class="max-h-[380px] overflow-y-auto px-2 py-2">
      <!-- Empty State -->
      <Empty v-if="searchResults.length === 0" class="py-8">
        <EmptyHeader>
          <EmptyTitle>
            {{
              searchQuery
                ? $t('ui.widgets.search.noResults')
                : $t('ui.widgets.search.noRecent')
            }}
          </EmptyTitle>
          <EmptyDescription v-if="searchQuery">
            {{ searchQuery }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <!-- Items List -->
      <div v-else class="w-full space-y-1">
        <!-- Group Header -->
        <div
          class="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          {{
            isRecentView
              ? $t('ui.widgets.search.recent')
              : isCommandMode
                ? $t('ui.widgets.search.groupCommands')
                : $t('ui.widgets.search.groupNavigation')
          }}
        </div>

        <ul class="w-full space-y-0.5">
          <li
            v-for="(item, index) in searchResults"
            :key="item.id"
            :data-index="index"
            :data-palette-item="index"
            class="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors select-none"
            :class="[
              activeIndex === index
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-accent/60',
            ]"
            @mouseenter="handleMouseenter"
            @click="handleSelect(item)"
          >
            <!-- Left: Icon + Category + Highlighted Title -->
            <div class="flex min-w-0 flex-1 items-center gap-2.5">
              <VbenIcon
                :icon="item.icon"
                fallback
                class="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
              />
              <div class="flex min-w-0 flex-1 items-center truncate text-sm">
                <span
                  v-if="item.category"
                  class="mr-1.5 shrink-0 text-xs font-medium text-muted-foreground"
                >
                  {{ item.category }}:
                </span>
                <span class="truncate font-normal">
                  <template
                    v-for="(part, pIdx) in getHighlightedParts(
                      item.title,
                      searchQuery,
                    )"
                    :key="pIdx"
                  >
                    <span
                      v-if="part.highlight"
                      class="font-semibold text-primary underline decoration-primary/50"
                    >
                      {{ part.text }}
                    </span>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </span>
              </div>
            </div>

            <!-- Right: Kbd Shortcut & Remove button -->
            <div class="flex shrink-0 items-center gap-1.5">
              <Kbd
                v-if="item.shortcut"
                class="h-5 px-1.5 text-[10px] font-mono"
              >
                {{ item.shortcut }}
              </Kbd>
              <Button
                v-if="isRecentView"
                type="button"
                variant="ghost"
                size="icon"
                class="size-6 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 transition-opacity"
                :aria-label="$t('common.delete')"
                @click.stop="removeItem(index)"
              >
                <X class="size-3.5" />
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- VS Code Style Footer Bar -->
    <div
      class="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground select-none"
    >
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1">
          <Kbd class="h-4.5 px-1 text-[10px] font-mono">↑</Kbd>
          <Kbd class="h-4.5 px-1 text-[10px] font-mono">↓</Kbd>
          <span>{{ $t('ui.widgets.search.hintNavigate') }}</span>
        </span>
        <span class="flex items-center gap-1">
          <Kbd class="h-4.5 px-1 text-[10px] font-mono">↵</Kbd>
          <span>{{ $t('ui.widgets.search.hintSelect') }}</span>
        </span>
        <span class="flex items-center gap-1">
          <Kbd class="h-4.5 px-1 text-[10px] font-mono">esc</Kbd>
          <span>{{ $t('ui.widgets.search.hintClose') }}</span>
        </span>
      </div>
      <div class="flex items-center gap-1">
        <Kbd class="h-4.5 px-1 font-mono text-[10px]">&gt;</Kbd>
        <span>{{ $t('ui.widgets.search.hintTypeCommand') }}</span>
      </div>
    </div>
  </div>
</template>
