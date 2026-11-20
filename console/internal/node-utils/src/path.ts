import { posix } from 'node:path';

/**
 * Convert given file path to POSIX style.
 * @param {string} pathname - Original file path.
 */
function toPosixPath(pathname: string) {
  return pathname.split(`\\`).join(posix.sep);
}

export { toPosixPath };
