import { TinyColor } from '@ctrl/tinycolor';

/**
 * Convert color to HSL format.
 *
 * HSL color model includes Hue, Saturation, and Lightness.
 *
 * @param {string} color Input color.
 * @returns {string} HSL color string.
 */
function convertToHsl(color: string): string {
  const { a, h, l, s } = new TinyColor(color).toHsl();
  const hsl = `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  return a < 1 ? `${hsl} ${a}` : hsl;
}

/**
 * Convert color to HSL CSS variable format.
 *
 * Similar to convertToHsl, but returns space-separated values
 * suitable for CSS variables.
 *
 * @param {string} color Input color.
 * @returns {string} HSL formatted string for CSS variables.
 */
function convertToHslCssVar(color: string): string {
  const { a, h, l, s } = new TinyColor(color).toHsl();
  const hsl = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  return a < 1 ? `${hsl} / ${a}` : hsl;
}

/**
 * Convert color to RGB string
 * TinyColor cannot parse HSL containing 'deg', 'grad', 'rad', or 'turn';
 * e.g. hsl(231deg 98% 65%) parses to rgb(0, 0, 0).
 * Strip these units before conversion.
 * @param str HSL color string
 * @returns RGB string if valid, rgb(0, 0, 0) otherwise
 */
function convertToRgb(str: string): string {
  return new TinyColor(str.replaceAll(/deg|grad|rad|turn/g, '')).toRgbString();
}

/**
 * Check if color is valid
 * @param {string} color Color to validate
 * Returns true if valid, false otherwise
 */
function isValidColor(color?: string) {
  if (!color) {
    return false;
  }
  return new TinyColor(color).isValid;
}

export {
  convertToHsl,
  convertToHslCssVar,
  convertToRgb,
  isValidColor,
  TinyColor,
};
