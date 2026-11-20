<script setup lang="ts">
import type { VueTable } from '@tanstack/vue-table';

import type {
  DataTableDensity,
  DataTableFeatures,
} from '../../components/data-table';
import type { Task } from '../data/schema';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Kbd,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { Plus, Search, Star, X } from '@lucide/vue';

import {
  DataTableDensityToggle,
  DataTableFacetedFilter,
  DataTableViewOptions,
} from '../../components/data-table';
import { assignees, labels, priorities, statuses } from '../data/data';

interface TasksTableToolbarProps {
  density: DataTableDensity;
  favoritesOnly: boolean;
  isFiltered: boolean;
  table: VueTable<DataTableFeatures, Task>;
}

const props = defineProps<TasksTableToolbarProps>();

const emit = defineEmits<{
  create: [];
  reset: [];
  'update:density': [value: DataTableDensity];
  'update:favoritesOnly': [value: boolean];
}>();

const FACET_FILTERS = [
  { columnId: 'status', options: statuses, title: 'Status' },
  { columnId: 'priority', options: priorities, title: 'Priority' },
  { columnId: 'label', options: labels, title: 'Label' },
  { columnId: 'assignee', options: assignees, title: 'Assignee' },
] as const;

const searchWrapperRef = ref<HTMLElement | null>(null);

const searchQuery = computed(
  () => (props.table.getColumn('title')?.getFilterValue() as string) ?? '',
);

const hasActiveFilters = computed(
  () => props.isFiltered || props.favoritesOnly,
);

function setSearch(value: number | string) {
  props.table.getColumn('title')?.setFilterValue(String(value) || undefined);
}

function handleGlobalSlash(e: KeyboardEvent) {
  if (
    e.key !== '/' ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    !searchWrapperRef.value?.offsetParent ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(
      (e.target as HTMLElement | null)?.tagName ?? '',
    )
  ) {
    return;
  }
  e.preventDefault();
  searchWrapperRef.value.querySelector('input')?.focus();
}

onMounted(() => window.addEventListener('keydown', handleGlobalSlash));
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalSlash));
</script>

<template>
  <div
    class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between"
  >
    <div class="flex flex-1 flex-wrap items-center gap-1.5">
      <div ref="searchWrapperRef" class="w-full sm:w-[230px] lg:w-[260px]">
        <InputGroup>
          <InputGroupAddon class="pointer-events-none absolute left-0 px-2.5">
            <Search class="size-3.5 opacity-70" />
          </InputGroupAddon>
          <InputGroupInput
            :model-value="searchQuery"
            placeholder="Filter tasks..."
            class="bg-background h-8 pr-11 pl-8 text-xs"
            @update:model-value="setSearch"
          />
          <InputGroupAddon class="absolute right-0 px-2">
            <Button
              v-if="searchQuery"
              type="button"
              variant="ghost"
              size="icon"
              class="size-5 rounded-sm"
              title="Clear search"
              @click="setSearch('')"
            >
              <X class="size-3.5" />
            </Button>
            <Kbd v-else class="pointer-events-none text-[10px]">/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <template v-for="facet in FACET_FILTERS" :key="facet.columnId">
        <DataTableFacetedFilter
          v-if="table.getColumn(facet.columnId)"
          :column="table.getColumn(facet.columnId)"
          :title="facet.title"
          :options="facet.options"
        />
      </template>

      <Button
        variant="outline"
        size="sm"
        :class="
          cn(
            'h-8 border-dashed text-xs font-normal transition-colors',
            favoritesOnly
              ? 'border-amber-500/40 bg-amber-500/8 font-medium text-amber-600 dark:text-amber-400'
              : 'border-border/80 text-muted-foreground hover:text-foreground',
          )
        "
        @click="emit('update:favoritesOnly', !favoritesOnly)"
      >
        <Star
          class="mr-1.5 size-3.5"
          :class="
            favoritesOnly ? 'fill-amber-400 text-amber-400' : 'opacity-70'
          "
        />
        Pinned
      </Button>

      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground h-8 px-2.5 text-xs"
        @click="emit('reset')"
      >
        Reset
        <X class="ml-1 size-3.5" />
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <DataTableDensityToggle
        :model-value="density"
        @update:model-value="(val) => emit('update:density', val)"
      />

      <DataTableViewOptions :table="table" />

      <Button
        size="sm"
        class="h-8 text-xs font-medium shadow-2xs"
        @click="emit('create')"
      >
        <Plus class="mr-1.5 size-3.5" />
        New Task
      </Button>
    </div>
  </div>
</template>
