<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, onUnmounted, shallowRef, useSlots } from 'vue';

import { VbenScrollbar } from '@operon-core/shadcn-ui';

import { useSidebarDrag } from '../hooks/use-sidebar-drag';
import { SidebarCollapseButton, SidebarFixedButton } from './widgets';

interface Props {
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
   * Whether mobile drawer mode
   * @default false
   */
  isMobile?: boolean;
  /**
   * Top margin
   * @default 0
   */
  marginTop?: number;
  /**
   * Top padding
   * @default 0
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
  collapseWidth: 48,
  domVisible: true,
  expandedWidth: 180,
  isMobile: false,
  marginTop: 0,
  paddingTop: 0,
  show: true,
  showCollapseButton: true,
  showFixedButton: true,
  zIndex: 0,
});

const emit = defineEmits<{ 'update:width': [value: number] }>();
const draggable = defineModel<boolean>('draggable');
const collapse = defineModel<boolean>('collapse');
const expandOnHovering = defineModel<boolean>('expandOnHovering');
const expandOnHover = defineModel<boolean>('expandOnHover');

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
  return props.isMobile
    ? currentWidth
    : Math.max(currentWidth, props.expandedWidth);
});

const dragBarStyle = computed((): CSSProperties => {
  const currentWidth = Number.parseFloat(getMenuWidthValue(false));
  return {
    right: `${Math.max(0, sidebarVisualWidth.value - currentWidth)}px`,
  };
});

const style = computed((): CSSProperties => {
  const { marginTop, paddingTop, zIndex } = props;

  return {
    '--scroll-shadow': 'var(--sidebar)',
    ...calcMenuWidthStyle(),
    height: `calc(100% - ${marginTop}px)`,
    marginTop: `${marginTop}px`,
    paddingTop: `${paddingTop}px`,
    zIndex,
  };
});

const showFooter = computed(() => {
  return (
    Boolean(slots.footer) ||
    props.showCollapseButton ||
    (!collapse.value && props.showFixedButton)
  );
});

function getMenuWidthValue(isHiddenDom: boolean) {
  const { collapseWidth, width } = props;

  let widthValue = width === 0 ? '0px' : `${width}px`;

  if (isHiddenDom && expandOnHovering.value && !expandOnHover.value) {
    widthValue = `${collapseWidth}px`;
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
    return;
  }
  if (!expandOnHovering.value) {
    collapse.value = false;
  }
  expandOnHovering.value = true;
}

function handleMouseleave() {
  if (expandOnHover.value || props.isMobile) {
    return;
  }

  expandOnHovering.value = false;
  collapse.value = true;
}

const { startDrag, endDrag } = useSidebarDrag();

const handleDragSidebar = (e: MouseEvent) => {
  const { collapseWidth } = props;

  startDrag(
    e,
    {
      min: collapseWidth,
      max: 320,
    },
    {
      target: asideRef.value,
      dragBar: dragBarRef.value,
    },
    (newWidth) => {
      emit('update:width', newWidth);
      collapse.value = newWidth <= collapseWidth;
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
      class="fixed left-0 top-0 h-full text-foreground"
      :class="[
        theme,
        {
          'bg-sidebar transition-[clip-path,transform] duration-300 ease-out':
            !isMobile,
        },
      ]"
      @mouseenter="handleMouseenter"
      @mouseleave="handleMouseleave"
    >
      <div
        class="flex h-full flex-col gap-2 bg-sidebar"
        :style="{ width: `${width}px` }"
      >
        <div
          v-if="slots.header"
          data-layout-region="sidebar-header"
          class="flex shrink-0"
          :class="collapse ? 'justify-center px-1.5' : 'px-3'"
        >
          <slot name="header" :collapsed="collapse"></slot>
        </div>

        <VbenScrollbar class="min-h-0 flex-1" shadow shadow-border>
          <slot :collapsed="collapse"></slot>
        </VbenScrollbar>

        <div
          v-if="showFooter"
          data-layout-region="sidebar-footer"
          class="flex min-h-[42px] shrink-0 items-center gap-1.5 py-1.5"
          :class="
            collapse ? 'flex-col justify-center px-1.5' : 'justify-between px-3'
          "
        >
          <template v-if="slots.footer">
            <div
              class="min-w-0 flex-1"
              :class="collapse ? 'flex justify-center' : ''"
            >
              <slot name="footer" :collapsed="collapse"></slot>
            </div>
            <div
              v-if="showCollapseButton || (!collapse && showFixedButton)"
              class="flex shrink-0 items-center gap-1"
              :class="collapse ? 'flex-col' : ''"
            >
              <SidebarFixedButton
                v-if="!collapse && showFixedButton"
                v-model:collapse="collapse"
                v-model:expand-on-hover="expandOnHover"
                v-model:expand-on-hovering="expandOnHovering"
              />
              <SidebarCollapseButton
                v-if="showCollapseButton"
                v-model:collapsed="collapse"
              />
            </div>
          </template>
          <template v-else>
            <SidebarCollapseButton
              v-if="showCollapseButton"
              v-model:collapsed="collapse"
            />
            <SidebarFixedButton
              v-if="!collapse && showFixedButton"
              v-model:collapse="collapse"
              v-model:expand-on-hover="expandOnHover"
              v-model:expand-on-hovering="expandOnHovering"
            />
          </template>
        </div>
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
