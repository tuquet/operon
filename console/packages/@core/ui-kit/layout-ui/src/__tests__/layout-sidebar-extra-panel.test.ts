import type { App } from 'vue';

import { computed, createApp, defineComponent, h } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import LayoutSidebar from '../components/layout-sidebar.vue';

vi.mock('@operon-core/composables', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@operon-core/composables')>();
  return {
    ...actual,
    useScrollLock: () => computed({ get: () => false, set: () => {} }),
  };
});

vi.mock('../hooks/use-sidebar-drag', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../hooks/use-sidebar-drag')>();
  return {
    ...actual,
    useSidebarDrag: () => ({ startDrag: vi.fn(), endDrag: vi.fn() }),
  };
});

const MIXED_WIDTH = 80;
const EXTRA_WIDTH = 224;

let activeApp: App | undefined;

interface MountOptions {
  collapse?: boolean;
  /** Preference sidebar.expandOnHover, bound to both expandOnHover and fixedExtra in vben-layout */
  expandOnHover?: boolean;
  expandOnHovering?: boolean;
  extraVisible?: boolean;
  fixedExtra?: boolean;
}

function mountSidebar(options: MountOptions = {}) {
  const expandOnHover = options.expandOnHover ?? true;
  const Consumer = defineComponent(
    () => () =>
      h(LayoutSidebar, {
        collapse: options.collapse ?? false,
        expandOnHover,
        expandOnHovering: options.expandOnHovering ?? false,
        extraCollapse: false,
        extraVisible: options.extraVisible ?? false,
        extraWidth: EXTRA_WIDTH,
        fixedExtra: options.fixedExtra ?? expandOnHover,
        headerHeight: 50,
        isSidebarMixed: true,
        mixedWidth: MIXED_WIDTH,
        theme: 'dark',
        themeSub: 'dark',
        width: MIXED_WIDTH,
      }),
  );
  const host = document.createElement('div');
  document.body.append(host);
  activeApp = createApp(Consumer);
  activeApp.mount(host);
}

/** Reserved width of placeholder element in flex flow */
function getPlaceholderWidth(): number {
  const placeholder = [...document.querySelectorAll('div')].find(
    (el) => (el as HTMLElement).style.flexBasis !== '',
  );
  if (!placeholder) {
    throw new TypeError('placeholder not rendered');
  }
  return Number.parseFloat((placeholder as HTMLElement).style.flexBasis);
}

/** Rendered width of the secondary panel itself */
function getExtraPanelWidth(): number {
  // Panel positioning comes from class (fixed), inline styles only set left/width/z-index
  const panel = [...document.querySelectorAll('aside > div')].find((el) =>
    el.classList.contains('fixed'),
  );
  if (!panel) {
    throw new TypeError('extra panel not rendered');
  }
  return Number.parseFloat((panel as HTMLElement).style.width);
}

afterEach(() => {
  activeApp?.unmount();
  activeApp = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/**
 * Panel width and placeholder width must share the same source: vben-layout header/content offsets only check sidebarExtraVisible,
 * When inconsistent, the panel floats over content. In fixed mode, expanding the panel takes up space; in hover mode it is an overlay,
 * Placeholder width remains column 1 width (and only renders during hover).
 */
describe('layout-sidebar extra panel (#dual-column menu content overlap)', () => {
  it('fixed mode: expands and reserves space when secondary menu exists', () => {
    mountSidebar({ expandOnHover: true, extraVisible: true });

    expect(getExtraPanelWidth()).toBe(EXTRA_WIDTH);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH + EXTRA_WIDTH);
  });

  it('panel still expands when caller passes expandOnHover without fixedExtra', () => {
    mountSidebar({
      expandOnHover: true,
      extraVisible: true,
      fixedExtra: false,
    });

    expect(getExtraPanelWidth()).toBe(EXTRA_WIDTH);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH + EXTRA_WIDTH);
  });

  it('fixed mode: collapses entire column and does not obscure content when route has no menu', () => {
    mountSidebar({ expandOnHover: true, extraVisible: false });

    expect(getExtraPanelWidth()).toBe(0);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH);
  });

  it('hover mode: does not render panel when not hovering even if extraVisible is true', () => {
    mountSidebar({
      expandOnHover: false,
      expandOnHovering: false,
      extraVisible: true,
    });

    expect(getExtraPanelWidth()).toBe(0);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH);
  });

  it('hover mode: expands as overlay during hover without occupying content space', () => {
    mountSidebar({
      expandOnHover: false,
      expandOnHovering: true,
      extraVisible: true,
    });

    expect(getExtraPanelWidth()).toBe(EXTRA_WIDTH);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH);
  });

  it('does not render panel or reserve space when collapsed', () => {
    mountSidebar({ collapse: true, expandOnHover: true, extraVisible: true });

    expect(getExtraPanelWidth()).toBe(0);
    expect(getPlaceholderWidth()).toBe(MIXED_WIDTH);
  });
});
