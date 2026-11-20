import type { SupabaseSchema } from '@operon/constants';
import type { KernelRequestOptions } from '@operon/kernel';

import { KernelApiError } from '@operon/kernel';
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

export interface SupabaseRequestOptions extends KernelRequestOptions {
  _isRetry?: boolean;
  _retryToken?: string;
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
  const error = new KernelApiError(message, status) as SupabaseAuthError;
  error.isAuthError = true;
  error.status = status;
  return error;
}

/**
 * Safe check for authenticated cloud session.
 * In a Vue runtime with Pinia initialized, returns true if an accessToken is present.
 * If called in an environment without active Pinia (such as unit tests), safely falls back to true.
 */
export function hasCloudAuth(): boolean {
  try {
    const accessStore = useAccessStore();
    return Boolean(accessStore.accessToken);
  } catch {
    return true;
  }
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

async function resolveSupabaseAuthToken(
  accessStore: ReturnType<typeof useAccessStore>,
  options: SupabaseRequestOptions,
): Promise<null | string | undefined> {
  const token = options._retryToken ?? accessStore.accessToken;
  if (!options.skipAuth && token && isJwtTokenExpired(token)) {
    const refreshedToken = await tryRefreshSupabaseToken();
    if (refreshedToken) {
      return refreshedToken;
    }
    await handleSupabaseUnauthorized();
    throw createAuthError('JWT expired', 401);
  }
  return token;
}

function buildSupabaseRequestHeaders(
  anonKey: string,
  options: SupabaseRequestOptions,
  token: null | string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: anonKey,
    'Content-Type': 'application/json',
    ...buildSupabaseProfileHeaders(options.schema, options.method),
    ...(options.headers as Record<string, string>),
  };

  if (options.preferRepresentation) {
    headers.Prefer = 'return=representation';
  }

  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function recordNetworkBreadcrumb(
  startTime: number,
  method: string,
  status: number,
  url: string,
): void {
  const durationMs = startTime
    ? Math.round(performance.now() - startTime)
    : undefined;
  addNetworkBreadcrumb({ durationMs, method, status, url });
}

function extractSupabaseErrorMessage(
  errorJson: Record<string, any>,
  fallback: string,
): string {
  return (
    errorJson.message ||
    errorJson.msg ||
    errorJson.error_description ||
    fallback
  );
}

async function handleSupabaseErrorResponse<T>(
  response: Response,
  path: string,
  options: SupabaseRequestOptions,
  token: null | string | undefined,
  accessStore: ReturnType<typeof useAccessStore>,
): Promise<T> {
  const errorJson = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >;
  const method = options.method || 'GET';

  if (!options.skipAuth && isUnauthorizedResponse(response.status, errorJson)) {
    if (!options._isRetry) {
      const latestToken = accessStore.accessToken;
      const refreshedToken =
        latestToken && latestToken !== token && !isJwtTokenExpired(latestToken)
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

    if (token) {
      await handleSupabaseUnauthorized();
    }
    throw createAuthError(
      extractSupabaseErrorMessage(errorJson, 'JWT expired'),
      response.status,
    );
  }

  const apiError = new KernelApiError(
    extractSupabaseErrorMessage(
      errorJson,
      $t('authentication.supabaseRequestFailed', { status: response.status }),
    ),
    response.status,
  );
  if (!options.suppressErrorCapture) {
    captureError(apiError, {
      errorCode: errorJson.code || errorJson.error_code,
      errorDetails: errorJson.details || errorJson.hint,
      method,
      path,
      phase: 'supabase_rest',
      schema: options.schema || 'public',
      status: response.status,
    });
  }
  throw apiError;
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
  const token = await resolveSupabaseAuthToken(accessStore, options);

  const url = path.startsWith('http') ? path : `${supabaseUrl}${path}`;
  const {
    _isRetry: _,
    _retryToken: __,
    preferRepresentation: ___,
    schema,
    skipAuth: ____,
    suppressErrorCapture,
    ...fetchInit
  } = options;
  const method = fetchInit.method || 'GET';
  const headers = buildSupabaseRequestHeaders(anonKey, options, token);

  let response: Response;
  const startTime = typeof performance === 'undefined' ? 0 : performance.now();
  try {
    response = await fetch(url, { ...fetchInit, headers });
    recordNetworkBreadcrumb(startTime, method, response.status, url);
  } catch (error) {
    recordNetworkBreadcrumb(startTime, method, 0, url);
    if (!suppressErrorCapture) {
      captureError(error, {
        method,
        path,
        phase: 'supabase_network',
        schema: schema || 'public',
      });
    }
    throw error;
  }

  if (!response.ok) {
    return handleSupabaseErrorResponse<T>(
      response,
      path,
      options,
      token,
      accessStore,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
