import type {
  AccessModeType,
  AuthPageLayoutType,
  BreadcrumbStyleType,
  BuiltinThemeType,
  ContentCompactType,
  DeepPartial,
  LayoutHeaderMenuAlignType,
  LayoutHeaderModeType,
  LayoutType,
  LoginExpiredModeType,
  NavigationStyleType,
  PageTransitionType,
  PreferencesButtonPositionType,
  SupportedLanguagesType,
  TabsStyleType,
  ThemeModeType,
} from '@operon-core/typings';

type CustomPreferencesValue = boolean | number | string;

interface CustomPreferencesOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

interface BaseCustomPreferencesField<
  TKey extends string = string,
  TValue extends CustomPreferencesValue = CustomPreferencesValue,
> {
  componentProps?: Record<string, any>;
  defaultValue: TValue;
  disabled?: boolean;
  key: TKey;
  label: string;
  placeholder?: string;
  tip?: string;
}

interface CustomPreferencesInputField<
  TKey extends string = string,
> extends BaseCustomPreferencesField<TKey, string> {
  component: 'input';
}

interface CustomPreferencesNumberField<
  TKey extends string = string,
> extends BaseCustomPreferencesField<TKey, number> {
  component: 'number';
}

interface CustomPreferencesSelectField<
  TKey extends string = string,
> extends BaseCustomPreferencesField<TKey, string> {
  component: 'select';
  options: CustomPreferencesOption[];
}

interface CustomPreferencesSwitchField<
  TKey extends string = string,
> extends BaseCustomPreferencesField<TKey, boolean> {
  component: 'switch';
}

type CustomPreferencesRecord = Record<string, CustomPreferencesValue>;

type AnyCustomPreferencesField =
  | CustomPreferencesInputField
  | CustomPreferencesNumberField
  | CustomPreferencesSelectField
  | CustomPreferencesSwitchField;

type CustomPreferencesField<
  TCustomPreferences extends object = CustomPreferencesRecord,
> =
  string extends Extract<keyof TCustomPreferences, string>
    ? AnyCustomPreferencesField
    : {
        [
          K in Extract<keyof TCustomPreferences, string>
        ]: TCustomPreferences[K] extends boolean
          ? CustomPreferencesSwitchField<K>
          : TCustomPreferences[K] extends number
            ? CustomPreferencesNumberField<K>
            : TCustomPreferences[K] extends string
              ? CustomPreferencesInputField<K> | CustomPreferencesSelectField<K>
              : never;
      }[Extract<keyof TCustomPreferences, string>];

interface PreferencesExtension<
  TCustomPreferences extends object = CustomPreferencesRecord,
> {
  fields: Array<CustomPreferencesField<TCustomPreferences>>;
  tabLabel: string;
  title?: string;
}

interface AppPreferences {
  /** Access control mode */
  accessMode: AccessModeType;
  /** Auth page layout */
  authPageLayout: AuthPageLayoutType;
  /** Check updates polling interval */
  checkUpdatesInterval: number;
  /** Whether grayscale mode is active */
  colorGrayMode: boolean;
  /** Whether color-weak mode is active */
  colorWeakMode: boolean;
  /** Whether compact mode is active */
  compact: boolean;
  /** Whether content compact mode is active */
  contentCompact: ContentCompactType;
  /** Content compact width */
  contentCompactWidth: number;
  /** Content padding */
  contentPadding: number;
  /** Content bottom padding */
  contentPaddingBottom: number;
  /** Content left padding */
  contentPaddingLeft: number;
  /** Content right padding */
  contentPaddingRight: number;
  /** Content top padding */
  contentPaddingTop: number;
  /** Default application avatar */
  defaultAvatar: string;
  /** Default home path */
  defaultHomePath: string;
  /** Enable dynamic title */
  dynamicTitle: boolean;
  /** Whether to check for updates */
  enableCheckUpdates: boolean;
  /** Whether to show copy preferences button */
  enableCopyPreferences: boolean;
  /** Whether to show preferences */
  enablePreferences: boolean;
  /**
   * Whether to enable refreshToken
   */
  enableRefreshToken: boolean;
  /**
   * Whether preferences navbar is sticky
   */
  enableStickyPreferencesNavigationBar: boolean;
  /** Whether viewport is mobile */
  isMobile: boolean;
  /** Layout mode */
  layout: LayoutType;
  /** Supported languages */
  locale: SupportedLanguagesType;
  /** Login expiration mode */
  loginExpiredMode: LoginExpiredModeType;
  /** Application name */
  name: string;
  /** Preferences button position */
  preferencesButtonPosition: PreferencesButtonPositionType;
  /**
   * Application timezone
   */
  timezone: string;
  /**
   * Whether watermark is enabled
   */
  watermark: boolean;
  /**
   * Watermark text
   */
  watermarkContent: string;
  /** z-index */
  zIndex: number;
}

interface BreadcrumbPreferences {
  /** Whether breadcrumbs are enabled */
  enable: boolean;
  /** Whether to hide breadcrumb when only one level */
  hideOnlyOne: boolean;
  /** Whether home icon in breadcrumb is visible */
  showHome: boolean;
  /** Whether breadcrumb icons are visible */
  showIcon: boolean;
  /** Breadcrumb style */
  styleType: BreadcrumbStyleType;
}

interface CopyrightPreferences {
  /** Copyright company name */
  companyName: string;
  /** Copyright company URL */
  companySiteLink: string;
  /** Copyright date */
  date: string;
  /** Whether copyright is visible */
  enable: boolean;
  /** ICP license number */
  icp: string;
  /** ICP license URL */
  icpLink: string;
  /** Whether preferences panel is visible */
  settingShow?: boolean;
}

interface FooterPreferences {
  /** Whether footer is visible */
  enable: boolean;
  /** Whether footer is fixed */
  fixed: boolean;
  /** Footer height */
  height: number;
}

interface HeaderPreferences {
  /** Whether header is enabled */
  enable: boolean;
  /** Header height */
  height: number;
  /** Whether header is hidden via CSS */
  hidden: boolean;
  /** Header menu align */
  menuAlign: LayoutHeaderMenuAlignType;
  /** Header display mode */
  mode: LayoutHeaderModeType;
}

interface LogoPreferences {
  /** Whether logo is visible */
  enable: boolean;
  /** Logo object-fit mode */
  fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Logo height (effective only when logoMode=full) */
  fullLogoHeight?: number | string;
  /** Logo display type: icon or full */
  logoMode: 'full' | 'icon';
  /** Whether logo text is visible */
  showText: boolean;
  /** Logo URL */
  source: string;
  /** Dark theme Logo URL */
  sourceDark?: string;
}

interface NavigationPreferences {
  /** Menu accordion mode */
  accordion: boolean;
  /** Menu split mode (effective only in layout=mixed-nav) */
  split: boolean;
  /** Menu style */
  styleType: NavigationStyleType;
}

interface SidebarPreferences {
  /** Automatically activate sub-menu on directory click */
  autoActivateChild: boolean;
  /** Whether sidebar is collapsed */
  collapsed: boolean;
  /** Whether sidebar collapse button is visible */
  collapsedButton: boolean;
  /** Whether to show title when sidebar is collapsed */
  collapsedShowTitle: boolean;
  /** Sidebar collapsed width */
  collapseWidth: number;
  /** Sidebar drag resize */
  draggable: boolean;
  /** Whether sidebar is visible */
  enable: boolean;
  /** Menu auto-expand state */
  expandOnHover: boolean;
  /** Whether sidebar extra area is collapsed */
  extraCollapse: boolean;
  /** Sidebar extra area collapsed width */
  extraCollapsedWidth: number;
  /** Whether sidebar pin button is visible */
  fixedButton: boolean;
  /** Whether sidebar is hidden via CSS */
  hidden: boolean;
  /** Mixed sidebar width */
  mixedWidth: number;
  /** Sidebar width */
  width: number;
}

interface ShortcutKeyPreferences {
  /** Whether global shortcuts are enabled */
  enable: boolean;
  /** Enable global close window shortcut */
  globalEscape: boolean;
  /** Enable global lockscreen shortcut */
  globalLockScreen: boolean;
  /** Enable global logout shortcut */
  globalLogout: boolean;
  /** Enable global preferences shortcut */
  globalPreferences: boolean;
  /** Enable global search shortcut */
  globalSearch: boolean;
}

interface TabbarPreferences {
  /** Enable tabbar drag reorder */
  draggable: boolean;
  /** Whether tabbar is enabled */
  enable: boolean;
  /** Tabbar height */
  height: number;
  /** Enable tab caching */
  keepAlive: boolean;
  /** Max tabs limit */
  maxCount: number;
  /** Whether middle-click closes tab */
  middleClickToClose: boolean;
  /** Whether to persist tabs */
  persist: boolean;
  /** Show tab icons */
  showIcon: boolean;
  /** Show maximize button */
  showMaximize: boolean;
  /** Show more button */
  showMore: boolean;
  /** Show refresh button */
  showRefresh: boolean;
  /** Tabbar style */
  styleType: TabsStyleType;
  /** Enable visit history */
  visitHistory: boolean;
  /** Enable mouse wheel scroll */
  wheelable: boolean;
}

interface ThemePreferences {
  /** Built-in theme name */
  builtinType: BuiltinThemeType;
  /** Destructive color */
  colorDestructive: string;
  /** Primary theme color */
  colorPrimary: string;
  /** Success color */
  colorSuccess: string;
  /** Warning color */
  colorWarning: string;
  /** Font size in px */
  fontSize: number;
  /** Current theme */
  mode: ThemeModeType;
  /** Border radius */
  radius: string;
  /** Semi-dark header (light theme only) */
  semiDarkHeader: boolean;
  /** Semi-dark menu (light theme only) */
  semiDarkSidebar: boolean;
  /** Semi-dark sub-menu (light theme only) */
  semiDarkSidebarSub: boolean;
}

interface TransitionPreferences {
  /** Whether page transition animations are enabled */
  enable: boolean;
  // /** Whether page loading spinner is enabled */
  loading: boolean;
  /** Page transition animation name */
  name: PageTransitionType | string;
  /** Whether page progress bar is enabled */
  progress: boolean;
}

interface WidgetPreferences {
  /** Whether fullscreen widget is enabled */
  fullscreen: boolean;
  /** Fullscreen button position */
  fullscreenButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether global search widget is enabled */
  globalSearch: boolean;
  /** Global search button position */
  globalSearchButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether language toggle widget is enabled */
  languageToggle: boolean;
  /** Language toggle button position */
  languageToggleButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether lockscreen widget is enabled */
  lockScreen: boolean;
  /** Lockscreen button position */
  lockScreenButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Logout button position */
  logoutButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether notification widget is visible */
  notification: boolean;
  /** Notification button position */
  notificationButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Widgets ordering */
  order: readonly string[];
  /** Show refresh button */
  refresh: boolean;
  /** Refresh button position */
  refreshButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether sidebar toggle widget is visible */
  sidebarToggle: boolean;
  /** Whether theme toggle widget is visible */
  themeToggle: boolean;
  /** Theme toggle button position */
  themeToggleButtonPosition: 'header' | 'none' | 'user-dropdown';
  /** Whether timezone widget is visible */
  timezone: boolean;
  /** Timezone button position */
  timezoneButtonPosition: 'header' | 'none' | 'user-dropdown';
}

interface Preferences {
  /** Global configuration */
  app: AppPreferences;
  /** Header configuration */
  breadcrumb: BreadcrumbPreferences;
  /** Copyright configuration */
  copyright: CopyrightPreferences;
  /** Footer configuration */
  footer: FooterPreferences;
  /** Breadcrumb configuration */
  header: HeaderPreferences;
  /** Logo configuration */
  logo: LogoPreferences;
  /** Navigation configuration */
  navigation: NavigationPreferences;
  /** Shortcuts configuration */
  shortcutKeys: ShortcutKeyPreferences;
  /** Sidebar configuration */
  sidebar: SidebarPreferences;
  /** Tabbar configuration */
  tabbar: TabbarPreferences;
  /** Theme configuration */
  theme: ThemePreferences;
  /** Animation configuration */
  transition: TransitionPreferences;
  /** Widget configuration */
  widget: WidgetPreferences;
}

type PreferencesKeys = keyof Preferences;

interface InitialOptions<
  TCustomPreferences extends object = CustomPreferencesRecord,
> {
  extension?: PreferencesExtension<TCustomPreferences>;
  namespace: string;
  overrides?: DeepPartial<Preferences>;
}
export type {
  AnyCustomPreferencesField,
  AppPreferences,
  BaseCustomPreferencesField,
  BreadcrumbPreferences,
  CustomPreferencesField,
  CustomPreferencesInputField,
  CustomPreferencesNumberField,
  CustomPreferencesOption,
  CustomPreferencesRecord,
  CustomPreferencesSelectField,
  CustomPreferencesSwitchField,
  CustomPreferencesValue,
  FooterPreferences,
  HeaderPreferences,
  InitialOptions,
  LogoPreferences,
  NavigationPreferences,
  Preferences,
  PreferencesExtension,
  PreferencesKeys,
  ShortcutKeyPreferences,
  SidebarPreferences,
  SupportedLanguagesType,
  TabbarPreferences,
  ThemePreferences,
  TransitionPreferences,
  WidgetPreferences,
};
