import type { SupabaseSchema } from '@operon/constants';

import { $t } from '@operon/locales';
import { useAccessStore } from '@operon/stores';

import { addNetworkBreadcrumb, captureError } from '../../utils/bugsink';
import { isJwtTokenExpired } from './jwt';
import {
  getSupabaseConfig,
  handleSupabaseUnauthorized,
  isUnauthorizedResponse,
  tryRefreshSupabaseToken,
} from './token-manager';

export * from './jwt';
export type { SupabaseSchema };
export * from './token-manager';
export { SUPABASE_SCHEMA } from '@operon/constants';

export interface SupabaseRequestOptions extends RequestInit {
  _isRetry?: boolean;
  _retryToken?: string;
  preferRepresentation?: boolean;
  schema?: SupabaseSchema;
  skipAuth?: boolean;
  suppressErrorCapture?: boolean;
}

export interface SupabaseAuthError extends Error {
  isAuthError: boolean;
  status?: number;
}

/**
 * Type guard checking if an error was raised by Supabase authentication expiration.
 */
export function isSupabaseAuthError(
  error: unknown,
): error is SupabaseAuthError {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'isAuthError' in error &&
    (error as SupabaseAuthError).isAuthError === true,
  );
}

export function createAuthError(
  message: string,
  status = 401,
): SupabaseAuthError {
  const error = new Error(message) as SupabaseAuthError;
  error.isAuthError = true;
  error.status = status;
  return error;
}

/**
 * Builds PostgREST schema switching headers.
 * Uses Accept-Profile for read operations (GET/HEAD) and Content-Profile for write operations.
 */
export function buildSupabaseProfileHeaders(
  schema?: SupabaseSchema,
  method: string = 'GET',
): Record<string, string> {
  if (!schema || schema === 'public') {
    return {};
  }
  const upper = method.toUpperCase();
  if (upper === 'GET' || upper === 'HEAD') {
    return { 'Accept-Profile': schema };
  }
  return { 'Content-Profile': schema };
}

/**
 * Universal Supabase HTTP Request client adhering to Dependency Inversion (DIP)
 * Centralizes auth headers, proactive/reactive JWT refresh, 401 interception,
 * URL building, error handling, and representation preferences.
 */
export async function supabaseRequest<T = any>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const accessStore = useAccessStore();
  let token = options._retryToken ?? accessStore.accessToken;

  // 1. Proactive JWT expiry check to avoid unnecessary 401 network errors
  if (!options.skipAuth && token && isJwtTokenExpired(token)) {
    const refreshedToken = await tryRefreshSupabaseToken();
    if (refreshedToken) {
      token = refreshedToken;
    } else {
      await handleSupabaseUnauthorized();
      throw createAuthError('JWT expired', 401);
    }
  }

  const url = path.startsWith('http') ? path : `${supabaseUrl}${path}`;

  const {
    _isRetry,
    _retryToken,
    preferRepresentation,
    schema,
    skipAuth,
    suppressErrorCapture,
    ...fetchInit
  } = options;

  const headers: Record<string, string> = {
    apikey: anonKey,
    'Content-Type': 'application/json',
    ...buildSupabaseProfileHeaders(schema, fetchInit.method),
    ...(fetchInit.headers as Record<string, string>),
  };

  if (preferRepresentation) {
    headers.Prefer = 'return=representation';
  }

  if (!skipAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  const startTime = typeof performance === 'undefined' ? 0 : performance.now();
  try {
    response = await fetch(url, {
      ...fetchInit,
      headers,
    });
    const durationMs = startTime
      ? Math.round(performance.now() - startTime)
      : undefined;
    addNetworkBreadcrumb({
      durationMs,
      method: fetchInit.method || 'GET',
      status: response.status,
      url,
    });
  } catch (error) {
    const durationMs = startTime
      ? Math.round(performance.now() - startTime)
      : undefined;
    addNetworkBreadcrumb({
      durationMs,
      method: fetchInit.method || 'GET',
      status: 0,
      url,
    });
    if (!suppressErrorCapture) {
      captureError(error, {
        method: fetchInit.method || 'GET',
        path,
        phase: 'supabase_network',
        schema: schema || 'public',
      });
    }
    throw error;
  }

  if (!response.ok) {
    const errorJson = (await response.json().catch(() => ({}))) as Record<
      string,
      any
    >;

    // 2. Reactive 401 / JWT expired interceptor with single retry after token refresh
    if (!skipAuth && isUnauthorizedResponse(response.status, errorJson)) {
      if (!_isRetry) {
        const latestToken = accessStore.accessToken;
        const refreshedToken =
          latestToken &&
          latestToken !== token &&
          !isJwtTokenExpired(latestToken)
            ? latestToken
            : await tryRefreshSupabaseToken();
        if (refreshedToken) {
          return supabaseRequest<T>(path, {
            ...options,
            _isRetry: true,
            _retryToken: refreshedToken,
          });
        }
      }

      await handleSupabaseUnauthorized();
      throw createAuthError(
        errorJson.message ||
          errorJson.msg ||
          errorJson.error_description ||
          'JWT expired',
        response.status,
      );
    }

    const apiError = new Error(
      errorJson.message ||
        errorJson.msg ||
        errorJson.error_description ||
        $t('authentication.supabaseRequestFailed', { status: response.status }),
    );
    if (!suppressErrorCapture) {
      captureError(apiError, {
        errorCode: errorJson.code || errorJson.error_code,
        errorDetails: errorJson.details || errorJson.hint,
        method: fetchInit.method || 'GET',
        path,
        phase: 'supabase_rest',
        schema: schema || 'public',
        status: response.status,
      });
    }
    throw apiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
