<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { VbenLayoutProps } from './vben-layout';

import { computed, ref, watch } from 'vue';

import {
  SCROLL_FIXED_CLASS,
  useLayoutFooterStyle,
  useLayoutHeaderStyle,
  useLayoutViewportHeight,
} from '@operon-core/composables';
import { PanelLeft, PanelLeftOpen } from '@operon-core/icons';
import { VbenIconButton } from '@operon-core/shadcn-ui';
import {
  ELEMENT_ID_LAYOUT_SCROLL,
  ELEMENT_ID_MAIN_CONTENT,
} from '@operon-core/shared/constants';

import { useEventListener, useScroll } from '@vueuse/core';

import {
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  LayoutSidebar,
  LayoutTabbar,
} from './components';
import { resolveHeaderHiddenOnScroll } from './header-scroll-state';
import { useLayout } from './hooks/use-layout';

interface Props extends VbenLayoutProps {}

defineOptions({
  name: 'VbenLayout',
});

const props = withDefaults(defineProps<Props>(), {
  contentCompact: 'wide',
  contentCompactWidth: 1200,
  contentPadding: 0,
  contentPaddingBottom: 0,
  contentPaddingLeft: 0,
  contentPaddingRight: 0,
  contentPaddingTop: 0,
  footerEnable: false,
  footerFixed: true,
  footerHeight: 32,
  headerHeight: 50,
  headerHidden: false,
  headerMode: 'fixed',
  headerToggleSidebarButton: true,
  headerVisible: true,
  isMobile: false,
  layout: 'sidebar-nav',
  sidebarCollapsedButton: true,
  sidebarCollapseShowTitle: false,
  sidebarExtraCollapsedWidth: 60,
  sidebarFixedButton: true,
  sidebarHidden: false,
  sidebarTheme: 'dark',
  sidebarWidth: 180,
  sideCollapseWidth: 60,
  tabbarEnable: true,
  tabbarHeight: 40,
  zIndex: 200,
});

const emit = defineEmits<{
  toggleSidebar: [];
  'update:sidebarWidth': [value: number];
}>();
const sidebarDraggable = defineModel<boolean>('sidebarDraggable', {
  default: true,
});
const sidebarCollapse = defineModel<boolean>('sidebarCollapse', {
  default: false,
});
const sidebarExpandOnHover = defineModel<boolean>('sidebarExpandOnHover', {
  default: false,
});
const sidebarEnable = defineModel<boolean>('sidebarEnable', { default: true });

const HEADER_TRIGGER_DISTANCE = 12;

// Whether sidebar is expanded on hover
const sidebarExpandOnHovering = ref(false);
const mobileSidebarOpen = ref(false);
const headerIsHidden = ref(false);
const mainRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
let lastMouseY: null | number = null;

const {
  arrivedState,
  directions,
  y: scrollY,
} = useScroll(contentRef, {
  onScroll: handleLayoutScroll,
});

useLayoutViewportHeight();
const { setLayoutHeaderHeight } = useLayoutHeaderStyle();
const { setLayoutFooterHeight } = useLayoutFooterStyle();

const { currentLayout, isFullContent, isHeaderNav, isMixedNav } =
  useLayout(props);

/**
 * Whether header auto-hides
 */
const isHeaderAutoActive = computed(
  () =>
    props.headerMode === 'auto' && !isMixedNav.value && !isFullContent.value,
);

const isHeaderOverlayModeActive = computed(
  () =>
    (props.headerMode === 'auto' || props.headerMode === 'auto-scroll') &&
    !isMixedNav.value &&
    !isFullContent.value,
);

const isContentFramed = computed(
  () => !props.isMobile && !isFullContent.value && props.headerVisible,
);

const headerHasShadow = computed(() => scrollY.value > 20);

const headerWrapperHeight = computed(() => {
  let height = 0;
  if (props.headerVisible && !props.headerHidden) {
    height += props.headerHeight;
  }
  if (props.tabbarEnable) {
    height += props.tabbarHeight;
  }
  return height;
});

const getSideCollapseWidth = computed(() => {
  const {
    sidebarCollapseShowTitle,
    sidebarExtraCollapsedWidth,
    sideCollapseWidth,
  } = props;

  return sidebarCollapseShowTitle
    ? sidebarExtraCollapsedWidth
    : sideCollapseWidth;
});

const activeSidebarCollapse = computed({
  get: () =>
    props.isMobile ? !mobileSidebarOpen.value : sidebarCollapse.value,
  set: (value: boolean) => {
    if (props.isMobile) {
      mobileSidebarOpen.value = !value;
      return;
    }
    sidebarCollapse.value = value;
  },
});

/**
 * Dynamically get whether sidebar area is visible
 */
const sidebarEnableState = computed(() => {
  return !isHeaderNav.value && sidebarEnable.value;
});

/**
 * Sidebar distance from top
 */
const sidebarMarginTop = computed(() => {
  const { headerHeight, headerHidden, headerVisible, isMobile } = props;
  const headerTakesSpace = headerVisible && !headerHidden;
  return isMixedNav.value && !isMobile && headerTakesSpace ? headerHeight : 0;
});

/**
 * Sidebar padding top — sidebar content starts at the same y as the page
 * content area. Uses headerWrapperHeight (header + tabbar) so the first
 * sidebar item and the first content item are flush at the top.
 */
const sidebarPaddingTop = computed(() => {
  if (
    isMixedNav.value ||
    props.isMobile ||
    !headerFixed.value ||
    isFullContent.value
  ) {
    return 0;
  }
  // headerWrapperHeight already accounts for headerVisible/headerHidden/tabbarEnable
  return headerWrapperHeight.value;
});

/**
 * Dynamically get sidebar width
 */
const getSidebarWidth = computed(() => {
  const { isMobile, sidebarHidden, sidebarWidth } = props;

  if (sidebarHidden || !sidebarEnableState.value) {
    return 0;
  }

  if (activeSidebarCollapse.value) {
    return isMobile ? 0 : getSideCollapseWidth.value;
  }
  return sidebarWidth;
});

/**
 * Whether sidebar mode, including mixed sidebar
 */
const isSideMode = computed(
  () =>
    currentLayout.value === 'mixed-nav' ||
    currentLayout.value === 'sidebar-nav' ||
    currentLayout.value === 'header-sidebar-nav',
);

/**
 * Header fixed value
 */
const headerFixed = computed(() => {
  const { headerMode } = props;
  return (
    isMixedNav.value ||
    headerMode === 'fixed' ||
    headerMode === 'auto-scroll' ||
    headerMode === 'auto'
  );
});

const showSidebar = computed(() => {
  return isSideMode.value && sidebarEnable.value && !props.sidebarHidden;
});

const isContentFlushLeft = computed(
  () => isContentFramed.value && isMixedNav.value && showSidebar.value,
);

/**
 * Mask visibility
 */
const maskVisible = computed(
  () => !activeSidebarCollapse.value && props.isMobile,
);

const mainStyle = computed(() => {
  let width = '100%';
  let sidebarAndExtraWidth = 'unset';
  if (
    headerFixed.value &&
    currentLayout.value !== 'header-nav' &&
    currentLayout.value !== 'mixed-nav' &&
    currentLayout.value !== 'header-sidebar-nav' &&
    showSidebar.value &&
    !props.isMobile
  ) {
    let sidebarWidth = getSidebarWidth.value;
    if (sidebarExpandOnHovering.value && !sidebarExpandOnHover.value) {
      sidebarWidth = getSideCollapseWidth.value;
    }
    sidebarAndExtraWidth = `${sidebarWidth}px`;
    width = `calc(100% - ${sidebarAndExtraWidth})`;
  }
  return {
    sidebarAndExtraWidth,
    width,
  };
});

// Calculate tabbar styles
const tabbarStyle = computed((): CSSProperties => {
  let width: string;
  let marginLeft = 0;

  // If not mixed navigation, tabbar width is 100%
  if (!isMixedNav.value || props.sidebarHidden) {
    width = '100%';
  } else if (sidebarEnable.value) {
    // Width when mouse is hovering over sidebar and sidebar is expanded
    const onHoveringWidth = sidebarExpandOnHover.value
      ? props.sidebarWidth
      : getSideCollapseWidth.value;

    // Set marginLeft depending on whether sidebar is collapsed
    marginLeft = activeSidebarCollapse.value
      ? getSideCollapseWidth.value
      : onHoveringWidth;

    // Set tabbar width calculated as 100% minus sidebar width
    width = `calc(100% - ${activeSidebarCollapse.value ? getSidebarWidth.value : onHoveringWidth}px)`;
  } else {
    // Tabbar width defaults to 100%
    width = '100%';
  }

  return {
    marginLeft: `${marginLeft}px`,
    width,
  };
});

const layoutScrollStyle = computed((): CSSProperties => {
  const fixed = headerFixed.value;

  if (!fixed) {
    return {
      marginTop: 0,
      paddingTop: 0,
    };
  }

  if (isHeaderOverlayModeActive.value) {
    return {
      marginTop: 0,
      paddingTop: isFullContent.value ? 0 : `${headerWrapperHeight.value}px`,
    };
  }

  return {
    marginTop:
      fixed &&
      !isFullContent.value &&
      !headerIsHidden.value &&
      (!isHeaderAutoActive.value || scrollY.value < headerWrapperHeight.value)
        ? `${headerWrapperHeight.value}px`
        : 0,
    paddingTop: 0,
  };
});

const contentStyle = computed((): CSSProperties => {
  const { footerEnable, footerFixed, footerHeight } = props;
  return {
    minHeight: footerEnable && !footerFixed ? undefined : 0,
    paddingBottom: `${footerEnable && footerFixed ? footerHeight : 0}px`,
  };
});

const headerZIndex = computed(() => {
  const { zIndex } = props;
  const offset = isMixedNav.value ? 1 : 0;
  return zIndex + offset;
});

const headerWrapperStyle = computed((): CSSProperties => {
  const fixed = headerFixed.value;
  const hidden = headerIsHidden.value || isFullContent.value;

  return {
    height: isFullContent.value ? '0' : `${headerWrapperHeight.value}px`,
    left: isMixedNav.value ? 0 : mainStyle.value.sidebarAndExtraWidth,
    position: fixed ? 'fixed' : 'static',
    top: 0,
    transform: fixed
      ? `translate3d(0, ${hidden ? '-100%' : '0'}, 0)`
      : undefined,
    transitionDuration: fixed ? undefined : '0ms',
    width: mainStyle.value.width,
    willChange: fixed ? 'transform' : undefined,
    'z-index': headerZIndex.value,
  };
});

/**
 * Sidebar z-index
 */
const sidebarZIndex = computed(() => {
  const { isMobile, zIndex } = props;
  let offset = isMobile || isSideMode.value ? 1 : -1;

  if (isMixedNav.value) {
    offset += 1;
  }

  return zIndex + offset;
});

const footerWidth = computed(() => {
  if (!props.footerFixed) {
    return '100%';
  }

  return mainStyle.value.width;
});

const maskStyle = computed((): CSSProperties => {
  return { zIndex: props.zIndex };
});

const showHeaderToggleButton = computed(() => {
  return (
    props.isMobile ||
    (props.headerToggleSidebarButton &&
      isSideMode.value &&
      !isMixedNav.value &&
      !props.isMobile)
  );
});

watch(
  () => props.isMobile,
  (isMobile) => {
    if (isMobile) {
      mobileSidebarOpen.value = false;
    }
  },
  {
    immediate: true,
  },
);

watch(
  [() => headerWrapperHeight.value, () => isFullContent.value],
  ([height]) => {
    setLayoutHeaderHeight(isFullContent.value ? 0 : height);
  },
  {
    immediate: true,
  },
);

watch(
  () => props.footerHeight,
  (height: number) => {
    setLayoutFooterHeight(height);
  },
  {
    immediate: true,
  },
);

watch(
  [() => props.headerMode, () => isMixedNav.value, () => isFullContent.value],
  () => {
    headerIsHidden.value = false;
  },
);

useEventListener(mainRef, 'mousemove', handleHeaderMouseMove, {
  passive: true,
});
useEventListener(mainRef, 'wheel', handleLayoutWheel, {
  passive: true,
});

function handleLayoutWheel(event: WheelEvent) {
  lastMouseY = event.clientY;
}

function handleHeaderMouseMove(event: MouseEvent) {
  lastMouseY = event.clientY;

  if (!isHeaderAutoActive.value) {
    return;
  }

  updateHeaderVisibilityFromMouse(lastMouseY);
}

function updateHeaderVisibilityFromMouse(mouseY: null | number) {
  if (arrivedState.top || scrollY.value < headerWrapperHeight.value) {
    headerIsHidden.value = false;
    return;
  }

  if (mouseY === null) {
    return;
  }

  const isInTriggerZone = mouseY <= HEADER_TRIGGER_DISTANCE;
  const isInHeaderZone =
    !headerIsHidden.value && mouseY <= headerWrapperHeight.value;

  headerIsHidden.value = !(isInTriggerZone || isInHeaderZone);
}

function handleLayoutScroll() {
  if (isHeaderAutoActive.value) {
    updateHeaderVisibilityFromMouse(lastMouseY);
    return;
  }

  if (
    props.headerMode !== 'auto-scroll' ||
    isMixedNav.value ||
    isFullContent.value
  ) {
    return;
  }
  resolveHeaderVisibilityOnScroll();
}

function resolveHeaderVisibilityOnScroll() {
  headerIsHidden.value = resolveHeaderHiddenOnScroll({
    arrivedTop: arrivedState.top,
    currentHidden: headerIsHidden.value,
    directionDown: directions.bottom,
    directionUp: directions.top,
    headerHeight: headerWrapperHeight.value,
    scrollTop: scrollY.value,
  });
}

function handleClickMask() {
  activeSidebarCollapse.value = true;
}

function handleHeaderToggle() {
  if (props.isMobile) {
    activeSidebarCollapse.value = false;
  } else {
    emit('toggleSidebar');
  }
}

const idMainContent = ELEMENT_ID_MAIN_CONTENT;
const idLayoutScroll = ELEMENT_ID_LAYOUT_SCROLL;
const idLayoutStaticHeader = `${ELEMENT_ID_LAYOUT_SCROLL}__static_header`;
const layoutStaticHeaderTarget = `#${idLayoutStaticHeader}`;
</script>

<template>
  <div
    data-layout-region="layout"
    :data-layout="currentLayout"
    :data-mobile="isMobile"
    :data-sidebar-collapsed="activeSidebarCollapse"
    class="relative flex h-full min-h-0 w-full overflow-hidden"
  >
    <div
      aria-hidden="true"
      :class="sidebarTheme"
      class="pointer-events-none absolute inset-0 bg-sidebar"
    ></div>
    <LayoutSidebar
      v-if="sidebarEnableState"
      v-model:draggable="sidebarDraggable"
      v-model:collapse="activeSidebarCollapse"
      v-model:expand-on-hover="sidebarExpandOnHover"
      v-model:expand-on-hovering="sidebarExpandOnHovering"
      :show-collapse-button="sidebarCollapsedButton"
      :show-fixed-button="sidebarFixedButton"
      :collapse-width="getSideCollapseWidth"
      :dom-visible="!isMobile"
      :expanded-width="sidebarWidth"
      :is-mobile="isMobile"
      :margin-top="sidebarMarginTop"
      :padding-top="sidebarPaddingTop"
      :show="showSidebar"
      :theme="sidebarTheme"
      :width="getSidebarWidth"
      :z-index="sidebarZIndex"
      @update:width="(val) => emit('update:sidebarWidth', val)"
    >
      <template v-if="$slots['sidebar-header']" #header="{ collapsed }">
        <slot name="sidebar-header" :collapsed="collapsed"></slot>
      </template>

      <slot name="menu"></slot>

      <template v-if="$slots['sidebar-footer']" #footer="{ collapsed }">
        <slot name="sidebar-footer" :collapsed="collapsed"></slot>
      </template>
    </LayoutSidebar>

    <div
      ref="mainRef"
      data-layout-region="main"
      class="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <Teleport defer :disabled="headerFixed" :to="layoutStaticHeaderTarget">
        <div
          data-layout-region="header"
          :class="[
            {
              'shadow-[0_16px_24px_hsl(var(--background))]': headerHasShadow,
            },
            SCROLL_FIXED_CLASS,
          ]"
          :style="headerWrapperStyle"
          class="shrink-0 overflow-hidden transition-transform duration-150"
        >
          <LayoutHeader
            v-if="headerVisible"
            :full-width="!isSideMode"
            :height="headerHeight"
            :is-mobile="isMobile"
            :show="!isFullContent && !headerHidden"
            :sidebar-width="sidebarWidth"
            :theme="headerTheme"
            :width="mainStyle.width"
            :z-index="headerZIndex"
          >
            <template #toggle-button>
              <VbenIconButton
                v-if="showHeaderToggleButton"
                data-layout-action="toggle-sidebar"
                class="my-0 size-8 rounded-md"
                @click="handleHeaderToggle"
              >
                <PanelLeft
                  v-if="isMobile ? !activeSidebarCollapse : showSidebar"
                  class="size-5"
                />
                <PanelLeftOpen v-else class="size-5" />
              </VbenIconButton>
            </template>
            <slot name="header"></slot>
          </LayoutHeader>

          <div v-if="tabbarEnable" :style="tabbarStyle" class="shrink-0">
            <div
              :class="{
                'mr-3': isContentFlushLeft && headerFixed,
                'mx-3': isContentFramed && headerFixed && !isContentFlushLeft,
                'overflow-hidden rounded-t-xl border-x border-t border-border':
                  isContentFramed && headerFixed,
              }"
            >
              <LayoutTabbar
                :height="
                  isContentFramed && headerFixed
                    ? tabbarHeight - 1
                    : tabbarHeight
                "
              >
                <slot name="tabbar"></slot>
              </LayoutTabbar>
            </div>
          </div>
        </div>
      </Teleport>

      <div
        :id="idLayoutScroll"
        ref="contentRef"
        data-layout-region="scroll"
        :style="layoutScrollStyle"
        class="vben-layout-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background-deep"
        :class="{
          'mb-3 border-border': isContentFramed,
          'mr-3': isContentFlushLeft,
          'mx-3': isContentFramed && !isContentFlushLeft,
          'rounded-xl border': isContentFramed && !tabbarEnable,
          'rounded-b-xl border-x border-b': isContentFramed && tabbarEnable,
        }"
      >
        <div :id="idLayoutStaticHeader" class="contents"></div>

        <LayoutContent
          :id="idMainContent"
          :content-compact="contentCompact"
          :content-compact-width="contentCompactWidth"
          :padding="contentPadding"
          :padding-bottom="contentPaddingBottom"
          :padding-left="contentPaddingLeft"
          :padding-right="contentPaddingRight"
          :padding-top="contentPaddingTop"
          :style="contentStyle"
        >
          <slot name="content"></slot>

          <template #overlay>
            <slot name="content-overlay"></slot>
          </template>
        </LayoutContent>

        <LayoutFooter
          v-if="footerEnable"
          :fixed="footerFixed"
          :height="footerHeight"
          :show="!isFullContent"
          :width="footerWidth"
          :z-index="zIndex"
        >
          <slot name="footer"></slot>
        </LayoutFooter>
      </div>
    </div>
    <slot name="extra"></slot>
    <Transition name="mobile-sidebar-mask">
      <div
        v-if="maskVisible"
        data-layout-region="sidebar-mask"
        :style="maskStyle"
        class="fixed top-0 left-0 size-full bg-overlay"
        @click="handleClickMask"
      ></div>
    </Transition>
  </div>
</template>

<style scoped>
.mobile-sidebar-mask-enter-active,
.mobile-sidebar-mask-leave-active {
  transition: opacity 300ms ease;
}

.mobile-sidebar-mask-enter-from,
.mobile-sidebar-mask-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-sidebar-mask-enter-active,
  .mobile-sidebar-mask-leave-active {
    transition-duration: 0ms;
  }
}
</style>

<style scoped>
.vben-layout-scroll {
  scrollbar-color: hsl(var(--muted-foreground) / 25%) transparent;
  scrollbar-width: thin;
}

.vben-layout-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.vben-layout-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.vben-layout-scroll::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 25%);
  border-radius: 9999px;
}

.vben-layout-scroll::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 45%);
}
</style>
