import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { tasksToCsv, usePlaygroundStore } from '../sample';

describe('playground tasks store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('hydrates 100 seed tasks and supports CRUD, bulk updates, and reset', () => {
    const store = usePlaygroundStore();
    expect(store.tasks).toHaveLength(100);
    expect(store.metrics.total).toBe(100);

    const created = store.createTask({
      title: 'Benchmark TanStack v9 faceting',
      status: 'in progress',
      priority: 'high',
      label: 'feature',
      assignee: 'linh',
      favorite: true,
      progress: 45,
    });
    expect(created.id).toMatch(/^TASK-\d+$/);
    expect(store.tasks[0]?.id).toBe(created.id);
    expect(store.metrics.total).toBe(101);

    const copy = store.duplicateTask(created.id);
    expect(copy?.title).toBe('Benchmark TanStack v9 faceting (Copy)');
    if (!copy) throw new Error('Expected duplicated task');
    expect(store.tasks).toHaveLength(102);

    const updatedCount = store.bulkUpdate([created.id, copy.id], {
      status: 'done',
    });
    expect(updatedCount).toBe(2);
    expect(store.tasks.find((t) => t.id === created.id)?.progress).toBe(100);

    const deletedCount = store.deleteTasks([created.id, copy.id]);
    expect(deletedCount).toBe(2);
    expect(store.tasks).toHaveLength(100);

    const remainingFirstId = store.tasks[0]?.id ?? '';
    store.deleteTasks([remainingFirstId]);
    expect(store.tasks).toHaveLength(99);
    store.resetTasks();
    expect(store.tasks).toHaveLength(100);
  });

  it('escapes quotes and commas in CSV output', () => {
    const csv = tasksToCsv([
      {
        id: 'TASK-1',
        title: 'Fix "edge", retry',
        status: 'done',
        priority: 'high',
        label: 'bug',
        assignee: 'alex',
        progress: 100,
        favorite: false,
        updatedAt: 'Just now',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      'TASK-1,"Fix ""edge"", retry",done,high,bug,alex,100,false,Just now',
    );
  });
});
