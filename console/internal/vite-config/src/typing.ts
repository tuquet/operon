import type { Options as HtmlMinifierOptions } from 'html-minifier-terser';
import type { PluginVisualizerOptions } from 'rollup-plugin-visualizer';
import type { PluginOptions } from 'unplugin-dts';
import type {
  ConfigEnv,
  PluginOption,
  UserConfig,
  UserConfigFnPromise,
} from 'vite';
import type { Options as PwaPluginOptions } from 'vite-plugin-pwa';

/**
 * Print plugin configuration options
 * @description Configure console print output
 */
interface PrintPluginOptions {
  /**
   * Data map to print
   * @description Key-value data to print in console
   * @example
   * ```typescript
   * {
   *   'App Version': '1.0.0',
   *   'Build Time': '2024-01-01'
   * }
   * ```
   */
  infoMap?: Record<string, string | undefined>;
}

/**
 * HTML plugin configuration
 * @description Configure HTML minification behavior based on transformIndexHtml
 */
type HtmlPluginOptions = HtmlMinifierOptions;

/**
 * Conditional plugin configuration
 * @description Dynamically load plugins based on conditions
 */
interface ConditionPlugin {
  /**
   * Condition
   * @description Load plugin when condition is true
   */
  condition?: boolean;
  /**
   * Plugin object
   * @description Returns plugin array or Promise
   */
  plugins: () => PluginOption[] | PromiseLike<PluginOption[]>;
}

/**
 * Common plugin configuration options
 * @description Shared base configuration for all plugins
 */
interface CommonPluginOptions {
  /**
   * Whether to enable devtools
   * @default false
   */
  devtools?: boolean;
  /**
   * Environment variables
   * @description Custom environment variables
   */
  env?: Record<string, any>;
  /**
   * Whether to inject metadata
   * @default true
   */
  injectMetadata?: boolean;
  /**
   * Whether build mode is active
   * @default false
   */
  isBuild?: boolean;
  /**
   * Build mode
   * @default 'development'
   */
  mode?: string;
  /**
   * Whether to enable dependency analysis
   * @default false
   * @description Analyze dependencies using rollup-plugin-visualizer
   */
  visualizer?: boolean | PluginVisualizerOptions;
}

/**
 * Application plugin configuration options
 * @description Configure plugin options for application builds
 */
interface ApplicationPluginOptions extends CommonPluginOptions {
  /**
   * Whether to enable dayjs plugin
   * @default true
   */
  dayjs?: boolean;
  /**
   * Whether to extract config file
   * @default false
   * @description Extract configuration file at build time
   */
  extraAppConfig?: boolean;
  /**
   * Whether to enable HTML plugin
   * @default true
   */
  html?: boolean | HtmlPluginOptions;
  /**
   * Whether to enable i18n
   * @default false
   */
  i18n?: boolean;
  /**
   * Whether to inject application loading animation
   * @default true
   */
  injectAppLoading?: boolean;
  /**
   * Whether to inject global SCSS
   * @default true
   */
  injectGlobalScss?: boolean;
  /**
   * Whether to inject license / copyright information
   * @default true
   */
  license?: boolean;
  /**
   * Whether to enable console print output
   * @default false
   */
  print?: boolean;
  /**
   * Print plugin configuration
   */
  printInfoMap?: PrintPluginOptions['infoMap'];
  /**
   * Whether to enable PWA
   * @default false
   */
  pwa?: boolean;
  /**
   * PWA plugin configuration
   */
  pwaOptions?: Partial<PwaPluginOptions>;
}

/**
 * Library plugin configuration options
 * @description Configure plugin options for library builds
 */
interface LibraryPluginOptions extends CommonPluginOptions {
  /**
   * Whether to enable DTS output
   * @default true
   * @description Generate TypeScript declaration files
   */
  dts?: boolean | PluginOptions;
}

/**
 * Application configuration options type
 */
type ApplicationOptions = ApplicationPluginOptions;

/**
 * Library configuration options type
 */
type LibraryOptions = LibraryPluginOptions;

/**
 * Application configuration definition function type
 * @description Define application build configuration
 */
type DefineApplicationOptions = (config?: ConfigEnv) => Promise<{
  /** Application plugin configuration */
  application?: ApplicationOptions;
  /** Vite configuration */
  vite?: UserConfig;
}>;

/**
 * Library configuration definition function type
 * @description Define library build configuration
 */
type DefineLibraryOptions = (config?: ConfigEnv) => Promise<{
  /** Library plugin configuration */
  library?: LibraryOptions;
  /** Vite configuration */
  vite?: UserConfig;
}>;

/**
 * Configuration definition type
 * @description Configuration definition for application or library
 */
type DefineConfig = DefineApplicationOptions | DefineLibraryOptions;

type VbenViteConfig = Promise<UserConfig> | UserConfig | UserConfigFnPromise;

export type {
  ApplicationPluginOptions,
  CommonPluginOptions,
  ConditionPlugin,
  DefineApplicationOptions,
  DefineConfig,
  DefineLibraryOptions,
  HtmlPluginOptions,
  LibraryPluginOptions,
  PrintPluginOptions,
  VbenViteConfig,
};
