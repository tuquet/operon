import type { DeepPartial } from '@operon-core/typings';

import type {
  CustomPreferencesField,
  CustomPreferencesRecord,
  InitialOptions,
  Preferences,
  PreferencesExtension,
} from './types';

import { markRaw, reactive, readonly, watch } from 'vue';

import { MemoryStorageDriver, StorageManager } from '@operon-core/shared/cache';
import { isMacOs, mergeWithArrayOverride } from '@operon-core/shared/utils';

import {
  breakpointsTailwind,
  useBreakpoints,
  useDebounceFn,
} from '@vueuse/core';

import { defaultPreferences } from './config';
import { BUILT_IN_THEME_PRESETS } from './constants';
import {
  isDarkTheme,
  updateCSSVariables,
  updateFontFamilyVariable,
} from './update-css-variables';

const STORAGE_KEYS = {
  CUSTOM: 'preferences-custom',
  MAIN: 'preferences',
  LOCALE: 'preferences-locale',
  THEME: 'preferences-theme',
} as const;

class PreferenceManager {
  private cache: StorageManager;
  private customPreferencesExtension: null | PreferencesExtension<any> = null;
  private customState = reactive<CustomPreferencesRecord>({});
  private debouncedSave: () => void;
  private initialCustomPreferences: CustomPreferencesRecord = {};
  private initialPreferences: Preferences = defaultPreferences;
  private isInitialized = false;
  private state: Preferences;

  constructor() {
    this.cache = new StorageManager({ driver: new MemoryStorageDriver() });
    // Constructor does not synchronously read cache; initialize with defaults
    // Actual cache loading happens in initPreferences (async)
    this.state = reactive<Preferences>({ ...defaultPreferences });
    this.debouncedSave = useDebounceFn(() => this.saveToCache(), 150);
  }

  /**
   * Clear all cached preferences
   */
  clearCache = async () => {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) => this.cache.removeItem(key)),
    );
  };

  /**
   * Get extended preferences
   */
  getCustomPreferences = <
    TCustomPreferences extends object = CustomPreferencesRecord,
  >() => {
    return readonly(this.customState) as Readonly<TCustomPreferences>;
  };

  /**
   * Get initial extended preferences
   */
  getInitialCustomPreferences = <
    TCustomPreferences extends object = CustomPreferencesRecord,
  >() => {
    return this.cloneValue(
      this.initialCustomPreferences,
    ) as Readonly<TCustomPreferences>;
  };

  /**
   * Get initial preferences
   */
  getInitialPreferences = () => {
    return this.cloneValue(this.initialPreferences);
  };

  /**
   * Get current preferences (readonly)
   */
  getPreferences = () => {
    return readonly(this.state);
  };

  /**
   * Get extended preferences configuration
   */
  getPreferencesExtension = <
    TCustomPreferences extends object = CustomPreferencesRecord,
  >() => {
    return this.customPreferencesExtension
      ? (this.cloneValue(this.customPreferencesExtension) as Readonly<
          PreferencesExtension<TCustomPreferences>
        >)
      : null;
  };

  /**
   * Initialize preferences
   * @param options - Initialization options
   * @param options.namespace - Namespace to isolate configuration between apps
   * @param options.overrides - Preference overrides
   */
  initPreferences = async <
    TCustomPreferences extends object = CustomPreferencesRecord,
  >({
    namespace,
    overrides,
    extension,
  }: InitialOptions<TCustomPreferences>) => {
    // Prevent duplicate initialization
    if (this.isInitialized) {
      return;
    }

    // Initialize storage manager with namespace
    this.cache = new StorageManager({ prefix: namespace });

    // Merge initial preferences: preceding objects take precedence; trailing objects fill missing fields
    this.initialPreferences = mergeWithArrayOverride(
      {},
      overrides,
      defaultPreferences,
    );
    this.syncBuiltinThemeColor(this.initialPreferences);
    this.customPreferencesExtension = extension ?? null;
    this.initialCustomPreferences = this.resolveCustomPreferencesDefaults(
      this.customPreferencesExtension,
    );

    // Load cached preferences, filling in fields not explicitly configured
    const cachedPreferences = ((await this.loadFromCache()) || {}) as Record<
      string,
      any
    >;
    // Fix dirty data: earlier versions used defu(merge) which concats arrays, causing widget.order
    // to bloat with duplicate keys on every update.
    // Deduplicate here after loading cache, preserving first occurrence.
    this.sanitizeCachedArray(cachedPreferences, 'widget', 'order');
    if (cachedPreferences.app) {
      delete (cachedPreferences.app as Record<string, unknown>).isMobile;
    }
    const mergedPreference = mergeWithArrayOverride(
      {},
      cachedPreferences, // User cached preferences take priority
      this.initialPreferences, // Initial settings fill missing fields
    );

    // Update preferences
    this.updatePreferences(mergedPreference);

    const cachedCustom = (await this.loadCustomFromCache()) || {};
    this.replaceCustomPreferences(
      mergeWithArrayOverride(
        {},
        this.sanitizeCustomPreferences(cachedCustom),
        this.initialCustomPreferences,
      ),
    );
    await this.saveToCache();

    // Setup listeners
    this.setupWatcher();
    (this.debouncedSave as any)?.cancel?.();

    // Initialize platform identity
    this.initPlatform();

    this.isInitialized = true;
  };

  /**
   * Reset preferences to initial state
   */
  resetPreferences = async () => {
    // Cancel any pending debounced saves to prevent re-caching obsolete states
    (this.debouncedSave as any)?.cancel?.();

    // Preserve dynamic runtime viewport state across reset
    const currentIsMobile = this.state.app.isMobile;

    // Reset state to initial preferences using deep-clone baseline isolation
    Object.assign(this.state, this.cloneValue(this.initialPreferences));
    this.replaceCustomPreferences(
      this.cloneValue(this.initialCustomPreferences),
    );

    // Restore dynamic viewport status so mobile state is preserved
    this.state.app.isMobile = currentIsMobile;

    // Trigger UI updates directly
    this.handleUpdates(this.state);

    // Pristine Cache Purge on Reset: cleanly purge STORAGE_KEYS from storage
    // so subsequent F5 page reloads never restore stale user overrides
    await Promise.all([
      this.cache.removeItem(STORAGE_KEYS.MAIN),
      this.cache.removeItem(STORAGE_KEYS.CUSTOM),
      this.cache.removeItem(STORAGE_KEYS.LOCALE),
      this.cache.removeItem(STORAGE_KEYS.THEME),
    ]);
  };

  /**
   * Update extended preferences
   * @param updates - Extended preferences to update
   */
  updateCustomPreferences = <
    TCustomPreferences extends object = CustomPreferencesRecord,
  >(
    updates: DeepPartial<TCustomPreferences>,
  ) => {
    if (!this.customPreferencesExtension) {
      return;
    }

    const sanitizedUpdates = this.sanitizeCustomPreferences(
      updates as DeepPartial<CustomPreferencesRecord>,
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      return;
    }

    this.replaceCustomPreferences(
      mergeWithArrayOverride({}, sanitizedUpdates, markRaw(this.customState)),
    );
    this.debouncedSave();
  };

  /**
   * Update preferences
   * @param updates - Preferences to update
   */
  updatePreferences = (updates: DeepPartial<Preferences>) => {
    // Deep merge updates into current state
    // Note: must use mergeWithArrayOverride instead of merge.
    // defu(merge) semantics for arrays is concat, causing bloat in widget.order etc.
    // Array fields get repeatedly appended on each updatePreferences, causing exponential bloat.
    const mergedState = mergeWithArrayOverride(
      {},
      updates,
      markRaw(this.state),
    );
    Object.assign(this.state, mergedState);
    if (
      updates.theme &&
      (Reflect.has(updates.theme, 'builtinType') ||
        Reflect.has(updates.theme, 'mode'))
    ) {
      this.syncBuiltinThemeColor(this.state);
    }

    // Execute updates based on incoming values
    this.handleUpdates(updates);

    // Save to cache (fire-and-forget, throttled via debounce)
    this.debouncedSave();
  };

  private cloneValue<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.cloneValue(item)) as T;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([key, nestedValue]) => [key, this.cloneValue(nestedValue)],
        ),
      ) as T;
    }

    return value;
  }

  /**
   * Handle preference updates
   * @param updates - Preference updates
   */
  private handleUpdates(updates: DeepPartial<Preferences>) {
    const { theme, app } = updates;

    if (
      theme &&
      (Object.keys(theme).length > 0 || Reflect.has(theme, 'fontSize'))
    ) {
      updateCSSVariables(this.state);
    }

    if (
      app &&
      (Reflect.has(app, 'colorGrayMode') || Reflect.has(app, 'colorWeakMode'))
    ) {
      this.updateColorMode(this.state);
    }
  }

  /**
   * Initialize platform identity
   */
  private initPlatform() {
    document.documentElement.dataset.platform = isMacOs() ? 'macOs' : 'window';
  }

  private isAlmostInteger(value: number, epsilon = Number.EPSILON * 10) {
    return Math.abs(value - Math.round(value)) < epsilon;
  }

  private isValidCustomPreferenceValue(
    field: CustomPreferencesField,
    value: unknown,
  ) {
    switch (field.component) {
      case 'number': {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return false;
        }

        const max = this.resolveNumericConstraint(field.componentProps?.max);
        const min = this.resolveNumericConstraint(field.componentProps?.min);
        const step = this.resolveNumericConstraint(field.componentProps?.step);

        if (min !== undefined && value < min) {
          return false;
        }

        if (max !== undefined && value > max) {
          return false;
        }

        if (step !== undefined) {
          if (step <= 0) {
            return false;
          }

          const stepBase = min ?? 0;
          const stepCount = (value - stepBase) / step;

          if (!this.isAlmostInteger(stepCount)) {
            return false;
          }
        }

        return true;
      }
      case 'select': {
        return (
          typeof value === 'string' &&
          field.options.some((option) => option.value === value)
        );
      }
      case 'switch': {
        return typeof value === 'boolean';
      }
      default: {
        return typeof value === 'string';
      }
    }
  }

  /**
   * Load extended preferences from cache
   * @returns Cached extended preferences, or null if absent
   */
  private async loadCustomFromCache(): Promise<CustomPreferencesRecord | null> {
    return this.cache.getItem<CustomPreferencesRecord>(STORAGE_KEYS.CUSTOM);
  }

  /**
   * Load preferences from cache
   * @returns Cached preferences, or null if absent
   */
  private async loadFromCache(): Promise<null | Preferences> {
    return this.cache.getItem<Preferences>(STORAGE_KEYS.MAIN);
  }

  private replaceCustomPreferences(preferences: CustomPreferencesRecord) {
    Object.keys(this.customState).forEach((key) => {
      Reflect.deleteProperty(this.customState, key);
    });
    Object.assign(this.customState, preferences);

    if (Reflect.has(preferences, 'fontFamily')) {
      updateFontFamilyVariable(preferences.fontFamily as string);
    }
  }

  private resolveCustomPreferencesDefaults(
    extension: null | PreferencesExtension<any>,
  ) {
    if (!extension) {
      return {};
    }

    const result: CustomPreferencesRecord = {};

    for (const field of extension.fields) {
      result[field.key] = field.defaultValue;
    }

    return result;
  }

  private resolveNumericConstraint(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  /**
   * Clean up bloated array fields in cache (preserve first occurrence)
   * Fixes dirty data caused by earlier defu concat behavior
   */
  private sanitizeCachedArray(
    cached: Record<string, any>,
    group: string,
    field: string,
  ) {
    const node = cached?.[group]?.[field];
    if (!Array.isArray(node) || node.length <= 1) return;
    const seen = new Set<unknown>();
    const deduped = node.filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
    if (deduped.length !== node.length) {
      cached[group][field] = deduped;
    }
  }

  private sanitizeCustomPreferences(
    updates: DeepPartial<CustomPreferencesRecord>,
  ) {
    if (!this.customPreferencesExtension) {
      return {};
    }

    const result: CustomPreferencesRecord = {};

    for (const field of this.customPreferencesExtension.fields) {
      const value = updates[field.key];

      if (
        value !== undefined &&
        this.isValidCustomPreferenceValue(field, value)
      ) {
        result[field.key] = value;
      }
    }

    return result;
  }

  /**
   * Save preferences to cache
   */
  private async saveToCache() {
    try {
      const stateToCache = this.cloneValue(this.state);
      if (stateToCache.app) {
        delete (stateToCache.app as unknown as Record<string, unknown>)
          .isMobile;
      }
      await this.cache.setItem(STORAGE_KEYS.MAIN, stateToCache);
      await this.cache.setItem(STORAGE_KEYS.LOCALE, this.state.app.locale);
      await this.cache.setItem(STORAGE_KEYS.THEME, this.state.theme.mode);

      if (this.customPreferencesExtension) {
        await this.cache.setItem(STORAGE_KEYS.CUSTOM, {
          ...this.customState,
        });
        return;
      }

      await this.cache.removeItem(STORAGE_KEYS.CUSTOM);
    } catch (error) {
      console.error('Failed to save preferences to cache:', error);
    }
  }

  /**
   * Watch state and system preference changes
   */
  private setupWatcher() {
    if (this.isInitialized) {
      return;
    }

    // Watch breakpoint to determine mobile status
    const breakpoints = useBreakpoints(breakpointsTailwind);
    const isMobile = breakpoints.smaller('md');

    watch(
      () => isMobile.value,
      (val) => {
        this.updatePreferences({
          app: { isMobile: val },
        });
      },
      { immediate: true },
    );

    // Watch system color scheme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', ({ matches: isDark }) => {
        // Follow system theme only in auto mode
        if (this.state.theme.mode === 'auto') {
          // Apply actual theme first
          this.updatePreferences({
            theme: { mode: isDark ? 'dark' : 'light' },
          });
          // Restore to auto mode to preserve following system status
          this.updatePreferences({
            theme: { mode: 'auto' },
          });
        }
      });
  }

  private syncBuiltinThemeColor(preference: Preferences) {
    const { builtinType, mode } = preference.theme ?? {};
    if (!builtinType || builtinType === 'custom') {
      return;
    }
    const preset = BUILT_IN_THEME_PRESETS.find(
      (item) => item.type === builtinType,
    );
    if (!preset) {
      return;
    }
    const isDark = isDarkTheme(mode);
    const color = isDark
      ? preset.darkPrimaryColor || preset.primaryColor
      : preset.primaryColor;
    const resolvedColor = color || preset.color;
    if (resolvedColor) {
      preference.theme.colorPrimary = resolvedColor;
    }
  }

  /**
   * Update page color filter modes (grayscale, color-weak)
   * @param preference - Preferences
   */
  private updateColorMode(preference: Preferences) {
    const { colorGrayMode, colorWeakMode } = preference.app;
    const dom = document.documentElement;

    dom.classList.toggle('invert-mode', colorWeakMode);
    dom.classList.toggle('grayscale-mode', colorGrayMode);
  }
}

const preferencesManager = new PreferenceManager();

export { PreferenceManager, preferencesManager };
