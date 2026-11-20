import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as desktopAdapter from '#/adapter/desktop';

import { loginWithGitHub } from '../auth';

vi.mock('#/adapter/desktop', () => ({
  isTauriEnvironment: vi.fn(),
  initDesktopAuthHandling: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

vi.mock('../supabase-client', () => ({
  getSupabaseConfig: () => ({
    supabaseUrl: 'https://test-supabase.operon.com',
    anonKey: 'test-anon-key',
  }),
  isJwtTokenExpired: () => false,
  tryRefreshSupabaseToken: vi.fn(),
}));

vi.mock('../access', () => ({
  getEffectiveAccess: vi.fn().mockResolvedValue({ permissions: [] }),
}));

describe('auth api - github oauth desktop risk mitigation', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      origin: 'http://localhost:5320',
      href: 'http://localhost:5320/auth/login',
    } as any;
  });

  it('standard web: navigates current window to Supabase authorize endpoint with web callback', async () => {
    vi.mocked(desktopAdapter.isTauriEnvironment).mockReturnValue(false);

    await loginWithGitHub();

    expect(window.location.href).toContain(
      'https://test-supabase.operon.com/auth/v1/authorize?provider=github&redirect_to=',
    );
    expect(window.location.href).toContain(
      encodeURIComponent('http://localhost:5320/auth/callback'),
    );
  });

  it('tauri desktop: opens system browser via plugin-opener and NEVER navigates current webview', async () => {
    vi.mocked(desktopAdapter.isTauriEnvironment).mockReturnValue(true);
    const { openUrl } = await import('@tauri-apps/plugin-opener');

    const initialHref = window.location.href;
    await loginWithGitHub();

    // The main window href MUST remain unchanged to prevent losing the frameless titlebar
    expect(window.location.href).toBe(initialHref);

    // Instead, system browser must be opened with web gateway callback containing target=desktop
    expect(openUrl).toHaveBeenCalledTimes(1);
    const calledUrl = vi.mocked(openUrl).mock.calls[0]?.[0];
    expect(calledUrl).toContain(
      'https://test-supabase.operon.com/auth/v1/authorize?provider=github&redirect_to=',
    );
    expect(calledUrl).toContain('target%3Ddesktop');
  });
});
