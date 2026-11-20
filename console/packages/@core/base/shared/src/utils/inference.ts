import { isFunction, isObject, isString } from '@vue/shared';

/**
 * Check whether value is undefined.
 *
 * @param {unknown} value Value to check.
 * @returns {boolean} Returns true if undefined, false otherwise.
 */
function isUndefined(value?: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check whether value is boolean.
 * @param value
 * @returns Returns true if boolean, false otherwise.
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check whether value is empty.
 *
 * The following values are considered empty:
 * - null
 * - undefined
 * - empty string
 * - empty array (length === 0)
 * - empty Map or Set (size === 0)
 * - empty object (no enumerable properties)
 *
 * @param {T} value Value to check.
 * @returns {boolean} Returns true if empty, false otherwise.
 */
function isEmpty<T = unknown>(value?: T): value is T {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value) || isString(value)) {
    return value.length === 0;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Check whether string is valid HTTP or HTTPS URL.
 *
 * @param {string} url URL string to check.
 * @return {boolean} Returns true if valid HTTP/HTTPS URL, false otherwise.
 */
function isHttpUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  // Test whether URL starts with http:// or https://
  const httpRegex = /^https?:\/\/.*$/;
  return httpRegex.test(url);
}

/**
 * Check whether value is Window object.
 *
 * @param {any} value Value to check.
 * @returns {boolean} Returns true if window, false otherwise.
 */
function isWindow(value: any): value is Window {
  return (
    typeof window !== 'undefined' && value !== null && value === value.window
  );
}

/**
 * Check whether current environment is macOS.
 *
 * Inspects navigator.userAgent string.
 * Returns true if userAgent contains "macintosh" or "mac os x" (case-insensitive).
 *
 * @returns {boolean} Returns true if macOS, false otherwise.
 */
function isMacOs(): boolean {
  const macRegex = /macintosh|mac os x/i;
  return macRegex.test(navigator.userAgent);
}

/**
 * Check whether current environment is Windows OS.
 *
 * Inspects navigator.userAgent string.
 * Returns true if userAgent contains "windows" or "win32" (case-insensitive).
 *
 * @returns {boolean} Returns true if Windows OS, false otherwise.
 */
function isWindowsOs(): boolean {
  const windowsRegex = /windows|win32/i;
  return windowsRegex.test(navigator.userAgent);
}

/**
 * Check whether value is number
 * @param value
 */
function isNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Returns the first value in the provided list that is neither `null` nor `undefined`.
 *
 * This function iterates over the input values and returns the first one that is
 * not strictly equal to `null` or `undefined`. If all values are either `null` or
 * `undefined`, it returns `undefined`.
 *
 * @template T - The type of the input values.
 * @param {...(T | null | undefined)[]} values - A list of values to evaluate.
 * @returns {T | undefined} - The first value that is not `null` or `undefined`, or `undefined` if none are found.
 *
 * @example
 * // Returns 42 because it is the first non-null, non-undefined value.
 * getFirstNonNullOrUndefined(undefined, null, 42, 'hello'); // 42
 *
 * @example
 * // Returns 'hello' because it is the first non-null, non-undefined value.
 * getFirstNonNullOrUndefined(null, undefined, 'hello', 123); // 'hello'
 *
 * @example
 * // Returns undefined because all values are either null or undefined.
 * getFirstNonNullOrUndefined(undefined, null); // undefined
 */
function getFirstNonNullOrUndefined<T>(
  ...values: (null | T | undefined)[]
): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

export {
  getFirstNonNullOrUndefined,
  isBoolean,
  isEmpty,
  isFunction,
  isHttpUrl,
  isMacOs,
  isNumber,
  isObject,
  isString,
  isUndefined,
  isWindow,
  isWindowsOs,
};
