// @vitest-environment happy-dom
/* eslint-disable vue/multi-word-component-names, vue/no-reserved-component-names */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceStore } from '#/store/workspace';

import WorkspaceSelector from '../workspace-selector.vue';

// Mock dependencies
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('#/locales', () => ({
  $t: (key: string, params?: any) => {
    if (params?.name) return `${key}:${params.name}`;
    return key;
  },
}));

const mockTenants = [
  {
    avatar_url: null,
    created_at: '2026-01-01',
    created_by: null,
    id: 'ws-1',
    metadata: { plan: 'pro' },
    name: 'Acme Corp',
    slug: 'acme-corp',
    status: 'active' as const,
    updated_at: '2026-01-01',
  },
  {
    avatar_url: null,
    created_at: '2026-01-02',
    created_by: null,
    id: 'ws-2',
    metadata: { plan: 'free' },
    name: 'Staging Lab',
    slug: 'staging-lab',
    status: 'active' as const,
    updated_at: '2026-01-02',
  },
];

vi.mock('#/api/core/tenant', () => ({
  TENANT_PLAN: {
    ENTERPRISE: 'enterprise',
    FREE: 'free',
    PRO: 'pro',
  },
  createTenant: vi.fn(async (data) => ({
    id: 'ws-new',
    name: data.name,
    slug: data.slug,
    metadata: { plan: data.plan || 'pro' },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  getActiveTenantId: vi.fn(() => 'ws-1'),
  listTenants: vi.fn(async () => mockTenants),
  setActiveTenantId: vi.fn(),
}));

vi.mock('@operon-core/shadcn-ui', () => ({
  Badge: defineComponent({
    name: 'Badge',
    setup(_props, { slots }) {
      return () => h('span', { class: 'badge-stub' }, slots.default?.());
    },
  }),
  Button: defineComponent({
    name: 'Button',
    setup(_props, { slots }) {
      return () => h('button', { class: 'button-stub' }, slots.default?.());
    },
  }),
  Dialog: defineComponent({
    name: 'Dialog',
    setup(_props, { slots }) {
      return () => h('div', { class: 'dialog-stub' }, slots.default?.());
    },
  }),
  DialogContent: defineComponent({
    name: 'DialogContent',
    setup(_props, { slots }) {
      return () =>
        h('div', { class: 'dialog-content-stub' }, slots.default?.());
    },
  }),
  DialogFooter: defineComponent({
    name: 'DialogFooter',
    setup(_props, { slots }) {
      return () => h('div', { class: 'dialog-footer-stub' }, slots.default?.());
    },
  }),
  DialogHeader: defineComponent({
    name: 'DialogHeader',
    setup(_props, { slots }) {
      return () => h('div', { class: 'dialog-header-stub' }, slots.default?.());
    },
  }),
  DialogTitle: defineComponent({
    name: 'DialogTitle',
    setup(_props, { slots }) {
      return () => h('h2', { class: 'dialog-title-stub' }, slots.default?.());
    },
  }),
  Empty: defineComponent({
    name: 'Empty',
    setup(_props, { slots }) {
      return () => h('div', { class: 'empty-stub' }, slots.default?.());
    },
  }),
  EmptyDescription: defineComponent({
    name: 'EmptyDescription',
    setup(_props, { slots }) {
      return () =>
        h('div', { class: 'empty-description-stub' }, slots.default?.());
    },
  }),
  EmptyHeader: defineComponent({
    name: 'EmptyHeader',
    setup(_props, { slots }) {
      return () => h('div', { class: 'empty-header-stub' }, slots.default?.());
    },
  }),
  Input: defineComponent({
    name: 'Input',
    props: ['value'],
    setup(props) {
      return () => h('input', { class: 'input-stub', value: props.value });
    },
  }),
  Label: defineComponent({
    name: 'Label',
    setup(_props, { slots }) {
      return () => h('label', { class: 'label-stub' }, slots.default?.());
    },
  }),
  Popover: defineComponent({
    name: 'Popover',
    setup(_props, { slots }) {
      return () => h('div', { class: 'popover-stub' }, slots.default?.());
    },
  }),
  PopoverContent: defineComponent({
    name: 'PopoverContent',
    setup(_props, { slots }) {
      return () =>
        h('div', { class: 'popover-content-stub' }, slots.default?.());
    },
  }),
  PopoverTrigger: defineComponent({
    name: 'PopoverTrigger',
    setup(_props, { slots }) {
      return () =>
        h('div', { class: 'popover-trigger-stub' }, slots.default?.());
    },
  }),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('workspace selector component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('mounts and renders active workspace information', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useWorkspaceStore(pinia);
    store.workspaces = [...mockTenants];
    store.activeWorkspaceId = 'ws-1';

    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp(WorkspaceSelector);
    app.use(pinia);

    try {
      app.mount(container);
      await nextTick();

      const trigger = container.querySelector(
        '[data-testid="workspace-selector-trigger"]',
      );
      expect(trigger).not.toBeNull();
      expect(container.textContent).toContain('Acme Corp');
    } finally {
      app.unmount();
      container.remove();
    }
  });

  it('renders icon-only trigger when collapsed is true', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useWorkspaceStore(pinia);
    store.workspaces = [...mockTenants];
    store.activeWorkspaceId = 'ws-1';

    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp(WorkspaceSelector, { collapsed: true });
    app.use(pinia);

    try {
      app.mount(container);
      await nextTick();

      const collapsedTrigger = container.querySelector(
        '[data-testid="workspace-selector-trigger-collapsed"]',
      );
      expect(collapsedTrigger).not.toBeNull();
      expect(
        container.querySelector('[data-testid="workspace-selector-trigger"]'),
      ).toBeNull();
    } finally {
      app.unmount();
      container.remove();
    }
  });

  it('switches active workspace when selected in store', async () => {
    const store = useWorkspaceStore();
    store.workspaces = [...mockTenants];
    store.activeWorkspaceId = 'ws-1';

    expect(store.activeWorkspace?.name).toBe('Acme Corp');

    store.setWorkspace('ws-2');
    expect(store.activeWorkspaceId).toBe('ws-2');
    expect(store.activeWorkspace?.name).toBe('Staging Lab');
  });
});
