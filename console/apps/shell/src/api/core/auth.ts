import { $t } from '@operon/locales';
import { useAccessStore } from '@operon/stores';

import { isTauriEnvironment } from '#/adapter/desktop';

import { captureError } from '../../utils/bugsink';
import { getEffectiveAccess } from './access';
import {
  getSupabaseConfig,
  isJwtTokenExpired,
  tryRefreshSupabaseToken,
} from './supabase-client';

export namespace AuthApi {
  /** Login API parameters */
  export interface LoginParams {
    captchaToken?: string;
    password?: string;
    username?: string;
  }

  /** Login API response */
  export interface LoginResult {
    accessToken: string;
    refreshToken?: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

interface AuthFetchOptions {
  body?: Record<string, unknown>;
  errorContext: Record<string, unknown>;
  fallbackError: string;
  method?: 'POST' | 'PUT';
  token?: string;
}

async function authFetchJson<T = Record<string, any>>(
  path: string,
  options: AuthFetchOptions,
): Promise<T> {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method ?? 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const resJson = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >;

  if (!response.ok) {
    const errorMsg =
      resJson.msg ||
      resJson.error_description ||
      resJson.message ||
      options.fallbackError;
    const err = new Error(errorMsg);
    captureError(err, {
      ...options.errorContext,
      errorCode: resJson.error_code || resJson.code,
      status: response.status,
    });
    throw err;
  }

  return resJson as T;
}

async function verifyTurnstileToken(captchaToken: string, email: string) {
  if (!captchaToken || import.meta.env.DEV) return;
  try {
    const verifyRes = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    });
    if (verifyRes.ok) {
      const result = (await verifyRes.json().catch(() => ({}))) as any;
      if (result.success === false && result.error?.includes('bot')) {
        throw new Error('Turnstile verification flagged automated access.');
      }
    }
  } catch (error: any) {
    if (error?.message?.includes('flagged automated access')) {
      captureError(error, { action: 'turnstile_verify', email });
      throw error;
    }
    // Non-blocking for edge function network unavailability or Cloudflare challenge
  }
}

/**
 * Login (Supabase GoTrue REST)
 */
export async function login(
  data: AuthApi.LoginParams,
): Promise<AuthApi.LoginResult> {
  const email = (data.username || '').trim();
  const password = data.password || '';
  const captchaToken = data.captchaToken;

  if (captchaToken) {
    await verifyTurnstileToken(captchaToken, email);
  }

  const reqBody: Record<string, unknown> = { email, password };
  if (captchaToken) {
    reqBody.gotrue_meta_security = { captcha_token: captchaToken };
  }

  const resJson = await authFetchJson<{
    access_token: string;
    refresh_token?: string;
  }>('/auth/v1/token?grant_type=password', {
    body: reqBody,
    errorContext: { action: 'login', email },
    fallbackError: $t('authentication.passwordErrorTip'),
  });

  return {
    accessToken: resJson.access_token,
    refreshToken: resJson.refresh_token,
  };
}

/**
 * Refresh accessToken (Supabase GoTrue REST)
 */
export async function refreshToken(): Promise<AuthApi.RefreshTokenResult> {
  const newToken = await tryRefreshSupabaseToken();
  if (!newToken) {
    throw new Error('Session refresh failed');
  }
  return {
    data: newToken,
    status: 200,
  };
}

/**
 * Logout (Supabase GoTrue REST)
 */
export async function logout() {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;

  if (token && !isJwtTokenExpired(token)) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors during logout
    }
  }
}

/**
 * Get user permission codes (Supabase Admin Console RBAC)
 */
export async function getAccessCodes(): Promise<string[]> {
  const access = await getEffectiveAccess();
  return access.permissions;
}

/**
 * Recover password (Supabase GoTrue REST)
 */
export async function resetPassword(email: string): Promise<void> {
  const trimmedEmail = email.trim();
  await authFetchJson('/auth/v1/recover', {
    body: {
      email: trimmedEmail,
      redirect_to: `${window.location.origin}/auth/reset-password`,
    },
    errorContext: { action: 'resetPassword', email: trimmedEmail },
    fallbackError: $t('authentication.resetLinkFailed'),
  });
}

/**
 * Update password (Supabase GoTrue REST)
 */
export async function updatePassword(
  password: string,
  customToken?: string,
): Promise<void> {
  const accessStore = useAccessStore();
  const token = customToken || accessStore.accessToken;

  if (!token) {
    throw new Error('No active session or recovery token found');
  }

  await authFetchJson('/auth/v1/user', {
    body: { password },
    errorContext: { action: 'updatePassword' },
    fallbackError: $t('authentication.passwordResetFailed'),
    method: 'PUT',
    token,
  });
}

/**
 * GitHub OAuth Login (Supabase GoTrue REST)
 * On Desktop (Tauri): Uses Web Bridge pattern (VS Code / Linear / Figma).
 * On Web: redirects via standard window.location.href.
 */
export async function loginWithGitHub(redirectTo?: string): Promise<void> {
  const { supabaseUrl } = getSupabaseConfig();
  const desktop = isTauriEnvironment();
  const defaultDevPort = import.meta.env.VITE_PORT || '5666';
  const baseCallback =
    import.meta.env.VITE_AUTH_CALLBACK_URL ||
    (typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/auth/callback`
      : `http://localhost:${defaultDevPort}/auth/callback`);
  const target =
    redirectTo ||
    (desktop
      ? `${baseCallback}?target=desktop`
      : `${window.location.origin}/auth/callback`);
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(target)}`;

  if (desktop) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authUrl);
    } catch {
      window.open(authUrl, '_blank');
    }
    return;
  }

  window.location.href = authUrl;
}

export const authApi = {
  getAccessCodes,
  login,
  loginWithGitHub,
  logout,
  refreshToken,
  resetPassword,
  updatePassword,
};
