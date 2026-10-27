import type { BuiltinThemePreset } from './constants';
import type { Preferences } from './types';

import { generatorColorVariables } from '@operon-core/shared/color';
import { updateCSSVariables as executeUpdateCSSVariables } from '@operon-core/shared/utils';

import { BUILT_IN_THEME_PRESETS } from './constants';

const MONOCHROME_DARK_LIGHTNESS_RAMP = [90, 72, 55, 40, 28] as const;
const MONOCHROME_LIGHT_LIGHTNESS_RAMP = [18, 34, 50, 66, 80] as const;
const CHROMATIC_CHART_SOURCE_VARS = [
  '--primary-500',
  '--primary-400',
  '--primary-600',
  '--primary-300',
  '--primary-700',
] as const;

/**
 * Update theme and other CSS variables
 * @param preferences - Current preferences object whose theme values configure the document.
 */
function updateCSSVariables(preferences: Preferences) {
  // Update CSS variables when color variables change
  const root = document.documentElement;
  if (!root) {
    return;
  }

  const theme = preferences?.theme ?? {};

  const { builtinType, mode, radius } = theme;
  const isDark = isDarkTheme(mode);

  // Toggle dark class on html element
  if (Reflect.has(theme, 'mode')) {
    root.classList.toggle('dark', isDark);
  }

  // Set data-theme on html element
  if (Reflect.has(theme, 'builtinType')) {
    const rootTheme = root.dataset.theme;
    if (rootTheme !== builtinType) {
      root.dataset.theme = builtinType;
    }
  }

  // Retrieve current built-in theme preset
  const currentBuiltType = [...BUILT_IN_THEME_PRESETS].find(
    (item) => item.type === builtinType,
  );

  let builtinTypeColorPrimary: string | undefined = '';

  if (currentBuiltType) {
    // Resolve primary color for current theme mode
    const color = isDark
      ? currentBuiltType.darkPrimaryColor || currentBuiltType.primaryColor
      : currentBuiltType.primaryColor;
    builtinTypeColorPrimary = color || currentBuiltType.color;
  }

  const resolvedColorPrimary =
    builtinType && builtinType !== 'custom' && builtinTypeColorPrimary
      ? builtinTypeColorPrimary
      : theme.colorPrimary;

  // Skip updating if neither built-in nor custom theme color is defined
  if (
    builtinTypeColorPrimary ||
    Reflect.has(theme, 'builtinType') ||
    Reflect.has(theme, 'mode') ||
    Reflect.has(theme, 'colorPrimary') ||
    Reflect.has(theme, 'colorDestructive') ||
    Reflect.has(theme, 'colorSuccess') ||
    Reflect.has(theme, 'colorWarning')
  ) {
    updateMainColorVariables(
      preferences,
      resolvedColorPrimary,
      currentBuiltType,
      isDark,
    );
  }

  // Update border radius
  if (Reflect.has(theme, 'radius')) {
    document.documentElement.style.setProperty('--radius', `${radius}rem`);
  }

  // Update font sizes
  if (Reflect.has(theme, 'fontSize')) {
    const fontSize = theme.fontSize;
    document.documentElement.style.setProperty(
      '--font-size-base',
      `${fontSize}px`,
    );
    document.documentElement.style.setProperty(
      '--menu-font-size',
      `calc(${fontSize}px * 0.875)`,
    );
  }
}

/**
 * Update main color and chart CSS variables without mutating the preference input
 * @param preference - Current preferences object whose color values are converted to HSL CSS variables.
 * @param resolvedColorPrimary - Resolved primary color for the active built-in or custom theme.
 * @param currentBuiltType - Active built-in theme preset metadata.
 * @param isDark - Whether the active theme mode resolves to dark.
 */
function updateMainColorVariables(
  preference: Preferences,
  resolvedColorPrimary?: string,
  currentBuiltType?: BuiltinThemePreset,
  isDark = false,
) {
  if (!preference.theme) {
    return;
  }
  const { colorDestructive, colorPrimary, colorSuccess, colorWarning } =
    preference.theme;
  const effectivePrimary = resolvedColorPrimary || colorPrimary;

  const colorVariables = generatorColorVariables([
    { color: effectivePrimary, name: 'primary' },
    { alias: 'warning', color: colorWarning, name: 'yellow' },
    { alias: 'success', color: colorSuccess, name: 'green' },
    { alias: 'destructive', color: colorDestructive, name: 'red' },
  ]);

  // CSS variable mapping targets
  const colorMappings = {
    '--green-500': '--success',
    '--primary-500': '--primary',
    '--red-500': '--destructive',
    '--yellow-500': '--warning',
  };

  // Synchronize and apply color variables
  Object.entries(colorMappings).forEach(([sourceVar, targetVar]) => {
    const colorValue = colorVariables[sourceVar];
    if (colorValue) {
      document.documentElement.style.setProperty(targetVar, colorValue);
    }
  });

  // Synchronize --chart-1..5 with the active built-in or custom theme
  const isMonochromePreset = Boolean(
    currentBuiltType &&
    (currentBuiltType.darkPrimaryColor || currentBuiltType.primaryColor),
  );

  if (isMonochromePreset && currentBuiltType) {
    const match = /hsl\(\s*([\d.]+)\s+([\d.]+)%/i.exec(currentBuiltType.color);
    const hue = match?.[1] ?? '0';
    const saturation = match?.[2] ?? '0';
    const lightnessSteps = isDark
      ? MONOCHROME_DARK_LIGHTNESS_RAMP
      : MONOCHROME_LIGHT_LIGHTNESS_RAMP;

    lightnessSteps.forEach((lightness, idx) => {
      const chartVar = `--chart-${idx + 1}`;
      const chartValue = `${hue} ${saturation}% ${lightness}%`;
      colorVariables[chartVar] = chartValue;
      document.documentElement.style.setProperty(chartVar, chartValue);
    });
  } else {
    CHROMATIC_CHART_SOURCE_VARS.forEach((sourceVar, idx) => {
      const chartVar = `--chart-${idx + 1}`;
      const chartValue = colorVariables[sourceVar];
      if (chartValue) {
        colorVariables[chartVar] = chartValue;
        document.documentElement.style.setProperty(chartVar, chartValue);
      }
    });
  }

  executeUpdateCSSVariables(colorVariables);
}

function isDarkTheme(theme: string) {
  let dark = theme === 'dark';
  if (theme === 'auto') {
    dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return dark;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  inter:
    "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  roboto:
    "'Roboto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  'system-ui':
    "system-ui, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

/**
 * Update font-family CSS variable on document root
 * @param fontKey - Identifier of the font family ('inter', 'roboto', 'system-ui')
 */
function updateFontFamilyVariable(fontKey?: string) {
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }
  const resolvedFont =
    (fontKey && (FONT_FAMILY_MAP[fontKey] || fontKey)) ||
    FONT_FAMILY_MAP.inter ||
    'sans-serif';
  document.documentElement.style.setProperty('--font-family', resolvedFont);
}

export {
  FONT_FAMILY_MAP,
  isDarkTheme,
  updateCSSVariables,
  updateFontFamilyVariable,
};
