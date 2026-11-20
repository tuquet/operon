import type {
  ContentCompactType,
  LayoutHeaderModeType,
  LayoutType,
  ThemeModeType,
} from '@operon-core/typings';

interface VbenLayoutProps {
  /**
   * Fixed width for content area
   * @default 'wide'
   */
  contentCompact?: ContentCompactType;
  /**
   * Width for fixed-width layout
   * @default 1200
   */
  contentCompactWidth?: number;
  /**
   * padding
   * @default 16
   */
  contentPadding?: number;
  /**
   * paddingBottom
   * @default 16
   */
  contentPaddingBottom?: number;
  /**
   * paddingLeft
   * @default 16
   */
  contentPaddingLeft?: number;
  /**
   * paddingRight
   * @default 16
   */
  contentPaddingRight?: number;
  /**
   * paddingTop
   * @default 16
   */
  contentPaddingTop?: number;
  /**
   * Whether footer is visible
   * @default false
   */
  footerEnable?: boolean;
  /**
   * Whether footer is fixed
   * @default true
   */
  footerFixed?: boolean;
  /**
   * Footer height
   * @default 32
   */
  footerHeight?: number;

  /**
   * Header height
   * @default 48
   */
  headerHeight?: number;
  /**
   * Whether header is hidden
   * @default false
   */
  headerHidden?: boolean;
  /**
   * Header display mode
   * @default 'fixed'
   */
  headerMode?: LayoutHeaderModeType;
  /**
   * Header theme
   */
  headerTheme?: ThemeModeType;
  /**
   * Whether to show toggle sidebar button in header
   * @default
   */
  headerToggleSidebarButton?: boolean;
  /**
   * Whether header is displayed
   * @default true
   */
  headerVisible?: boolean;
  /**
   * Whether mobile display mode
   * @default false
   */
  isMobile?: boolean;
  /**
   * Layout mode
   * sidebar-nav: Sidebar menu layout
   * header-nav: Header menu layout
   * mixed-nav: Sidebar and header menu layout
   * full-content: Full content layout
   * @default sidebar-nav
   */
  layout?: LayoutType;
  /**
   * Sidebar collapse state
   * @default false
   */
  sidebarCollapse?: boolean;
  /**
   * Sidebar collapse button
   * @default true
   */
  sidebarCollapsedButton?: boolean;
  /**
   * Whether to show title when sidebar is collapsed
   * @default true
   */
  sidebarCollapseShowTitle?: boolean;
  /**
   * Whether sidebar is visible
   * @default true
   */
  sidebarEnable?: boolean;
  /**
   * Sidebar collapsed extra width (used when collapsedShowTitle is enabled)
   * @default 48
   */
  sidebarExtraCollapsedWidth?: number;
  /**
   * Whether sidebar collapse button is fixed
   * @default true
   */
  sidebarFixedButton?: boolean;
  /**
   * Whether sidebar is hidden
   * @default false
   */
  sidebarHidden?: boolean;
  /**
   * Sidebar
   * @default dark
   */
  sidebarTheme?: ThemeModeType;
  /**
   * Sidebar width
   * @default 210
   */
  sidebarWidth?: number;
  /**
   * Sidebar collapsed width
   * @default 48
   */
  sideCollapseWidth?: number;
  /**
   * Whether tab is visible
   * @default true
   */
  tabbarEnable?: boolean;
  /**
   * Tab height
   * @default 30
   */
  tabbarHeight?: number;
  /**
   * zIndex
   * @default 100
   */
  zIndex?: number;
}
export type { VbenLayoutProps };
