<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, onUnmounted, shallowRef, useSlots } from 'vue';

import { useScrollLock } from '@operon-core/composables';
import { VbenScrollbar } from '@operon-core/shadcn-ui';

import { useSidebarDrag } from '../hooks/use-sidebar-drag';
import { SidebarCollapseButton, SidebarFixedButton } from './widgets';

interface Props {
  /**
   * Collapse trigger height
   * @default 42
   */
  collapseHeight?: number;
  /**
   * Collapsed width
   * @default 48
   */
  collapseWidth?: number;
  /**
   * Whether hidden DOM is visible
   * @default true
   */
  domVisible?: boolean;
  /**
   * Standard sidebar expanded width
   */
  expandedWidth?: number;
  /**
   * Height of extra-title in extra panel
   */
  extraTitleHeight?: number;
  /**
   * Extra panel width
   */
  extraWidth: number;
  /**
   * Fix extra panel
   * @default false
   */
  fixedExtra?: boolean;
  /**
   * Header height
   */
  headerHeight: number;
  /**
   * Whether mobile drawer mode
   * @default false
   */
  isMobile?: boolean;
  /**
   * Whether sidebar mixed mode
   * @default false
   */
  isSidebarMixed?: boolean;
  /**
   * Top margin
   * @default 60
   */
  marginTop?: number;
  /**
   * Mixed menu width
   * @default 80
   */
  mixedWidth?: number;
  /**
   * Top padding
   * @default 60
   */
  paddingTop?: number;
  /**
   * Whether to display
   * @default true
   */
  show?: boolean;
  /**
   * Show collapse button
   * @default true
   */
  showCollapseButton?: boolean;
  /**
   * Show pin/fixed button
   * @default true
   */
  showFixedButton?: boolean;
  /**
   * Theme
   */
  theme: string;
  /**
   * Sub-theme
   */
  themeSub: string;
  /**
   * Width
   */
  width: number;
  /**
   * zIndex
   * @default 0
   */
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  collapseHeight: 42,
  collapseWidth: 48,
  domVisible: true,
  expandedWidth: 180,
  extraTitleHeight: undefined,
  fixedExtra: false,
  isMobile: false,
  isSidebarMixed: false,
  marginTop: 0,
  mixedWidth: 70,
  paddingTop: 0,
  show: true,
  showCollapseButton: true,
  showFixedButton: true,
  zIndex: 0,
});

const emit = defineEmits<{ leave: []; 'update:width': [value: number] }>();
const draggable = defineModel<boolean>('draggable');
const collapse = defineModel<boolean>('collapse');
const extraCollapse = defineModel<boolean>('extraCollapse');
const expandOnHovering = defineModel<boolean>('expandOnHovering');
const expandOnHover = defineModel<boolean>('expandOnHover');
const extraVisible = defineModel<boolean>('extraVisible');

const isLocked = useScrollLock({ immediate: false });
const slots = useSlots();

const asideRef = shallowRef<HTMLElement | null>(null);
const dragBarRef = shallowRef<HTMLElement | null>(null);

const hiddenSideStyle = computed((): CSSProperties => {
  const widthValue = props.show ? getMenuWidthValue(true) : '0px';
  return {
    flexBasis: widthValue,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  };
});

const sidebarVisualWidth = computed(() => {
  const currentWidth = Number.parseFloat(getMenuWidthValue(false));
  return !props.isMobile && !props.isSidebarMixed
    ? Math.max(currentWidth, props.expandedWidth)
    : currentWidth;
});

const dragBarStyle = computed((): CSSProperties => {
  const currentWidth = Number.parseFloat(getMenuWidthValue(false));
  return {
    right: `${Math.max(0, sidebarVisualWidth.value - currentWidth)}px`,
  };
});

/**
 * Whether the secondary panel is expanded. Visibility and placeholder width must be driven by the same condition:
 * Inconsistency causes the panel to float over the main content (vben-layout header offset only checks extraVisible).
 * fixedExtra and expandOnHover are bound to the same preference in vben-layout, but as component API we cannot assume callers always pass them in pairs.
 */
const extraPanelExpanded = computed(
  () =>
    props.isSidebarMixed &&
    props.show &&
    !collapse.value &&
    !!extraVisible.value &&
    (props.fixedExtra || expandOnHover.value || expandOnHovering.value),
);

const style = computed((): CSSProperties => {
  const { marginTop, paddingTop, zIndex } = props;

  return {
    '--scroll-shadow': 'var(--sidebar)',
    ...calcMenuWidthStyle(),
    height: `calc(100% - ${marginTop}px)`,
    marginTop: `${marginTop}px`,
    paddingTop: `${paddingTop}px`,
    zIndex,
    ...(extraPanelExpanded.value ? { transition: 'none' } : {}),
  };
});

const extraStyle = computed((): CSSProperties => {
  const { extraWidth, width, zIndex } = props;

  return {
    left: `${width}px`,
    width: extraPanelExpanded.value ? `${extraWidth}px` : 0,
    zIndex,
  };
});

const extraTitleStyle = computed((): CSSProperties => {
  const { extraTitleHeight, headerHeight } = props;

  return {
    height: `${extraTitleHeight ?? headerHeight - 1}px`,
  };
});

const contentWidthStyle = computed((): CSSProperties => {
  const { fixedExtra, isSidebarMixed, mixedWidth } = props;
  if (isSidebarMixed && fixedExtra) {
    return { width: `${mixedWidth}px` };
  }
  return {};
});

const contentStyle = computed((): CSSProperties => {
  const { collapseHeight, headerHeight } = props;

  return {
    height: `calc(100% - ${headerHeight + collapseHeight}px)`,
    paddingTop: '8px',
    ...contentWidthStyle.value,
  };
});

const headerStyle = computed((): CSSProperties => {
  const { headerHeight, isSidebarMixed } = props;

  return {
    ...(isSidebarMixed ? { display: 'flex', justifyContent: 'center' } : {}),
    height: `${headerHeight - 1}px`,
    ...contentWidthStyle.value,
  };
});

const extraContentStyle = computed((): CSSProperties => {
  const { collapseHeight, extraTitleHeight, headerHeight } = props;
  const titleHeight = extraTitleHeight ?? headerHeight;
  return {
    height: `calc(100% - ${titleHeight + collapseHeight}px)`,
  };
});

const collapseStyle = computed((): CSSProperties => {
  return {
    height: `${props.collapseHeight}px`,
  };
});

function getMenuWidthValue(isHiddenDom: boolean) {
  const { collapseWidth, extraWidth, mixedWidth, isSidebarMixed, width } =
    props;

  let widthValue =
    width === 0
      ? '0px'
      : `${width + (extraPanelExpanded.value ? extraWidth : 0)}px`;

  if (isHiddenDom && expandOnHovering.value && !expandOnHover.value) {
    widthValue = isSidebarMixed ? `${mixedWidth}px` : `${collapseWidth}px`;
  }
  return widthValue;
}

function calcMenuWidthStyle(): CSSProperties {
  const widthValue = getMenuWidthValue(false);
  const currentWidth = Number.parseFloat(widthValue);
  const clippedWidth = Math.max(0, sidebarVisualWidth.value - currentWidth);
  let transform: CSSProperties['transform'];

  if (props.isMobile) {
    transform = undefined;
  } else if (props.show) {
    transform = 'translate3d(0, 0, 0)';
  } else {
    transform = 'translate3d(-100%, 0, 0)';
  }

  return {
    ...(widthValue === '0px' ? { overflow: 'hidden' } : {}),
    clipPath: `inset(0 ${clippedWidth}px 0 0)`,
    transform,
    width: `${sidebarVisualWidth.value}px`,
  };
}

function handleMouseenter(e: MouseEvent) {
  // Mobile drawer mode does not have hover semantics: synthetic mouse events must not mutate collapse state
  if (props.isMobile) {
    return;
  }
  if (e?.offsetX < 10) {
    return;
  }

  if (expandOnHover.value) {
    if (props.isSidebarMixed) {
      extraVisible.value = true;
    }
    return;
  }
  if (!expandOnHovering.value) {
    collapse.value = false;
  }
  if (props.isSidebarMixed) {
    isLocked.value = true;
    extraVisible.value = true;
  }
  expandOnHovering.value = true;
}

function handleMouseleave() {
  emit('leave');
  if (props.isSidebarMixed) {
    isLocked.value = false;
  }
  if (expandOnHover.value || props.isMobile) {
    return;
  }

  expandOnHovering.value = false;
  collapse.value = true;
  extraVisible.value = false;
}

const { startDrag, endDrag } = useSidebarDrag();

const handleDragSidebar = (e: MouseEvent) => {
  const { isSidebarMixed, collapseWidth, width } = props;
  const minLimit = isSidebarMixed ? width + collapseWidth : collapseWidth;
  const maxLimit = isSidebarMixed ? width + 320 : 320;

  startDrag(
    e,
    {
      min: minLimit,
      max: maxLimit,
    },
    {
      target: asideRef.value,
      dragBar: dragBarRef.value,
    },
    (newWidth) => {
      if (isSidebarMixed) {
        emit('update:width', newWidth - width);
        extraCollapse.value = collapse.value =
          newWidth - width <= collapseWidth;
      } else {
        emit('update:width', newWidth);
        collapse.value = extraCollapse.value = newWidth <= collapseWidth;
      }
    },
  );
};

onUnmounted(() => {
  endDrag();
});
</script>

<template>
  <div
    v-if="domVisible"
    :class="theme"
    :style="hiddenSideStyle"
    class="h-full"
  ></div>
  <Transition name="mobile-sidebar">
    <aside
      v-if="!isMobile || !collapse"
      ref="asideRef"
      data-layout-region="sidebar"
      :inert="!show || width === 0"
      :style="style"
      class="fixed left-0 top-0 h-full"
      :class="[
        theme,
        {
          'border-r border-border bg-sidebar transition-[clip-path,transform] duration-300 ease-out':
            !isMobile && !isSidebarMixed,
          'transition-transform duration-300 ease-out':
            !isMobile && isSidebarMixed,
        },
      ]"
      @mouseenter="handleMouseenter"
      @mouseleave="handleMouseleave"
    >
      <div
        class="h-full"
        :class="[
          {
            'bg-sidebar-deep': isSidebarMixed,
            'border-r border-border bg-sidebar': !isSidebarMixed,
          },
        ]"
        :style="{ width: `${width}px` }"
      >
        <SidebarFixedButton
          v-if="!collapse && !isSidebarMixed && showFixedButton"
          v-model:collapse="collapse"
          v-model:expand-on-hover="expandOnHover"
          v-model:expand-on-hovering="expandOnHovering"
          v-model:extra-visible="extraVisible"
        />
        <div v-if="slots.logo" :style="headerStyle">
          <slot name="logo"></slot>
        </div>
        <VbenScrollbar :style="contentStyle" shadow shadow-border>
          <slot></slot>
        </VbenScrollbar>

        <div :style="collapseStyle"></div>
        <SidebarCollapseButton
          v-if="showCollapseButton && !isSidebarMixed"
          v-model:collapsed="collapse"
        />
      </div>
      <div
        v-if="isSidebarMixed"
        :class="[
          themeSub,
          {
            'border-l': extraPanelExpanded,
          },
        ]"
        :style="extraStyle"
        class="fixed top-0 h-full overflow-hidden border-r border-border bg-sidebar transition-[left,width] duration-300 ease-out"
      >
        <SidebarCollapseButton
          v-if="isSidebarMixed && expandOnHover"
          v-model:collapsed="extraCollapse"
        />

        <SidebarFixedButton
          v-if="!extraCollapse"
          v-model:collapse="collapse"
          v-model:expand-on-hover="expandOnHover"
          v-model:expand-on-hovering="expandOnHovering"
          v-model:extra-visible="extraVisible"
        />
        <div v-if="!extraCollapse" :style="extraTitleStyle" class="pl-2">
          <slot name="extra-title"></slot>
        </div>
        <VbenScrollbar
          :style="extraContentStyle"
          class="border-border py-2"
          shadow
          shadow-border
        >
          <slot name="extra"></slot>
        </VbenScrollbar>
      </div>
      <div
        v-if="draggable"
        ref="dragBarRef"
        :style="dragBarStyle"
        class="absolute inset-y-0 -right-px z-1000 w-0.5 cursor-col-resize hover:bg-primary"
        @mousedown="handleDragSidebar"
      ></div>
    </aside>
  </Transition>
</template>

<style scoped>
.mobile-sidebar-enter-active,
.mobile-sidebar-leave-active {
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.mobile-sidebar-enter-from,
.mobile-sidebar-leave-to {
  transform: translate3d(-100%, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-sidebar-enter-active,
  .mobile-sidebar-leave-active {
    transition-duration: 0ms;
  }
}
</style>
