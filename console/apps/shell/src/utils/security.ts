/**
 * Security and Input Sanitization Utilities for Admin
 * Enforces strict boundaries against SSRF, Open Redirect, and Privilege Escalation.
 */

/**
 * Validates the loopback desktop gateway port.
 * Restricts strictly to unprivileged loopback ports (1024..65535).
 * Defaults to 8765 if undefined/null/empty.
 * Returns null if invalid, privileged (<1024), out of range (>65535), or hostile string (e.g. '@evil.com:443').
 */
export function validateDesktopBridgePort(rawPort?: unknown): null | number {
  if (rawPort === undefined || rawPort === null) {
    return 8765;
  }
  const str = String(rawPort).trim();
  if (str === '') {
    return 8765;
  }
  // Ensure digits only (rejects negative numbers, decimals, hostnames, userinfo characters)
  if (!/^\d+$/.test(str)) {
    return null;
  }
  const num = Number.parseInt(str, 10);
  if (num >= 1024 && num <= 65_535) {
    return num;
  }
  return null;
}

/**
 * Validates and sanitizes a redirect target path.
 * Guarantees that the path is an absolute, local relative pathname on the current host.
 * Strictly blocks protocol-relative (//evil.com), backslash (/\), javascript:, data:, and external URLs.
 */
export function sanitizeRedirectPath(
  rawPath?: unknown,
  fallback = '/',
): string {
  if (typeof rawPath !== 'string') {
    return fallback;
  }

  try {
    let decoded = decodeURIComponent(rawPath).trim();
    if (decoded.startsWith('#')) {
      decoded = decoded.replace(/^#+/, '');
    }

    // Must start with exactly one forward slash, followed by a non-slash, non-backslash character
    if (
      !decoded.startsWith('/') ||
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      decoded.startsWith('\\')
    ) {
      return fallback;
    }

    // Block control characters (0-31, 127) and dangerous protocols
    for (let i = 0; i < decoded.length; i++) {
      const code = decoded.codePointAt(i);
      if (code !== undefined && (code <= 31 || code === 127)) {
        return fallback;
      }
    }

    if (/^(https?:|javascript:|data:|file:|blob:)/i.test(decoded)) {
      return fallback;
    }

    // Prevent redirect loops back to login or authentication endpoints
    if (decoded.startsWith('/auth/login')) {
      return fallback;
    }

    return decoded;
  } catch {
    return fallback;
  }
}

/**
 * Check whether a redirect path is safe for navigation.
 */
export function isSafeRedirectPath(rawPath?: unknown): boolean {
  if (typeof rawPath !== 'string') return false;
  return sanitizeRedirectPath(rawPath, '__INVALID__') !== '__INVALID__';
}

/**
 * Validates new password + confirmation and returns an i18n error key if invalid.
 */
export function validateNewPassword(
  password: string,
  confirmPassword: string,
): null | string {
  if (!password) {
    return 'authentication.newPasswordRequired';
  }
  if (password.length < 6) {
    return 'authentication.passwordMinLength';
  }
  if (password !== confirmPassword) {
    return 'authentication.confirmPasswordTip';
  }
  return null;
}
