/**
 * Capitalize the first letter of a string
 * @param string
 */
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Lowercase the first letter of a string.
 *
 * @param str String to transform
 * @returns String with first letter lowercased
 */
function toLowerCaseFirstLetter(str: string): string {
  if (!str) return str; // Return directly if empty
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Generate camelCase key name
 * @param key
 * @param parentKey
 */
function toCamelCase(key: string, parentKey: string): string {
  if (!parentKey) {
    return key;
  }
  return parentKey + key.charAt(0).toUpperCase() + key.slice(1);
}

function kebabToCamelCase(str: string): string {
  return str
    .split('-')
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
}

export {
  capitalizeFirstLetter,
  kebabToCamelCase,
  toCamelCase,
  toLowerCaseFirstLetter,
};
