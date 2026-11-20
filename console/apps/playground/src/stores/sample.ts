import type { Task, TaskDraft } from '../tasks/data/schema';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { assignees } from '../tasks/data/data';
import rawTasks from '../tasks/data/tasks.json';

const RELATIVE_TIMES = [
  '12m ago',
  '1h ago',
  '3h ago',
  'Yesterday',
  '2d ago',
  '4d ago',
  'Nov 06',
  'Nov 02',
];

function deriveProgress(status: string, index: number): number {
  if (status === 'done') return 100;
  if (status === 'canceled' || status === 'backlog') return 0;
  if (status === 'todo') return index % 2 === 0 ? 0 : 25;
  const inProgressSteps = [25, 50, 75] as const;
  return inProgressSteps[index % inProgressSteps.length] ?? 50;
}

export function hydrateSeedTasks(): Task[] {
  return rawTasks.map((item, index) => ({
    ...item,
    assignee: assignees[index % assignees.length]?.value ?? 'linh',
    favorite: index < 4 || (item.priority === 'high' && index % 9 === 0),
    progress: deriveProgress(item.status, index),
    updatedAt: RELATIVE_TIMES[index % RELATIVE_TIMES.length] ?? '1h ago',
  }));
}

function escapeCsvCell(value: boolean | number | string): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function tasksToCsv(rows: Task[]): string {
  const headers = [
    'id',
    'title',
    'status',
    'priority',
    'label',
    'assignee',
    'progress',
    'favorite',
    'updatedAt',
  ] as const;
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((key) => escapeCsvCell(row[key])).join(','),
    ),
  ];
  return lines.join('\n');
}

export const usePlaygroundStore = defineStore('playground:tasks', () => {
  const tasks = ref<Task[]>(hydrateSeedTasks());
  let seq = 9000;

  const metrics = computed(() => {
    const total = tasks.value.length;
    let inProgress = 0;
    let highPriority = 0;
    let done = 0;

    for (const task of tasks.value) {
      if (task.status === 'in progress') inProgress += 1;
      if (task.priority === 'high') highPriority += 1;
      if (task.status === 'done') done += 1;
    }

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, inProgress, highPriority, done, completionRate };
  });

  function nextTaskId(): string {
    const existing = new Set(tasks.value.map((t) => t.id));
    while (existing.has(`TASK-${seq}`)) {
      seq += 1;
    }
    const id = `TASK-${seq}`;
    seq += 1;
    return id;
  }

  function normalizeProgress(status: string, progress: number): number {
    if (status === 'done') return 100;
    if (status === 'canceled') return 0;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  function createTask(draft: TaskDraft): Task {
    const created: Task = {
      ...draft,
      id: nextTaskId(),
      progress: normalizeProgress(draft.status, draft.progress),
      updatedAt: 'Just now',
    };
    tasks.value = [created, ...tasks.value];
    return created;
  }

  function updateTask(
    id: string,
    patch: Partial<Omit<Task, 'id' | 'updatedAt'>>,
  ): Task | undefined {
    let updatedItem: Task | undefined;
    tasks.value = tasks.value.map((task) => {
      if (task.id !== id) return task;
      const nextStatus = patch.status ?? task.status;
      const nextProgress = normalizeProgress(
        nextStatus,
        patch.progress ?? task.progress,
      );

      updatedItem = {
        ...task,
        ...patch,
        progress: nextProgress,
        updatedAt: 'Just now',
      };
      return updatedItem;
    });
    return updatedItem;
  }

  function duplicateTask(id: string): Task | undefined {
    const idx = tasks.value.findIndex((task) => task.id === id);
    const source = idx === -1 ? undefined : tasks.value[idx];
    if (!source) return undefined;
    const copy: Task = {
      ...source,
      id: nextTaskId(),
      title: `${source.title} (Copy)`,
      updatedAt: 'Just now',
    };
    const next = [...tasks.value];
    next.splice(idx + 1, 0, copy);
    tasks.value = next;
    return copy;
  }

  function toggleFavorite(id: string): boolean {
    const target = tasks.value.find((t) => t.id === id);
    if (!target) return false;
    const nextState = !target.favorite;
    updateTask(id, { favorite: nextState });
    return nextState;
  }

  function bulkUpdate(
    ids: string[],
    patch: Partial<Pick<Task, 'assignee' | 'label' | 'priority' | 'status'>>,
  ): number {
    const idSet = new Set(ids);
    let count = 0;
    tasks.value = tasks.value.map((task) => {
      if (!idSet.has(task.id)) return task;
      count += 1;
      const nextStatus = patch.status ?? task.status;
      return {
        ...task,
        ...patch,
        progress: normalizeProgress(nextStatus, task.progress),
        updatedAt: 'Just now',
      };
    });
    return count;
  }

  function deleteTasks(ids: string[]): number {
    const idSet = new Set(ids);
    const before = tasks.value.length;
    tasks.value = tasks.value.filter((task) => !idSet.has(task.id));
    return before - tasks.value.length;
  }

  function resetTasks() {
    tasks.value = hydrateSeedTasks();
  }

  return {
    tasks,
    metrics,
    createTask,
    updateTask,
    duplicateTask,
    toggleFavorite,
    bulkUpdate,
    deleteTasks,
    resetTasks,
  };
});
