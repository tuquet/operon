import type { TabsProps } from './types';

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { VbenScrollbar } from '@operon-core/shadcn-ui';

import { useDebounceFn } from '@vueuse/core';

type DomElement = Element | null | undefined;

export function useTabsViewScroll(props: TabsProps) {
  let resizeObserver: null | ResizeObserver = null;
  let mutationObserver: MutationObserver | null = null;
  let tabItemCount = 0;
  const scrollbarRef = ref<InstanceType<typeof VbenScrollbar> | null>(null);
  const scrollViewportEl = ref<DomElement>(null);
  const showScrollButton = ref(false);
  const scrollIsAtLeft = ref(true);
  const scrollIsAtRight = ref(false);

  function getScrollClientWidth() {
    const scrollbarEl = scrollbarRef.value?.$el;
    if (!scrollbarEl || !scrollViewportEl.value) return {};

    const scrollbarWidth = scrollbarEl.clientWidth;
    const scrollViewWidth = scrollViewportEl.value.clientWidth;

    return {
      scrollbarWidth,
      scrollViewWidth,
    };
  }

  function scrollDirection(
    direction: 'left' | 'right',
    distance: number = 150,
  ) {
    const { scrollbarWidth, scrollViewWidth } = getScrollClientWidth();

    if (!scrollbarWidth || !scrollViewWidth) return;

    if (scrollbarWidth > scrollViewWidth) return;

    scrollViewportEl.value?.scrollBy({
      behavior: 'smooth',
      left:
        direction === 'left'
          ? -(scrollbarWidth - distance)
          : +(scrollbarWidth - distance),
    });
  }

  async function initScrollbar() {
    await nextTick();

    const scrollbarEl = scrollbarRef.value?.$el;
    if (!scrollbarEl) {
      return;
    }

    const viewportEl = scrollbarEl?.querySelector(
      'div[data-reka-scroll-area-viewport]',
    );

    scrollViewportEl.value = viewportEl;
    calcShowScrollbarButton();

    await nextTick();
    scrollToActiveIntoView();

    // Listen for resize changes
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(
      useDebounceFn((_entries: ResizeObserverEntry[]) => {
        calcShowScrollbarButton();
        scrollToActiveIntoView();
      }, 100),
    );
    resizeObserver.observe(viewportEl);

    tabItemCount = props.tabs?.length || 0;
    mutationObserver?.disconnect();
    // Use MutationObserver to only watch for changes in child node count
    mutationObserver = new MutationObserver(() => {
      const count = viewportEl.querySelectorAll(
        `div[data-tab-item="true"]`,
      ).length;

      if (count > tabItemCount) {
        scrollToActiveIntoView();
      }

      if (count !== tabItemCount) {
        calcShowScrollbarButton();
        tabItemCount = count;
      }
    });

    // Configure to only observe child node additions and removals
    mutationObserver.observe(viewportEl, {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  async function scrollToActiveIntoView() {
    if (!scrollViewportEl.value) {
      return;
    }
    await nextTick();
    const viewportEl = scrollViewportEl.value;
    const { scrollbarWidth } = getScrollClientWidth();
    const { scrollWidth } = viewportEl;

    if (scrollbarWidth >= scrollWidth) {
      return;
    }

    requestAnimationFrame(() => {
      const activeItem = viewportEl?.querySelector('.is-active');
      activeItem?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    });
  }

  /**
   * Calculate tabs width to determine whether to display left/right scroll buttons
   */
  async function calcShowScrollbarButton() {
    if (!scrollViewportEl.value) {
      return;
    }

    const { scrollbarWidth } = getScrollClientWidth();

    showScrollButton.value =
      scrollViewportEl.value.scrollWidth > scrollbarWidth;
  }

  const handleScrollAt = useDebounceFn(({ left, right }) => {
    scrollIsAtLeft.value = left;
    scrollIsAtRight.value = right;
  }, 100);

  function handleWheel({ deltaY }: WheelEvent) {
    scrollViewportEl.value?.scrollBy({
      // behavior: 'smooth',
      left: deltaY * 3,
    });
  }

  watch(
    () => props.active,
    async () => {
      // 200ms to wait for tab switch animation to complete
      // setTimeout(() => {
      scrollToActiveIntoView();
      // }, 300);
    },
    {
      flush: 'post',
    },
  );

  // watch(
  //   () => props.tabs?.length,
  //   async () => {
  //     await nextTick();
  //     calcShowScrollbarButton();
  //   },
  //   {
  //     flush: 'post',
  //   },
  // );

  watch(
    () => props.styleType,
    () => {
      initScrollbar();
    },
  );

  onMounted(initScrollbar);

  onUnmounted(() => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = null;
    mutationObserver = null;
  });

  return {
    handleScrollAt,
    handleWheel,
    initScrollbar,
    scrollbarRef,
    scrollDirection,
    scrollIsAtLeft,
    scrollIsAtRight,
    showScrollButton,
  };
}
