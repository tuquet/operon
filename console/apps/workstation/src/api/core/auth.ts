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

/**
 * Login (Supabase GoTrue REST)
 */
export async function login(
  data: AuthApi.LoginParams,
): Promise<AuthApi.LoginResult> {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const email = (data.username || '').trim();
  const password = data.password || '';
  const captchaToken = data.captchaToken;

  // Verify Turnstile with Cloudflare Pages Function if in production (non-blocking)
  if (captchaToken && !import.meta.env.DEV) {
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

  const reqBody: Record<string, any> = { email, password };
  if (captchaToken) {
    reqBody.gotrue_meta_security = { captcha_token: captchaToken };
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify(reqBody),
    },
  );

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      resJson.msg ||
      resJson.error_description ||
      resJson.message ||
      $t('authentication.passwordErrorTip');
    const err = new Error(errorMsg);
    captureError(err, {
      action: 'login',
      email,
      errorCode: resJson.error_code || resJson.code,
      status: response.status,
    });
    throw err;
  }

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
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: email.trim(),
      redirect_to: `${window.location.origin}/auth/reset-password`,
    }),
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      resJson.msg ||
      resJson.error_description ||
      resJson.message ||
      $t('authentication.resetLinkFailed');
    const err = new Error(errorMsg);
    captureError(err, {
      action: 'resetPassword',
      email: email.trim(),
      status: response.status,
    });
    throw err;
  }
}

/**
 * Update password (Supabase GoTrue REST)
 */
export async function updatePassword(
  password: string,
  customToken?: string,
): Promise<void> {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const accessStore = useAccessStore();
  const token = customToken || accessStore.accessToken;

  if (!token) {
    throw new Error('No active session or recovery token found');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      resJson.msg ||
      resJson.error_description ||
      resJson.message ||
      $t('authentication.passwordResetFailed');
    const err = new Error(errorMsg);
    captureError(err, {
      action: 'updatePassword',
      status: response.status,
    });
    throw err;
  }
}

/**
 * GitHub OAuth Login (Supabase GoTrue REST)
 * On Desktop (Tauri): Uses Web Bridge pattern (like VS Code / Linear / Figma).
 * Opens the external system browser pointing to the Web Callback gateway with `target=desktop`.
 * The web gateway then seamlessly hands the token back to the desktop application via `operon://auth/callback`.
 * On Web: redirects via standard window.location.href.
 */
export async function loginWithGitHub(redirectTo?: string): Promise<void> {
  const { supabaseUrl } = getSupabaseConfig();

  if (isTauriEnvironment()) {
    const defaultDevPort = import.meta.env.VITE_PORT || '5666';
    const baseCallback =
      import.meta.env.VITE_AUTH_CALLBACK_URL ||
      (typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/auth/callback`
        : `http://localhost:${defaultDevPort}/auth/callback`);
    const target = redirectTo || `${baseCallback}?target=desktop`;
    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(target)}`;
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authUrl);
    } catch {
      window.open(authUrl, '_blank');
    }
    return;
  }

  const target = redirectTo || `${window.location.origin}/auth/callback`;
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(target)}`;
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
