import { useAccessStore } from '@operon/stores';

export type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: null | UnauthorizedHandler = null;
let refreshPromise: null | Promise<null | string> = null;
let unauthorizedPromise: null | Promise<void> = null;

export function setSupabaseUnauthorizedHandler(
  handler: null | UnauthorizedHandler,
): void {
  unauthorizedHandler = handler;
}

export function isUnauthorizedResponse(
  status: number,
  errorJson?: Record<string, any>,
): boolean {
  if (status === 401) {
    return true;
  }
  const code = String(errorJson?.code || errorJson?.error_code || '');
  if (code === 'PGRST301' || code === 'bad_jwt') {
    return true;
  }
  const msg = String(
    errorJson?.message || errorJson?.msg || errorJson?.error_description || '',
  );
  return /jwt expired|invalid jwt|token is expired/i.test(msg);
}

export function getSupabaseConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      '[SupabaseConfig Fast-Fail] Critical environment variables missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file.',
    );
  }

  return { anonKey, supabaseUrl };
}

/**
 * Single-flight Supabase GoTrue refresh token exchange.
 * Prevents concurrent 401 responses from racing and invalidating rotated refresh tokens.
 */
export async function tryRefreshSupabaseToken(): Promise<null | string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const task = (async () => {
    try {
      const accessStore = useAccessStore();
      const currentRefreshToken = accessStore.refreshToken;
      if (!currentRefreshToken) {
        return null;
      }

      const { anonKey, supabaseUrl } = getSupabaseConfig();
      const response = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
          headers: {
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      );

      if (!response.ok) {
        return null;
      }

      const resJson = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      const newAccessToken = resJson?.access_token as string | undefined;
      const newRefreshToken = resJson?.refresh_token as string | undefined;

      if (!newAccessToken) {
        return null;
      }

      accessStore.setAccessToken?.(newAccessToken);
      if (newRefreshToken) {
        accessStore.setRefreshToken?.(newRefreshToken);
      }
      return newAccessToken;
    } catch {
      return null;
    }
  })();

  refreshPromise = task.finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Single-flight handler for unrecoverable 401 / expired session states.
 */
export async function handleSupabaseUnauthorized(): Promise<void> {
  if (unauthorizedPromise) {
    return unauthorizedPromise;
  }

  const task = (async () => {
    const accessStore = useAccessStore();
    accessStore.setAccessToken?.(null);
    accessStore.setRefreshToken?.(null);

    if (unauthorizedHandler) {
      await unauthorizedHandler();
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/auth/login')
    ) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const query =
        currentPath && currentPath !== '/'
          ? `?redirect=${encodeURIComponent(currentPath)}`
          : '';
      window.location.replace(`/auth/login${query}`);
    }
  })();

  unauthorizedPromise = task.finally(() => {
    unauthorizedPromise = null;
  });

  return unauthorizedPromise;
}
