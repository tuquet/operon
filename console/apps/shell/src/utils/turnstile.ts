declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode: string) => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          theme?: 'auto' | 'dark' | 'light';
          size?: 'compact' | 'invisible' | 'normal';
          mode?: 'invisible' | 'managed' | 'non-interactive';
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      execute: (container?: HTMLElement | string, params?: any) => void;
    };
  }
}

let scriptLoadingPromise: null | Promise<void> = null;

export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '';

/**
 * Dynamically load Cloudflare Turnstile SDK
 */
export function loadTurnstile(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="turnstile/v0/api.js"]',
    );
    if (existing && window.turnstile) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 4000);
    });
    script.addEventListener('error', () => {
      reject(new Error('Failed to load Cloudflare Turnstile'));
    });
    document.head.append(script);
  });

  return scriptLoadingPromise;
}
