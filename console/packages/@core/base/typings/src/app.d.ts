type LayoutType =
  | 'full-content'
  | 'header-nav'
  | 'header-sidebar-nav'
  | 'mixed-nav'
  | 'sidebar-nav';

type ThemeModeType = 'auto' | 'dark' | 'light';

/**
 * Preferences button position
 * auto: Automatically toggle between header/fixed based on layout
 * fixed: Fixed on right edge of screen
 * header: In header toolbar
 * user-dropdown: In user dropdown menu
 * none: Do not display
 */
type PreferencesButtonPositionType =
  | 'auto'
  | 'fixed'
  | 'header'
  | 'none'
  | 'user-dropdown';

type BuiltinThemeType =
  | 'custom'
  | 'deep-blue'
  | 'deep-green'
  | 'default'
  | 'gray'
  | 'green'
  | 'neutral'
  | 'orange'
  | 'pink'
  | 'red'
  | 'rose'
  | 'sky-blue'
  | 'slate'
  | 'stone'
  | 'violet'
  | 'yellow'
  | 'zinc'
  | (Record<never, never> & string);

type ContentCompactType = 'compact' | 'wide';

type LayoutHeaderModeType = 'auto' | 'auto-scroll' | 'fixed' | 'static';
type LayoutHeaderMenuAlignType = 'center' | 'end' | 'start';

/**
 * Login expiration mode
 * modal: Modal dialog mode
 * page: Full page redirect mode
 */
type LoginExpiredModeType = 'modal' | 'page';

/**
 * Breadcrumb style
 * background: Filled background
 * normal: Default minimal
 */
type BreadcrumbStyleType = 'background' | 'normal';

/**
 * Access control mode
 * backend: Backend mode
 * frontend: Frontend mode
 * mixed: Mixed mode
 */
type AccessModeType = 'backend' | 'frontend' | 'mixed';

/**
 * Navigation style
 * plain: Plain
 * rounded: Rounded
 */
type NavigationStyleType = 'plain' | 'rounded';

/**
 * Tabbar style
 * brisk: Brisk
 * card: Card
 * chrome: Chrome-like
 * plain: Plain
 */
type TabsStyleType = 'brisk' | 'card' | 'chrome' | 'plain';

/**
 * Page transition animation
 */
type PageTransitionType = 'fade' | 'fade-down' | 'fade-slide' | 'fade-up';

/**
 * Page transition animation
 * panel-center: Center layout
 * panel-left: Left layout
 * panel-right: Right layout
 */
type AuthPageLayoutType = 'panel-center' | 'panel-left' | 'panel-right';

/**
 * Timezone option
 */
interface TimezoneOption {
  label: string;
  offset: number;
  timezone: string;
}

export type {
  AccessModeType,
  AuthPageLayoutType,
  BreadcrumbStyleType,
  BuiltinThemeType,
  ContentCompactType,
  LayoutHeaderMenuAlignType,
  LayoutHeaderModeType,
  LayoutType,
  LoginExpiredModeType,
  NavigationStyleType,
  PageTransitionType,
  PreferencesButtonPositionType,
  TabsStyleType,
  ThemeModeType,
  TimezoneOption,
};
