<script setup lang="ts">
import type { MenuRecordRaw } from '@operon/types';

import { nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { SearchX, X } from '@operon/icons';
import { $t } from '@operon/locales';
import { mapTree, traverseTreeValues, uniqueByField } from '@operon/utils';

import { VbenIcon, VbenScrollbar } from '@operon-core/shadcn-ui';
import { isHttpUrl } from '@operon-core/shared/utils';

import {
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useThrottleFn,
} from '@vueuse/core';

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
const emit = defineEmits<{ close: [] }>();

const router = useRouter();
const searchHistory = useLocalStorage<MenuRecordRaw[]>(
  `__search-history-${location.hostname}__`,
  [],
);
const activeIndex = ref(-1);
const searchItems = shallowRef<MenuRecordRaw[]>([]);
const searchResults = ref<MenuRecordRaw[]>([]);
const isNavigating = ref(false);

const handleSearch = useThrottleFn(search, 200);

// Search function to find matching menu items by keyword
function search(searchKey: string) {
  // Trim whitespace from search keyword
  searchKey = searchKey.trim();

  // Clear search results and return if keyword is empty
  if (!searchKey) {
    searchResults.value = [];
    return;
  }
  // Convert keyword to lowercase for case-insensitive matching
  searchKey = searchKey.toLowerCase();

  // Create regex from keyword
  const reg = createSearchReg(searchKey);

  // Initialize results array
  const results: MenuRecordRaw[] = [];

  // Iterate search items
  traverseTreeValues(searchItems.value, (item) => {
    // If menu item name matches regex, add to results
    if (reg.test(item.name?.toLowerCase())) {
      results.push(item);
    }
  });

  // Update search results
  searchResults.value = results;

  // Set active index to 0 if results exist
  if (results.length > 0) {
    activeIndex.value = 0;
  }

  // Set index to 0
  activeIndex.value = 0;
}

// When the keyboard up and down keys move to an invisible place
// the scroll bar needs to scroll automatically
function scrollIntoView() {
  const element = document.querySelector(
    `[data-search-item="${activeIndex.value}"]`,
  );

  if (element) {
    element.scrollIntoView({ block: 'nearest' });
  }
}

// enter keyboard event
async function handleEnter() {
  if (searchResults.value.length === 0) {
    return;
  }
  const result = searchResults.value;
  const index = activeIndex.value;
  if (result.length === 0 || index < 0) {
    return;
  }
  const to = result[index];
  if (to) {
    searchHistory.value = uniqueByField([...searchHistory.value, to], 'path');
    handleClose();
    await nextTick();
    if (isHttpUrl(to.path)) {
      window.open(to.path, '_blank');
    } else {
      router.push({ path: to.path, replace: true });
    }
  }
}

// Arrow key up
function handleUp() {
  if (searchResults.value.length === 0) {
    return;
  }
  isNavigating.value = true;
  activeIndex.value--;
  if (activeIndex.value < 0) {
    activeIndex.value = searchResults.value.length - 1;
  }
  scrollIntoView();
}

// Arrow key down
function handleDown() {
  if (searchResults.value.length === 0) {
    return;
  }
  isNavigating.value = true;
  activeIndex.value++;
  if (activeIndex.value > searchResults.value.length - 1) {
    activeIndex.value = 0;
  }
  scrollIntoView();
}

// close search modal
function handleClose() {
  searchResults.value = [];
  emit('close');
}

// Activate when the mouse moves to a certain line
function handleMouseenter(e: MouseEvent) {
  if (isNavigating.value) return;
  const index = (e.target as HTMLElement)?.dataset.index;
  activeIndex.value = Number(index);
}

function removeItem(index: number) {
  if (props.keyword) {
    searchResults.value.splice(index, 1);
  } else {
    searchHistory.value.splice(index, 1);
  }
  activeIndex.value = Math.max(activeIndex.value - 1, 0);
  scrollIntoView();
}

// Store special characters that require escaping
const code = new Set([
  '$',
  '(',
  ')',
  '*',
  '+',
  '.',
  '?',
  '[',
  '\\',
  ']',
  '^',
  '{',
  '|',
  '}',
]);

// Escape special characters in string
function transform(c: string) {
  // If char is in special list, return escaped char
  // Otherwise return char directly
  return code.has(c) ? `\\${c}` : c;
}

// Create search regex
function createSearchReg(key: string) {
  // Split input into characters
  // Escape each character
  // Join escaped characters with '.*' to construct regex
  const keys = [...key].map((item) => transform(item)).join('.*');
  // Return created RegExp
  return new RegExp(`.*${keys}.*`);
}

watch(
  () => props.keyword,
  (val) => {
    if (val) {
      handleSearch(val);
    } else {
      searchResults.value = searchHistory.value;
    }
  },
);

onMounted(() => {
  searchItems.value = mapTree(props.menus, (item) => {
    return {
      ...item,
      name: $t(item?.name),
    };
  });
  if (searchHistory.value.length > 0) {
    searchResults.value = searchHistory.value;
  }
  // enter search
  onKeyStroke('Enter', handleEnter);
  // Monitor keyboard arrow keys
  onKeyStroke('ArrowUp', handleUp);
  onKeyStroke('ArrowDown', handleDown);
  // esc close
  onKeyStroke('Escape', handleClose);
});

useEventListener('mousemove', () => {
  isNavigating.value = false;
});
</script>

<template>
  <VbenScrollbar>
    <div class="flex! h-full justify-center px-2 sm:max-h-112.5">
      <!-- No search results -->
      <div
        v-if="keyword && searchResults.length === 0"
        class="text-center text-muted-foreground"
      >
        <SearchX class="mx-auto mt-4 size-12" />
        <p class="mt-6 mb-10">
          {{ $t('ui.widgets.search.noResults') }}
          <span class="text-foreground"> "{{ keyword }}" </span>
        </p>
      </div>
      <!-- Search history & no search results -->
      <div
        v-if="!keyword && searchResults.length === 0"
        class="text-center text-muted-foreground"
      >
        <p class="my-10">
          {{ $t('ui.widgets.search.noRecent') }}
        </p>
      </div>

      <ul v-show="searchResults.length > 0" class="w-full">
        <li
          v-if="searchHistory.length > 0 && !keyword"
          class="mb-2 text-muted-foreground"
        >
          {{ $t('ui.widgets.search.recent') }}
        </li>
        <li
          v-for="(item, index) in uniqueByField(searchResults, 'path')"
          :key="item.path"
          :class="
            activeIndex === index
              ? 'active bg-primary text-primary-foreground'
              : ''
          "
          :data-index="index"
          :data-search-item="index"
          class="group mb-3 flex-center w-full cursor-pointer rounded-lg bg-accent p-4"
          @click="handleEnter"
          @mouseenter="handleMouseenter"
        >
          <VbenIcon :icon="item.icon" class="mr-2 size-5 shrink-0" fallback />

          <span class="flex-1">{{ item.name }}</span>
          <div
            class="flex-center rounded-full p-1 hover:scale-110 hover:text-primary-foreground dark:hover:bg-accent"
            @click.stop="removeItem(index)"
          >
            <X class="size-4" />
          </div>
        </li>
      </ul>
    </div>
  </VbenScrollbar>
</template>
