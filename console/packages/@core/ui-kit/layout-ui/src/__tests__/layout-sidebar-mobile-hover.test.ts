import type { App } from 'vue';

import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import LayoutSidebar from '../components/layout-sidebar.vue';

vi.mock('../hooks/use-sidebar-drag', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../hooks/use-sidebar-drag')>();
  return {
    ...actual,
    useSidebarDrag: () => ({ startDrag: vi.fn(), endDrag: vi.fn() }),
  };
});

let activeApp: App | undefined;

interface MountOptions {
  collapse?: boolean;
  isMobile?: boolean;
}

/**
 * Mount a controlled LayoutSidebar to verify side effects of mobile/desktop hover events on collapsed state (#8274).
 */
function mountSidebar(options: MountOptions = {}) {
  const collapse = ref(options.collapse ?? false);
  const collapseWrites: boolean[] = [];
  const onUpdateCollapse = vi.fn((value: boolean | undefined) => {
    collapseWrites.push(value ?? false);
    collapse.value = value ?? false;
  });
  const Consumer = defineComponent(
    () => () =>
      h(LayoutSidebar, {
        collapse: collapse.value,
        expandOnHover: false,
        expandOnHovering: false,
        theme: 'dark',
        width: 180,
        isMobile: options.isMobile ?? false,
        'onUpdate:collapse': onUpdateCollapse,
      }),
  );
  const host = document.createElement('div');
  document.body.append(host);
  activeApp = createApp(Consumer);
  activeApp.mount(host);
  return { collapseWrites, onUpdateCollapse };
}

function getAside(): HTMLElement {
  const aside = document.querySelector('aside');
  if (!(aside instanceof HTMLElement)) {
    throw new TypeError('aside not rendered');
  }
  return aside;
}

async function fireMouse(type: 'mouseenter' | 'mouseleave') {
  const event = new MouseEvent(type);
  // Synthetic offsetX in jsdom is always 0, which triggers handleMouseenter left edge 10px guard;
  // Inject 20 to simulate actual hover inside menu area
  Object.defineProperty(event, 'offsetX', { value: 20 });
  getAside().dispatchEvent(event);
  await nextTick();
  await nextTick();
}

afterEach(() => {
  activeApp?.unmount();
  activeApp = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('layout-sidebar mobile hover guard (#8274)', () => {
  it('mobile: mouseleave must not write collapsed state', async () => {
    const { collapseWrites, onUpdateCollapse } = await mountSidebar({
      isMobile: true,
    });

    await fireMouse('mouseleave');

    expect(collapseWrites).toHaveLength(0);
    expect(onUpdateCollapse).not.toHaveBeenCalled();
  });

  it('mobile: mouseenter must not write collapsed state', async () => {
    const { collapseWrites, onUpdateCollapse } = await mountSidebar({
      isMobile: true,
    });

    await fireMouse('mouseenter');

    expect(collapseWrites).toHaveLength(0);
    expect(onUpdateCollapse).not.toHaveBeenCalled();
  });

  it('desktop: mouseleave still collapses the hover-expanded rail', async () => {
    const { collapseWrites, onUpdateCollapse } = await mountSidebar({
      isMobile: false,
    });

    await fireMouse('mouseleave');

    expect(collapseWrites).toContain(true);
    expect(onUpdateCollapse).toHaveBeenCalledWith(true);
  });

  it('desktop: mouseenter expands a collapsed rail (collapse=false)', async () => {
    const { collapseWrites, onUpdateCollapse } = await mountSidebar({
      isMobile: false,
      collapse: true,
    });

    await fireMouse('mouseenter');

    expect(collapseWrites).toContain(false);
    expect(onUpdateCollapse).toHaveBeenCalledWith(false);
  });

  it('renders header and footer slots in flex regions with collapsed state', () => {
    const Consumer = defineComponent(
      () => () =>
        h(
          LayoutSidebar,
          {
            collapse: true,
            theme: 'dark',
            width: 60,
          },
          {
            header: ({ collapsed }: { collapsed?: boolean }) =>
              h('div', { id: 'test-header' }, String(collapsed)),
            default: () => h('div', { id: 'test-main' }, 'menu'),
            footer: ({ collapsed }: { collapsed?: boolean }) =>
              h('div', { id: 'test-footer' }, String(collapsed)),
          },
        ),
    );
    const host = document.createElement('div');
    document.body.append(host);
    activeApp = createApp(Consumer);
    activeApp.mount(host);

    const headerRegion = document.querySelector(
      '[data-layout-region="sidebar-header"] #test-header',
    );
    const footerRegion = document.querySelector(
      '[data-layout-region="sidebar-footer"] #test-footer',
    );
    expect(headerRegion?.textContent).toBe('true');
    expect(footerRegion?.textContent).toBe('true');
  });

  it('spreads collapse and pin buttons with justify-between when expanded without custom footer', () => {
    const Consumer = defineComponent(
      () => () =>
        h(LayoutSidebar, {
          collapse: false,
          showCollapseButton: true,
          showFixedButton: true,
          theme: 'dark',
          width: 210,
        }),
    );
    const host = document.createElement('div');
    document.body.append(host);
    activeApp = createApp(Consumer);
    activeApp.mount(host);

    const footerRegion = document.querySelector(
      '[data-layout-region="sidebar-footer"]',
    );
    expect(footerRegion?.className).toContain('justify-between');
    expect(footerRegion?.querySelectorAll('button')).toHaveLength(2);
  });
});
