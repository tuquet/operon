import type { RouteLocationRaw } from 'vue-router';

import { DEFAULT_HOME_PATH } from '@operon/constants';

import { sanitizeRedirectPath } from '#/utils/security';

const WELCOME_DISMISSED_KEY = 'operon:welcome-dismissed';
const BRIDGE_SEEN_KEY = 'operon:local-bridge-seen';
const WELCOME_REDIRECT_KEY = 'operon:welcome-redirect';

/**
 * Returns true if the user has not dismissed the startup Welcome page.
 */
export function shouldShowWelcomeOnStartup(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  return window.localStorage.getItem(WELCOME_DISMISSED_KEY) !== 'true';
}

/**
 * Persists whether the Welcome page should open automatically on startup.
 */
export function setShowWelcomeOnStartup(show: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  if (show) {
    window.localStorage.removeItem(WELCOME_DISMISSED_KEY);
  } else {
    window.localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
  }
}

/**
 * Returns true once this browser has successfully connected to a local Operon daemon.
 */
export function hasLocalBridgeSeen(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  return window.localStorage.getItem(BRIDGE_SEEN_KEY) === 'true';
}

/**
 * Marks that this browser has connected to a local Operon daemon before.
 */
export function markLocalBridgeSeen(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(BRIDGE_SEEN_KEY, 'true');
}

function normalizeAppRedirect(rawPath: unknown): null | string {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return null;
  }
  const safe = sanitizeRedirectPath(rawPath, '');
  if (!safe || safe === '/welcome' || safe.startsWith('/auth')) {
    return null;
  }
  return safe;
}

/**
 * Saves the intended destination path before redirecting to `/welcome`.
 */
export function saveWelcomeRedirect(rawPath: unknown): null | string {
  const safe = normalizeAppRedirect(rawPath);
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return safe;
  }
  if (safe) {
    window.sessionStorage.setItem(WELCOME_REDIRECT_KEY, safe);
  }
  return safe;
}

/**
 * Returns whether a saved post-welcome redirect path is pending.
 */
export function hasPendingWelcomeRedirect(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }
  return Boolean(
    normalizeAppRedirect(window.sessionStorage.getItem(WELCOME_REDIRECT_KEY)),
  );
}

/**
 * Resolves the safe post-welcome destination from query param, session cache, or default home.
 */
export function resolveWelcomeRedirect(
  queryRedirect?: unknown,
  fallback = DEFAULT_HOME_PATH,
): string {
  const fromQuery = normalizeAppRedirect(queryRedirect);
  if (fromQuery) {
    return fromQuery;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const fromSession = normalizeAppRedirect(
      window.sessionStorage.getItem(WELCOME_REDIRECT_KEY),
    );
    if (fromSession) {
      return fromSession;
    }
  }
  return fallback;
}

/**
 * Clears the cached post-welcome redirect path once navigation completes.
 */
export function clearWelcomeRedirect(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  window.sessionStorage.removeItem(WELCOME_REDIRECT_KEY);
}

/**
 * Builds the `/welcome` route location, preserving `redirect` when targeting a non-home route.
 */
export function buildWelcomeLocation(targetPath?: string): RouteLocationRaw {
  const safe = normalizeAppRedirect(targetPath);
  if (!safe || safe === DEFAULT_HOME_PATH) {
    return { path: '/welcome' };
  }
  return {
    path: '/welcome',
    query: { redirect: safe },
  };
}
