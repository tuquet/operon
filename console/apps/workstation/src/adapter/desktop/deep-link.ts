import { isTauriEnvironment } from './index';

export interface DeepLinkAuthPayload {
  machineName?: string;
  refreshToken?: string;
  state?: string;
  tenantId?: string;
  token: string;
}

/**
 * Parses deep link callback URL in the form:
 * operon://auth/callback?token=...&refresh_token=... (gateway format)
 * OR operon://auth/callback#access_token=...&refresh_token=... (Supabase OAuth format)
 */
export function parseDeepLinkAuthUrl(url: string): DeepLinkAuthPayload | null {
  try {
    if (!url || !url.startsWith('operon://')) return null;

    // Support both query params (?token=...) and hash fragment (#access_token=...) from Supabase OAuth
    let searchPart = '';
    if (url.includes('#')) {
      searchPart = url.split('#')[1] || '';
    } else if (url.includes('?')) {
      searchPart = url.split('?')[1] || '';
    }
    if (!searchPart) return null;

    const params = new URLSearchParams(searchPart);
    const token = params.get('access_token') || params.get('token');
    if (!token) return null;

    return {
      machineName: params.get('machine_name') ?? undefined,
      refreshToken:
        params.get('refresh_token') ?? params.get('refreshToken') ?? undefined,
      state: params.get('state') ?? undefined,
      tenantId: params.get('tenant_id') ?? params.get('tenantId') ?? undefined,
      token,
    };
  } catch {
    return null;
  }
}

/**
 * Initializes deep link listener in Tauri environment.
 * Handles both initial launch and second-instance activations.
 */
export async function setupDeepLinkListener(
  onAuth: (payload: DeepLinkAuthPayload) => void,
): Promise<() => void> {
  if (!isTauriEnvironment()) {
    return () => {};
  }

  const unlistens: (() => void)[] = [];

  try {
    const { listen } = await import('@tauri-apps/api/event');
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

    // 1. Listen for secondary launch forwarded via single-instance
    const unlistenSingle = await listen<string>(
      'deep-link-received',
      (event) => {
        const payload = parseDeepLinkAuthUrl(event.payload);
        if (payload) onAuth(payload);
      },
    );
    unlistens.push(unlistenSingle);

    // 2. Listen via native OS deep link handler
    const unlistenNative = await onOpenUrl((urls) => {
      for (const rawUrl of urls) {
        const payload = parseDeepLinkAuthUrl(rawUrl);
        if (payload) {
          onAuth(payload);
          break;
        }
      }
    });
    if (typeof unlistenNative === 'function') {
      unlistens.push(unlistenNative);
    }
  } catch (error) {
    console.warn('[Desktop DeepLink] Setup failed:', error);
  }

  return () => {
    for (const unlisten of unlistens) {
      try {
        unlisten();
      } catch {
        // Safe disposal
      }
    }
  };
}

/**
 * Automatically attaches deep-link auth listener in desktop environment.
 * When an auth payload is received, commits tokens and routes to dashboard.
 */
export async function initDesktopAuthHandling(): Promise<() => void> {
  if (!isTauriEnvironment()) {
    return () => {};
  }

  return setupDeepLinkListener(async (payload) => {
    try {
      const { useAccessStore, useUserStore } = await import('@operon/stores');
      const { preferences } = await import('@operon/preferences');
      const { toast } = await import('@operon-core/shadcn-ui');
      const { $t } = await import('@operon/locales');
      const { getAccessCodes } = await import('#/api');
      const { useAuthStore } = await import('#/store');
      const { router } = await import('#/router');

      const accessStore = useAccessStore();
      const userStore = useUserStore();
      const authStore = useAuthStore();

      accessStore.setAccessToken(payload.token);
      if (payload.refreshToken) {
        accessStore.setRefreshToken(payload.refreshToken);
      }

      // Fetch user profile and permissions
      const [userInfo, accessCodes] = await Promise.all([
        authStore.fetchUserInfo(),
        getAccessCodes(),
      ]);

      if (userInfo) {
        userStore.setUserInfo(userInfo);
      }
      accessStore.setAccessCodes(accessCodes);

      toast.success($t('authentication.loginSuccessDesc'), {
        description: $t('authentication.githubLoginSuccess'),
        duration: 3000,
      });

      const defaultHome = userInfo?.homePath || preferences.app.defaultHomePath;
      await router.push(defaultHome);
    } catch (error) {
      console.error('[Desktop DeepLink Auth] Error resolving session:', error);
    }
  });
}
