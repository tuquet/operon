<script lang="ts" setup>
import type { Task, TaskDraft } from '../tasks/data/schema';

import { computed, ref } from 'vue';

import { useKernel } from '@operon/kernel';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@operon-core/shadcn-ui';

import { Download, ListTodo, RotateCcw, SearchX } from '@lucide/vue';

import { DataTable } from '../components/data-table';
import { $t } from '../locales';
import { tasksToCsv, usePlaygroundStore } from '../stores/sample';
import { createTaskColumns } from '../tasks/components/columns';
import TaskInspectorSheet from '../tasks/components/TaskInspectorSheet.vue';
import TasksTableBulkBar from '../tasks/components/TasksTableBulkBar.vue';
import TasksTableMetrics from '../tasks/components/TasksTableMetrics.vue';
import TasksTableToolbar from '../tasks/components/TasksTableToolbar.vue';

defineOptions({ name: 'PlaygroundOverviewView' });

const kernel = useKernel();
const store = usePlaygroundStore();

const copiedId = ref<null | string>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const favoritesOnly = ref(false);
const visibleTasks = computed(() =>
  favoritesOnly.value
    ? store.tasks.filter((task) => task.favorite)
    : store.tasks,
);

const inspectorOpen = ref(false);
const inspectorMode = ref<'create' | 'edit'>('edit');
const activeTaskId = ref<null | string>(null);
const activeTask = computed<null | Task>(() =>
  activeTaskId.value
    ? (store.tasks.find((t) => t.id === activeTaskId.value) ?? null)
    : null,
);

function openCreateSheet() {
  inspectorMode.value = 'create';
  activeTaskId.value = null;
  inspectorOpen.value = true;
}

function openInspectSheet(task: Task) {
  inspectorMode.value = 'edit';
  activeTaskId.value = task.id;
  inspectorOpen.value = true;
}

async function copyTaskId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
  } catch {
    // Clipboard unavailable in restricted contexts
  }
  copiedId.value = id;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copiedId.value = null;
  }, 1500);
  kernel.events.notify('info', `Copied ${id} to clipboard`);
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function handleExportCsv(rows: Task[]) {
  downloadBlob('operon-tasks.csv', tasksToCsv(rows), 'text/csv;charset=utf-8;');
  kernel.events.notify('success', `Exported ${rows.length} task(s) to CSV`);
}

function handleExportJson(rows: Task[]) {
  downloadBlob(
    'operon-tasks.json',
    JSON.stringify(rows, null, 2),
    'application/json;charset=utf-8;',
  );
  kernel.events.notify('success', `Exported ${rows.length} task(s) to JSON`);
}

function handleCreate(draft: TaskDraft) {
  const created = store.createTask(draft);
  kernel.events.notify('success', `Created ${created.id}: ${created.title}`);
}

function handleSave(id: string, draft: TaskDraft) {
  store.updateTask(id, draft);
  kernel.events.notify('success', `Saved changes to ${id}`);
}

function handleDeleteSingle(id: string) {
  store.deleteTasks([id]);
  kernel.events.notify('info', `Deleted ${id}`);
}

function handleBulkUpdate(
  selectedRows: Task[],
  patch: Partial<Pick<Task, 'assignee' | 'label' | 'priority' | 'status'>>,
) {
  const ids = selectedRows.map((t) => t.id);
  if (ids.length === 0) return;
  const updated = store.bulkUpdate(ids, patch);
  kernel.events.notify('success', `Updated ${updated} selected task(s)`);
}

function handleBulkDelete(selectedRows: Task[], clearSelection: () => void) {
  const ids = selectedRows.map((t) => t.id);
  if (ids.length === 0) return;
  const deleted = store.deleteTasks(ids);
  clearSelection();
  kernel.events.notify('info', `Deleted ${deleted} task(s)`);
}

function handleReset() {
  store.resetTasks();
  kernel.events.notify('info', 'Tasks synced to tenant baseline');
}

const columns = createTaskColumns(
  {
    onInspect: openInspectSheet,
    onCopyId: copyTaskId,
    onDuplicate: (id) => {
      const copy = store.duplicateTask(id);
      if (copy) kernel.events.notify('success', `Duplicated as ${copy.id}`);
    },
    onToggleFavorite: (id) => {
      const pinned = store.toggleFavorite(id);
      kernel.events.notify(
        'info',
        pinned ? `Pinned ${id} to favorites` : `Unpinned ${id}`,
      );
    },
    onQuickUpdate: (id, patch) => {
      store.bulkUpdate([id], patch);
      kernel.events.notify('success', `Updated ${id}`);
    },
    onDelete: handleDeleteSingle,
  },
  copiedId,
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3.5 overflow-hidden p-4 sm:p-5">
    <!-- Compact Single-Line Page Header -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <ListTodo class="text-primary size-4" />
        <h2 class="text-base font-semibold tracking-tight">
          {{ $t('playground.title') }}
        </h2>
      </div>

      <div class="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          class="text-muted-foreground hover:text-foreground h-8 text-xs font-normal"
          @click="handleExportCsv(store.tasks)"
        >
          <Download class="mr-1.5 size-3.5 opacity-70" />
          {{ $t('playground.export_csv') }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="text-muted-foreground hover:text-foreground h-8 text-xs font-normal"
          @click="handleReset"
        >
          <RotateCcw class="mr-1.5 size-3.5 opacity-70" />
          {{ $t('playground.reset_btn') }}
        </Button>
      </div>
    </div>

    <!-- Reusable Generic DataTable Composed with Domain Slots -->
    <DataTable
      class="min-h-0 flex-1"
      :columns="columns"
      :data="visibleTasks"
      row-key="id"
      enable-row-selection
      interactive-rows
      :initial-column-visibility="{ label: false }"
      :empty-title="$t('playground.empty_title')"
      :empty-description="$t('playground.empty_description')"
      @row-click="openInspectSheet"
      @reset-filters="favoritesOnly = false"
    >
      <template #header="{ table }">
        <TasksTableMetrics :table="table" :metrics="store.metrics" />
      </template>

      <template
        #toolbar="{ table, density, setDensity, isFiltered, resetFilters }"
      >
        <TasksTableToolbar
          :table="table"
          :density="density"
          :is-filtered="isFiltered"
          v-model:favorites-only="favoritesOnly"
          @update:density="setDensity"
          @reset="resetFilters"
          @create="openCreateSheet"
        />
      </template>

      <template #empty="{ resetFilters }">
        <Empty class="min-h-[240px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX class="text-muted-foreground size-5" />
            </EmptyMedia>
            <EmptyTitle>No matching tasks</EmptyTitle>
            <EmptyDescription>
              No tasks match your current search or filter criteria.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            size="sm"
            class="mt-4"
            @click="resetFilters"
          >
            Clear all filters
          </Button>
        </Empty>
      </template>

      <template #footer="{ selectedRows, clearSelection }">
        <TasksTableBulkBar
          :selected-tasks="selectedRows"
          @bulk-update="(patch) => handleBulkUpdate(selectedRows, patch)"
          @bulk-delete="handleBulkDelete(selectedRows, clearSelection)"
          @export-csv="handleExportCsv(selectedRows)"
          @export-json="handleExportJson(selectedRows)"
          @clear="clearSelection"
        />
      </template>
    </DataTable>

    <!-- Slide-Over Inspector / Creator -->
    <TaskInspectorSheet
      v-model:open="inspectorOpen"
      :mode="inspectorMode"
      :task="activeTask"
      @create="handleCreate"
      @save="handleSave"
      @delete="handleDeleteSingle"
    />
  </div>
</template>
