/**
 * JWT Utilities (Single Responsibility: parsing, inspecting, decoding JWT tokens)
 */

/**
 * Safely decodes the JSON payload of a JWT token using standard Web APIs (UTF-8 safe).
 */
export function decodeJwtPayload<T = Record<string, any>>(
  token?: null | string,
): null | T {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0) ?? 0);
    const jsonStr = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Safely checks whether a JWT token has an `exp` claim that has already passed
 * (or will expire within `bufferSeconds`).
 * Returns `false` for non-JWT strings or tokens without a numeric `exp` claim.
 */
export function isJwtTokenExpired(
  token?: null | string,
  bufferSeconds = 10,
): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (typeof payload?.exp !== 'number') {
    return false;
  }
  return payload.exp * 1000 <= Date.now() + bufferSeconds * 1000;
}
