import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it, vi } from 'vitest';

import SystemView from '../index.vue';

vi.mock('@operon/kernel', () => ({
  useKernel: () => ({
    auth: { roles: [], hasCloudAuth: false },
    events: { notify: vi.fn() },
  }),
}));
vi.mock('@operon-core/shadcn-ui', () => ({
  Badge: defineComponent({ template: '<span><slot /></span>' }),
  Button: defineComponent({ template: '<button><slot /></button>' }),
  Card: defineComponent({ template: '<div><slot /></div>' }),
}));

describe('system screen routing', () => {
  it('navigates by name when the app is nested under the shell layout', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          children: [
            {
              path: '/system',
              children: [
                {
                  path: 'overview',
                  name: 'SystemOverview',
                  component: SystemView,
                },
                { path: 'users', name: 'SystemUsers', component: SystemView },
              ],
            },
          ],
        },
      ],
    });
    await router.push('/system/overview');
    const props = reactive<{ tab: 'overview' | 'roles' | 'users' }>({
      tab: 'overview',
    });
    const host = document.createElement('div');
    const app = createApp({ render: () => h(SystemView, props) });
    app.use(router);
    app.mount(host);
    const label = [...host.querySelectorAll('span')].find(
      (item) => item.textContent?.trim() === 'Registered Users',
    );
    expect(label).toBeDefined();
    if (!label) throw new Error('Users navigation card is missing');
    label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe('/system/users'),
    );
    props.tab = 'users';
    await nextTick();
    expect(host.textContent).toContain('User Management');
    props.tab = 'roles';
    await nextTick();
    expect(host.textContent).toContain('RBAC Roles & Permissions');
    props.tab = 'users';
    await nextTick();
    expect(host.textContent).toContain('User Management');
    app.unmount();
  });
});
