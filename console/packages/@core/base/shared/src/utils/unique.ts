/**
 * Deduplicate array of objects by specified field key
 * @param arr Array of objects to deduplicate
 * @param key Field key to deduplicate on
 * @returns Deduplicated array of objects
 */
function uniqueByField<T>(arr: T[], key: keyof T): T[] {
  const seen = new Map<any, T>();
  return arr.filter((item) => {
    const value = item[key];
    return seen.has(value) ? false : (seen.set(value, item), true);
  });
}

export { uniqueByField };
