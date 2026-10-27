// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { isInteractiveCellClick } from '../types';
import VxeRowDetailSheet from '../vxe-row-detail-sheet.vue';

vi.mock('@operon/preferences', () => ({
  usePreferences: () => ({
    isMobile: ref(false),
  }),
}));

vi.mock('@operon/plugins/vxe-table', () => ({
  VxeForm: defineComponent({
    name: 'VxeForm',
    setup(_, { slots }) {
      return () => h('form', { class: 'vxe-form-stub' }, slots.default?.());
    },
  }),
  VxeFormItem: defineComponent({
    name: 'VxeFormItem',
    props: ['field', 'title', 'span'],
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          { 'data-field': props.field, 'data-title': props.title },
          slots.default?.(),
        );
    },
  }),
}));

vi.mock('@operon-core/shadcn-ui', () => ({
  Badge: defineComponent({
    setup(_, { slots }) {
      return () => h('span', { class: 'badge-stub' }, slots.default?.());
    },
  }),
  Button: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('button', attrs, slots.default?.());
    },
  }),
  Empty: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'empty-stub' }, slots.default?.());
    },
  }),
  EmptyDescription: defineComponent({
    setup(_, { slots }) {
      return () => h('p', { class: 'empty-desc-stub' }, slots.default?.());
    },
  }),
  EmptyHeader: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'empty-header-stub' }, slots.default?.());
    },
  }),
  Input: defineComponent({
    props: ['modelValue'],
    emits: ['input', 'update:modelValue'],
    setup(props, { attrs, emit }) {
      return () =>
        h('input', {
          ...attrs,
          value: props.modelValue,
          onInput: (e: Event) => {
            emit('update:modelValue', (e.target as HTMLInputElement).value);
            emit('input', e);
          },
        });
    },
  }),
  InputGroup: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'input-group-stub' }, slots.default?.());
    },
  }),
  InputGroupAddon: defineComponent({
    setup(_, { slots }) {
      return () =>
        h('div', { class: 'input-group-addon-stub' }, slots.default?.());
    },
  }),
  InputGroupInput: defineComponent({
    props: ['modelValue'],
    emits: ['input', 'update:modelValue'],
    setup(props, { attrs, emit }) {
      return () =>
        h('input', {
          ...attrs,
          value: props.modelValue,
          onInput: (e: Event) => {
            emit('update:modelValue', (e.target as HTMLInputElement).value);
            emit('input', e);
          },
        });
    },
  }),
  Popover: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'popover-stub' }, slots.default?.());
    },
  }),
  PopoverContent: defineComponent({
    setup(_, { attrs, slots }) {
      return () =>
        h(
          'div',
          { ...attrs, class: 'popover-content-stub' },
          slots.default?.(),
        );
    },
  }),
  PopoverTrigger: defineComponent({
    setup(_, { slots }) {
      return () =>
        h('span', { class: 'popover-trigger-stub' }, slots.default?.());
    },
  }),
  Select: defineComponent({
    props: ['modelValue'],
    setup(_, { slots }) {
      return () => h('div', { class: 'select-stub' }, slots.default?.());
    },
  }),
  SelectContent: defineComponent({
    setup(_, { slots }) {
      return () =>
        h('div', { class: 'select-content-stub' }, slots.default?.());
    },
  }),
  SelectItem: defineComponent({
    props: ['value'],
    setup(_, { slots }) {
      return () => h('div', { class: 'select-item-stub' }, slots.default?.());
    },
  }),
  SelectTrigger: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('button', attrs, slots.default?.());
    },
  }),
  SelectValue: defineComponent({
    setup(_, { slots }) {
      return () => h('span', slots.default?.());
    },
  }),
  Sheet: defineComponent({
    props: ['open'],
    setup(props, { slots }) {
      return () => (props.open ? h('div', slots.default?.()) : null);
    },
  }),
  SheetContent: defineComponent({
    props: ['side', 'class'],
    setup(props, { attrs, slots }) {
      return () =>
        h(
          'div',
          {
            ...attrs,
            class: props.class,
            'data-side': props.side,
          },
          slots.default?.(),
        );
    },
  }),
  SheetDescription: defineComponent({
    setup(_, { slots }) {
      return () => h('p', slots.default?.());
    },
  }),
  SheetFooter: defineComponent({
    setup(_, { slots }) {
      return () => h('footer', slots.default?.());
    },
  }),
  SheetHeader: defineComponent({
    setup(_, { slots }) {
      return () => h('header', slots.default?.());
    },
  }),
  SheetTitle: defineComponent({
    setup(_, { slots }) {
      return () => h('h2', slots.default?.());
    },
  }),
  Spinner: defineComponent({
    setup(_, { attrs }) {
      return () => h('span', attrs);
    },
  }),
  Switch: defineComponent({
    setup(_, { attrs }) {
      return () => h('button', attrs);
    },
  }),
  Table: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('table', attrs, slots.default?.());
    },
  }),
  TableBody: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('tbody', attrs, slots.default?.());
    },
  }),
  TableCell: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('td', attrs, slots.default?.());
    },
  }),
  TableHead: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('th', attrs, slots.default?.());
    },
  }),
  TableHeader: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('thead', attrs, slots.default?.());
    },
  }),
  TableRow: defineComponent({
    setup(_, { attrs, slots }) {
      return () => h('tr', attrs, slots.default?.());
    },
  }),
  Textarea: defineComponent({
    setup(_, { attrs }) {
      return () => h('textarea', attrs);
    },
  }),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

const mockEffectiveAccess = {
  isSuperadmin: true,
  permissions: ['*'],
  tenantPermissions: {},
};

vi.mock('#/api/core/access', () => ({
  getEffectiveAccess: vi.fn(() => Promise.resolve(mockEffectiveAccess)),
}));

vi.mock('#/composables', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn(),
    isCopied: () => false,
  }),
  useDateFormat: () => ({
    formatDate: (v: string) => v,
  }),
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('vxe-detail-sheet — isInteractiveCellClick guard & Stacked Relational Drawer', () => {
  it('returns false when clicking a standard table cell or span', () => {
    const cell = document.createElement('td');
    const span = document.createElement('span');
    cell.append(span);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: span });

    expect(isInteractiveCellClick(event)).toBe(false);
    expect(isInteractiveCellClick(null)).toBe(false);
  });

  it('returns true when clicking inside a button, link, input, or [data-stop-row-click]', () => {
    const button = document.createElement('button');
    const icon = document.createElement('svg');
    button.append(icon);

    const btnEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(btnEvent, 'target', { value: icon });
    expect(isInteractiveCellClick(btnEvent)).toBe(true);

    const stopContainer = document.createElement('div');
    stopContainer.dataset.stopRowClick = 'true';
    const innerSpan = document.createElement('span');
    stopContainer.append(innerSpan);

    const stopEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(stopEvent, 'target', { value: innerSpan });
    expect(isInteractiveCellClick(stopEvent)).toBe(true);
  });

  it('renders desktop right drawer at z-[1050] (above LayoutHeader z-202), hides raw schema.table from relational trigger, and opens stacked relational table drawer at z-[1070]', async () => {
    mockEffectiveAccess.isSuperadmin = true;
    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp(VxeRowDetailSheet, {
      open: true,
      options: { resource: 'public.roles' },
      routePath: '/system/roles',
      row: {
        description: 'Platform administrator',
        id: 'r_admin',
        is_system: true,
        name: 'admin',
        permission_count: 2,
        permissions: ['system.roles.manage', 'tenants.read'],
      },
    });
    app.mount(container);
    await nextTick();
    await nextTick();

    const primaryDrawer = container.querySelector(
      '.vxe-detail-sheet-content',
    ) as HTMLElement | null;
    expect(primaryDrawer).not.toBeNull();
    expect(primaryDrawer?.dataset.side).toBe('right');
    expect(primaryDrawer?.className).toContain('z-[1050]');
    expect(primaryDrawer?.getAttribute('style')).toContain('z-index: 1050');

    // Superadmin sees the RLS diagnostic popover trigger
    expect(
      container.querySelector('[data-testid="vxe-superadmin-rls-trigger"]'),
    ).not.toBeNull();

    // Relational field is rendered as a compact trigger button showing human-friendly title (not raw schema.table)
    const relTrigger = container.querySelector(
      '[data-testid="vxe-relation-trigger-permissions"]',
    ) as HTMLButtonElement | null;
    expect(relTrigger).not.toBeNull();
    expect(relTrigger?.textContent).toContain('term.permissions');
    expect(relTrigger?.textContent).not.toContain('public.permissions');

    // Secondary drawer is closed initially
    expect(container.querySelector('.vxe-relational-sheet-content')).toBeNull();

    // Clicking the relational trigger opens the stacked secondary table drawer
    relTrigger?.click();
    await nextTick();

    const secondaryDrawer = container.querySelector(
      '.vxe-relational-sheet-content',
    ) as HTMLElement | null;
    expect(secondaryDrawer).not.toBeNull();
    expect(secondaryDrawer?.className).toContain('z-[1070]');
    expect(secondaryDrawer?.getAttribute('style')).toContain('z-index: 1070');

    const tableBody = secondaryDrawer?.querySelector(
      '[data-testid="vxe-relational-table-body"]',
    );
    expect(tableBody?.textContent).toContain('system.roles.manage');
    expect(tableBody?.textContent).toContain('tenants.read');

    // Filtering inside the relational table drawer narrows rows
    const searchInput = secondaryDrawer?.querySelector(
      '[data-testid="vxe-relational-sheet-search"]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      searchInput.value = 'tenants';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();

    expect(tableBody?.textContent).toContain('tenants.read');
    expect(tableBody?.textContent).not.toContain('system.roles.manage');

    app.unmount();
    container.remove();
  });

  it('completely hides schema.table and RLS policy identifiers when user is not superadmin', async () => {
    mockEffectiveAccess.isSuperadmin = false;
    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp(VxeRowDetailSheet, {
      open: true,
      options: { resource: 'public.profiles' },
      routePath: '/system/users',
      row: {
        email: 'user@example.com',
        full_name: 'Standard User',
        id: 'u_01',
      },
    });
    app.mount(container);
    await nextTick();
    await nextTick();

    expect(
      container.querySelector('[data-testid="vxe-superadmin-rls-trigger"]'),
    ).toBeNull();
    expect(container.textContent).not.toContain('public.profiles');
    expect(container.textContent).not.toContain('profiles_self_or_superadmin');

    app.unmount();
    container.remove();
  });

  it('supports Create Mode (Insert Row Drawer): renders insertable fields with defaults, auto-slugs name -> slug, and submits onCreate payload', async () => {
    mockEffectiveAccess.isSuperadmin = true;
    const onCreate = vi.fn().mockResolvedValue({
      id: 't_created',
      name: 'Acme Studio',
      plan: 'starter',
      slug: 'acme-studio',
    });
    const onCreated = vi.fn();

    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp(VxeRowDetailSheet, {
      mode: 'create',
      open: true,
      options: {
        onCreate,
        onCreated,
        resource: 'public.tenants',
      },
      routePath: '/tenants',
      row: null,
    });
    app.mount(container);
    await nextTick();
    await nextTick();

    // Auto-generated columns (id, created_at) are hidden in Create Mode
    expect(container.querySelector('[data-field="id"]')).toBeNull();
    expect(container.querySelector('[data-field="created_at"]')).toBeNull();

    // Required fields show '*' marker
    const nameFieldWrapper = container.querySelector(
      '[data-field="name"]',
    ) as HTMLElement | null;
    expect(nameFieldWrapper?.dataset.title).toContain('*');

    const nameInput = container.querySelector(
      '[data-testid="vxe-field-name"]',
    ) as HTMLInputElement | null;
    const slugInput = container.querySelector(
      '[data-testid="vxe-field-slug"]',
    ) as HTMLInputElement | null;
    expect(nameInput).not.toBeNull();
    expect(slugInput).not.toBeNull();

    // Typing into name auto-populates slug
    if (nameInput) {
      nameInput.value = 'Acme Studio';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();

    expect(slugInput?.value).toBe('acme-studio');

    // Submit Create button
    const createBtn = container.querySelector(
      '[data-testid="vxe-detail-sheet-create"]',
    ) as HTMLButtonElement | null;
    expect(createBtn).not.toBeNull();
    createBtn?.click();
    await nextTick();
    await nextTick();

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0]?.[0]?.insertPayload).toMatchObject({
      name: 'Acme Studio',
      plan: 'pro',
      slug: 'acme-studio',
    });
    expect(onCreated).toHaveBeenCalledWith({
      id: 't_created',
      name: 'Acme Studio',
      plan: 'starter',
      slug: 'acme-studio',
    });

    app.unmount();
    container.remove();
  });
});
