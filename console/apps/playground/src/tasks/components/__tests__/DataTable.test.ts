import { createApp, h, nextTick } from 'vue';

import { createPinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';

import PlaygroundOverviewView from '../../../views/index.vue';

vi.mock('@operon/kernel', () => ({
  useKernel: () => ({
    auth: { hasCloudAuth: false, roles: ['local_operator'] },
    events: { notify: vi.fn() },
  }),
}));

describe('playground overview view full DOM rendering', () => {
  it('mounts header, compact metrics, toolbar, 10 table rows, and sticky sheet footer cleanly', async () => {
    const errors: unknown[] = [];
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => h(PlaygroundOverviewView) });
    app.use(createPinia());
    app.config.errorHandler = (err) => {
      errors.push(err);
    };
    app.mount(host);

    expect(errors).toEqual([]);
    const bodyRows = host.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(10);
    expect(host.textContent).toContain('All Issues');
    expect(host.textContent).toContain('Linh Nguyen');
    expect(host.textContent).toContain('Rows per page');

    // Click "+ New Task" and verify Sheet + sticky Footer buttons render cleanly
    const newTaskBtn = [...host.querySelectorAll('button')].find((btn) =>
      btn.textContent?.includes('New Task'),
    );
    expect(newTaskBtn).toBeDefined();
    newTaskBtn?.click();
    await nextTick();

    expect(document.body.textContent).toContain('Pin to favorites');
    expect(document.body.textContent).toContain('Create Task');
    expect(document.body.textContent).toContain('Cancel');
    expect(errors).toEqual([]);

    app.unmount();
    host.remove();
  });
});
