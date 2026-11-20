import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultPreferences } from '../src/config';
import { isDarkTheme, updateCSSVariables } from '../src/update-css-variables';

describe('preferences', () => {
  let PreferenceManager: typeof import('../src/preferences').PreferenceManager;
  let preferenceManager: InstanceType<
    typeof import('../src/preferences').PreferenceManager
  >;

  // Mock window.matchMedia method
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(), // Deprecated
      dispatchEvent: vi.fn(),
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(), // Deprecated
    })),
  );

  vi.stubGlobal('localStorage', {
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    length: 0,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });

  vi.stubGlobal('sessionStorage', {
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    length: 0,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });

  beforeAll(async () => {
    ({ PreferenceManager } = await import('../src/preferences'));
  });

  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockImplementation(() => null);
    vi.mocked(localStorage.removeItem).mockReset();
    vi.mocked(localStorage.setItem).mockReset();
    vi.mocked(sessionStorage.getItem).mockImplementation(() => null);
    vi.mocked(sessionStorage.removeItem).mockReset();
    vi.mocked(sessionStorage.setItem).mockReset();
    preferenceManager = new PreferenceManager();
  });

  it('loads default preferences if no saved preferences found', () => {
    const preferences = preferenceManager.getPreferences();
    expect(preferences).toEqual(defaultPreferences);
  });

  it('uses memory storage until preferences are initialized', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();

    try {
      const manager = new PreferenceManager();
      manager.updatePreferences({ app: { locale: 'en-US' } });
      await vi.advanceTimersByTimeAsync(151);

      expect(localStorage.setItem).not.toHaveBeenCalled();

      await manager.initPreferences({
        namespace: 'testNamespace',
      });
      vi.mocked(localStorage.setItem).mockClear();

      manager.updatePreferences({ app: { locale: 'en-US' } });
      await vi.advanceTimersByTimeAsync(151);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'testNamespace-preferences',
        expect.any(String),
      );
      expect(
        vi
          .mocked(localStorage.setItem)
          .mock.calls.every(([key]) => key.startsWith('testNamespace-')),
      ).toBe(true);
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('empty prefix'),
      );
    } finally {
      vi.clearAllTimers();
      warnSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('initializes preferences with overrides', async () => {
    const overrides: any = {
      app: {
        locale: 'en-US',
      },
    };
    await preferenceManager.initPreferences({
      namespace: 'testNamespace',
      overrides,
    });

    // Await debounce operation completion
    // await new Promise((resolve) => setTimeout(resolve, 300)); // Wait 100ms

    const expected = {
      ...defaultPreferences,
      app: {
        ...defaultPreferences.app,
        ...overrides.app,
      },
    };

    expect(preferenceManager.getPreferences()).toEqual(expected);
  });

  it('updates theme mode correctly', () => {
    preferenceManager.updatePreferences({
      theme: {
        mode: 'light',
      },
    });

    expect(preferenceManager.getPreferences().theme.mode).toBe('light');
  });

  it('updates color modes correctly', () => {
    preferenceManager.updatePreferences({
      app: { colorGrayMode: true, colorWeakMode: true },
    });

    expect(preferenceManager.getPreferences().app.colorGrayMode).toBe(true);
    expect(preferenceManager.getPreferences().app.colorWeakMode).toBe(true);
  });

  it('resets preferences to default', async () => {
    // First update some preferences
    preferenceManager.updatePreferences({
      theme: {
        mode: 'light',
      },
    });

    // Then reset preferences
    await preferenceManager.resetPreferences();

    expect(preferenceManager.getPreferences()).toEqual(defaultPreferences);
  });

  it('applies reset side effects before persisting preferences', async () => {
    preferenceManager.updatePreferences({
      theme: {
        mode: 'light',
      },
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    const resetPromise = preferenceManager.resetPreferences();

    expect(preferenceManager.getPreferences().theme.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await resetPromise;
  });

  it('updates isMobile correctly', () => {
    // Mock mobile viewport status
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );

    preferenceManager.updatePreferences({
      app: { isMobile: true },
    });

    expect(preferenceManager.getPreferences().app.isMobile).toBe(true);
  });

  it('updates the locale preference correctly', () => {
    preferenceManager.updatePreferences({
      app: { locale: 'en-US' },
    });

    expect(preferenceManager.getPreferences().app.locale).toBe('en-US');
  });

  it('updates the sidebar width correctly', () => {
    preferenceManager.updatePreferences({
      sidebar: { width: 200 },
    });

    expect(preferenceManager.getPreferences().sidebar.width).toBe(200);
  });
  it('updates the sidebar collapse state correctly', () => {
    preferenceManager.updatePreferences({
      sidebar: { collapsed: true },
    });

    expect(preferenceManager.getPreferences().sidebar.collapsed).toBe(true);
  });
  it('updates the navigation style type correctly', () => {
    preferenceManager.updatePreferences({
      navigation: { styleType: 'flat' },
    } as any);

    expect(preferenceManager.getPreferences().navigation.styleType).toBe(
      'flat',
    );
  });

  it('resets preferences to default correctly', async () => {
    // First update some preferences
    preferenceManager.updatePreferences({
      app: { locale: 'en-US' },
      sidebar: { collapsed: true, width: 200 },
      theme: {
        mode: 'light',
      },
    });

    // Then reset preferences
    await preferenceManager.resetPreferences();

    expect(preferenceManager.getPreferences()).toEqual(defaultPreferences);
  });

  it('preserves runtime isMobile status across resetPreferences', async () => {
    // Set isMobile to true (as when browsing on mobile viewport)
    preferenceManager.updatePreferences({
      app: { isMobile: true, locale: 'vi-VN' },
      theme: { mode: 'light' },
    });

    expect(preferenceManager.getPreferences().app.isMobile).toBe(true);
    expect(preferenceManager.getPreferences().app.locale).toBe('vi-VN');

    // Reset preferences
    await preferenceManager.resetPreferences();

    // isMobile MUST remain true (not clobbered by defaultPreferences.isMobile=false)
    expect(preferenceManager.getPreferences().app.isMobile).toBe(true);
    // User preferences MUST be reset to default
    expect(preferenceManager.getPreferences().app.locale).toBe('en-US');
    expect(preferenceManager.getPreferences().theme.mode).toBe('dark');
  });

  it('purges cached preferences on reset without re-saving obsolete state', async () => {
    await preferenceManager.initPreferences({
      namespace: 'testReset',
    });

    preferenceManager.updatePreferences({
      theme: { mode: 'light' },
    });

    await preferenceManager.resetPreferences();

    // Cache must have been removed
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      'testReset-preferences',
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      'testReset-preferences-custom',
    );
  });

  it('does not update undefined preferences', () => {
    const originalPreferences = preferenceManager.getPreferences();

    preferenceManager.updatePreferences({
      app: { nonexistentField: 'value' },
    } as any);

    expect(preferenceManager.getPreferences()).toEqual(originalPreferences);
  });

  it('reverts to default when a preference field is deleted', () => {
    preferenceManager.updatePreferences({
      app: { locale: 'en-US' },
    });

    preferenceManager.updatePreferences({
      app: { locale: undefined },
    });

    expect(preferenceManager.getPreferences().app.locale).toBe('en-US');
  });

  it('ignores updates with invalid preference value types', () => {
    const originalPreferences = preferenceManager.getPreferences();

    preferenceManager.updatePreferences({
      app: { isMobile: 'true' as unknown as boolean }, // Invalid type
    });

    expect(preferenceManager.getPreferences()).toEqual(originalPreferences);
  });

  it('merges nested preference objects correctly', () => {
    preferenceManager.updatePreferences({
      app: { name: 'New App Name' },
    });

    const expected = {
      ...defaultPreferences,
      app: {
        ...defaultPreferences.app,
        name: 'New App Name',
      },
    };

    expect(preferenceManager.getPreferences()).toEqual(expected);
  });

  it('applies updates immediately after initialization', async () => {
    const overrides: any = {
      app: {
        locale: 'en-US',
      },
    };

    await preferenceManager.initPreferences({
      namespace: 'apply-updates',
      overrides,
    });

    preferenceManager.updatePreferences({
      theme: { mode: 'light' },
    });

    expect(preferenceManager.getPreferences().theme.mode).toBe('light');
  });

  it('migrates legacy cached defaultHomePath values to /dashboard/overview', async () => {
    const namespace = 'migrate-home-path';
    const storageKey = `${namespace}-preferences`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        expiry: null,
        value: { app: { defaultHomePath: '/automation/overview' } },
      }),
    );

    await preferenceManager.initPreferences({
      namespace,
      overrides: { app: { defaultHomePath: '/dashboard/overview' } },
    });

    expect(preferenceManager.getPreferences().app.defaultHomePath).toBe(
      '/dashboard/overview',
    );
  });

  it('initializes custom preferences extension with default values', async () => {
    const extension = {
      fields: [
        {
          component: 'switch',
          defaultValue: true,
          key: 'enableWorkbench',
          label: 'Enable Workbench',
        },
        {
          component: 'select',
          defaultValue: 'single',
          key: 'tenantMode',
          label: 'Tenant Mode',
          options: [
            { label: 'Single Tenant', value: 'single' },
            { label: 'Multi Tenant', value: 'multi' },
          ],
        },
      ],
      tabLabel: 'Extensions',
      title: 'Business Preferences',
    } as const;

    await preferenceManager.initPreferences({
      extension,
      namespace: 'custom-defaults',
    });

    expect(preferenceManager.getPreferencesExtension()).toEqual(extension);
    expect(preferenceManager.getCustomPreferences()).toEqual({
      enableWorkbench: true,
      tenantMode: 'single',
    });
  });

  it('does not expose mutable custom preference baselines or extension schema', async () => {
    const extension = {
      fields: [
        {
          component: 'number',
          componentProps: {
            max: 10,
            min: 2,
            step: 2,
          },
          defaultValue: 4,
          key: 'pageSize',
          label: 'Page Size',
        },
      ],
      tabLabel: 'Extensions',
      title: 'Business Preferences',
    } as const;

    await preferenceManager.initPreferences({
      extension,
      namespace: 'custom-readonly',
    });

    const initialCustomPreferences =
      preferenceManager.getInitialCustomPreferences<{
        pageSize: number;
      }>() as { pageSize: number };
    const preferencesExtension = preferenceManager.getPreferencesExtension<{
      pageSize: number;
    }>() as unknown as {
      fields: Array<{ componentProps?: { max?: number }; label: string }>;
    };
    const [firstField] = preferencesExtension.fields;

    initialCustomPreferences.pageSize = 8;
    expect(firstField).toBeDefined();
    expect(firstField?.componentProps).toBeDefined();

    if (!firstField || !firstField.componentProps) {
      return;
    }

    firstField.label = 'Modified';
    firstField.componentProps.max = 20;

    expect(preferenceManager.getInitialCustomPreferences()).toEqual({
      pageSize: 4,
    });
    expect(preferenceManager.getPreferencesExtension()).toEqual(extension);
  });

  it('updates and resets custom preferences correctly', async () => {
    await preferenceManager.initPreferences({
      extension: {
        fields: [
          {
            component: 'number',
            defaultValue: 20,
            key: 'pageSize',
            label: 'Page Size',
          },
          {
            component: 'input',
            defaultValue: 'Daily Report',
            key: 'reportTitle',
            label: 'Report Title',
          },
        ],
        tabLabel: 'Extensions',
      },
      namespace: 'custom-reset',
    });

    preferenceManager.updateCustomPreferences({
      pageSize: 50,
      reportTitle: 'Monthly Report',
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 50,
      reportTitle: 'Monthly Report',
    });

    await preferenceManager.resetPreferences();

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 20,
      reportTitle: 'Daily Report',
    });
  });

  it('ignores invalid custom preferences updates', async () => {
    await preferenceManager.initPreferences({
      extension: {
        fields: [
          {
            component: 'switch',
            defaultValue: true,
            key: 'enableWorkbench',
            label: 'Enable Workbench',
          },
          {
            component: 'select',
            defaultValue: 'single',
            key: 'tenantMode',
            label: 'Tenant Mode',
            options: [
              { label: 'Single Tenant', value: 'single' },
              { label: 'Multi Tenant', value: 'multi' },
            ],
          },
        ],
        tabLabel: 'Extensions',
      },
      namespace: 'custom-invalid',
    });

    const originalCustomPreferences = preferenceManager.getCustomPreferences();

    preferenceManager.updateCustomPreferences({
      enableWorkbench: 'true' as unknown as boolean,
      tenantMode: 'unknown',
      unknownField: 'value',
    } as any);

    expect(preferenceManager.getCustomPreferences()).toEqual(
      originalCustomPreferences,
    );
  });

  it('enforces custom number field min max and step constraints', async () => {
    await preferenceManager.initPreferences({
      extension: {
        fields: [
          {
            component: 'number',
            componentProps: {
              max: 10,
              min: 2,
              step: 2,
            },
            defaultValue: 4,
            key: 'pageSize',
            label: 'Page Size',
          },
        ],
        tabLabel: 'Extensions',
      },
      namespace: 'custom-number-constraints',
    });

    preferenceManager.updateCustomPreferences({
      pageSize: 8,
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 8,
    });

    preferenceManager.updateCustomPreferences({
      pageSize: 1,
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 8,
    });

    preferenceManager.updateCustomPreferences({
      pageSize: 12,
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 8,
    });

    preferenceManager.updateCustomPreferences({
      pageSize: 5,
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 8,
    });
  });

  it('filters cached custom number values that violate field constraints', async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key.endsWith('cache-preferences-custom')) {
        return JSON.stringify({
          value: {
            pageSize: 5,
          },
        });
      }

      return null;
    });

    await preferenceManager.initPreferences({
      extension: {
        fields: [
          {
            component: 'number',
            componentProps: {
              max: 10,
              min: 2,
              step: 2,
            },
            defaultValue: 4,
            key: 'pageSize',
            label: 'Page Size',
          },
        ],
        tabLabel: 'Extensions',
      },
      namespace: 'custom-number-cache',
    });

    expect(preferenceManager.getCustomPreferences()).toEqual({
      pageSize: 4,
    });
  });

  it('updates documentElement style --font-family when custom fontFamily preference changes', async () => {
    await preferenceManager.initPreferences({
      extension: {
        fields: [
          {
            component: 'select',
            defaultValue: 'inter',
            key: 'fontFamily',
            label: 'Font Family',
            options: [
              { label: 'Inter', value: 'inter' },
              { label: 'Roboto', value: 'roboto' },
              { label: 'System UI', value: 'system-ui' },
            ],
          },
        ],
        tabLabel: 'Typography',
      },
      namespace: 'font-preference-test',
    });

    expect(
      document.documentElement.style.getPropertyValue('--font-family'),
    ).toMatch(/^'Inter'/);

    preferenceManager.updateCustomPreferences({
      fontFamily: 'roboto',
    });

    expect(
      document.documentElement.style.getPropertyValue('--font-family'),
    ).toMatch(/^'Roboto'/);

    preferenceManager.updateCustomPreferences({
      fontFamily: 'system-ui',
    });

    expect(
      document.documentElement.style.getPropertyValue('--font-family'),
    ).toMatch(/^system-ui/);
  });
});

describe('isDarkTheme', () => {
  it('should return true for dark theme', () => {
    expect(isDarkTheme('dark')).toBe(true);
  });

  it('should return false for light theme', () => {
    expect(isDarkTheme('light')).toBe(false);
  });

  it('should return system preference for auto theme', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(), // Deprecated
      dispatchEvent: vi.fn(),
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(), // Deprecated
    }));

    expect(isDarkTheme('auto')).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-color-scheme: dark)',
    );
  });
});

describe('updateCSSVariables — built-in theme chart palette & zero-mutation', () => {
  it('does not mutate the input preferences object when resolving a built-in theme', () => {
    const input = structuredClone(defaultPreferences);
    input.theme.builtinType = 'violet';
    input.theme.colorPrimary = 'hsl(0 0% 98%)';

    const snapshotBefore = structuredClone(input);
    updateCSSVariables(input);

    expect(input).toEqual(snapshotBefore);
  });

  it('synchronizes --chart-1 through --chart-5 when switching chromatic built-in themes', () => {
    const rootStyle = document.documentElement.style;

    preferenceManagerUpdateTheme('violet', 'dark');
    const violetCharts = [1, 2, 3, 4, 5].map((i) =>
      rootStyle.getPropertyValue(`--chart-${i}`).trim(),
    );

    expect(violetCharts.every((val) => val.length > 0)).toBe(true);
    expect(new Set(violetCharts).size).toBe(5);
    expect(violetCharts[0]).toBe(
      rootStyle.getPropertyValue('--primary').trim(),
    );

    preferenceManagerUpdateTheme('green', 'dark');
    const greenCharts = [1, 2, 3, 4, 5].map((i) =>
      rootStyle.getPropertyValue(`--chart-${i}`).trim(),
    );

    expect(greenCharts.every((val) => val.length > 0)).toBe(true);
    expect(new Set(greenCharts).size).toBe(5);
    expect(greenCharts[0]).not.toBe(violetCharts[0]);
    expect(greenCharts[0]).toBe(rootStyle.getPropertyValue('--primary').trim());
  });

  it('generates 5 distinct high-contrast --chart-1..5 steps for monochrome themes (neutral, zinc, slate, gray) in both light and dark modes', () => {
    const rootStyle = document.documentElement.style;

    for (const builtinType of ['neutral', 'zinc', 'slate', 'gray'] as const) {
      for (const mode of ['dark', 'light'] as const) {
        preferenceManagerUpdateTheme(builtinType, mode);
        const charts = [1, 2, 3, 4, 5].map((i) =>
          rootStyle.getPropertyValue(`--chart-${i}`).trim(),
        );
        expect(charts.every((val) => val.length > 0)).toBe(true);
        expect(new Set(charts).size).toBe(5);
      }
    }
  });
});

function preferenceManagerUpdateTheme(
  builtinType: typeof defaultPreferences.theme.builtinType,
  mode: 'dark' | 'light',
) {
  const pref = structuredClone(defaultPreferences);
  pref.theme.builtinType = builtinType;
  pref.theme.mode = mode;
  updateCSSVariables(pref);
}
