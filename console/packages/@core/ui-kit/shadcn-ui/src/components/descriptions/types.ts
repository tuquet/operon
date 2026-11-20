import type { Component, CSSProperties } from 'vue';

/** Responsive breakpoints, aligned with antdv-next */
export type DescriptionsBreakpoint =
  | 'lg'
  | 'md'
  | 'sm'
  | 'xl'
  | 'xs'
  | 'xxl'
  | 'xxxl';

/** Currently matched breakpoint set */
export type ScreenMap = Partial<Record<DescriptionsBreakpoint, boolean>>;

export type DescriptionsLayout = 'horizontal' | 'vertical';

export type DescriptionsSize = 'large' | 'middle' | 'small';

/** Column count, can be fixed number or configured by breakpoint */
export type DescriptionsColumn =
  | number
  | Partial<Record<DescriptionsBreakpoint, number>>;

/** Item span, supports fixed number, 'filled' (fills remainder of current row), or configured by breakpoint */
export type DescriptionsItemSpan =
  | 'filled'
  | number
  | Partial<Record<DescriptionsBreakpoint, number>>;

/** Renderable content: string / number / render function / component */
export type DescriptionsRenderNode = (() => any) | Component | number | string;

export interface DescriptionsItemType {
  /** Content */
  content?: DescriptionsRenderNode;
  /** Content style */
  contentStyle?: CSSProperties;
  /** Unique key */
  key?: number | string;
  /** Label */
  label?: DescriptionsRenderNode;
  /** Label style */
  labelStyle?: CSSProperties;
  /** Span */
  span?: DescriptionsItemSpan;
}

export interface DescriptionsProps {
  /** Whether to show border */
  bordered?: boolean;
  class?: any;
  /** Whether to show colon (only effective in non-bordered horizontal layout) */
  colon?: boolean;
  /** Number of columns per row */
  column?: DescriptionsColumn;
  /** Unified content style */
  contentStyle?: CSSProperties;
  /** Action area located on right side of title */
  extra?: string;
  /** Data-driven items; if omitted, reads VbenDescriptionsItem from default slot */
  items?: DescriptionsItemType[];
  /** Unified label style */
  labelStyle?: CSSProperties;
  /** Layout mode */
  layout?: DescriptionsLayout;
  /** Size */
  size?: DescriptionsSize;
  /** Title */
  title?: string;
}

export interface DescriptionsItemProps {
  content?: DescriptionsRenderNode;
  contentStyle?: CSSProperties;
  label?: DescriptionsRenderNode;
  labelStyle?: CSSProperties;
  span?: DescriptionsItemSpan;
}

/** Normalized internal item, span already resolved to number */
export interface InternalDescriptionsItem {
  _index?: number;
  class?: string;
  content?: DescriptionsRenderNode;
  contentStyle?: CSSProperties;
  filled?: boolean;
  key?: number | string;
  label?: DescriptionsRenderNode;
  labelStyle?: CSSProperties;
  span?: number;
  style?: CSSProperties;
}
