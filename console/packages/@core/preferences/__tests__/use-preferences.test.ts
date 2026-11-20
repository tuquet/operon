import { beforeEach, describe, expect, it } from 'vitest';

import { preferencesManager } from '../src/preferences';
import { usePreferences } from '../src/use-preferences';

describe('usePreferences - anti-lockout safeguards', () => {
  beforeEach(() => {
    preferencesManager.resetPreferences();
  });

  it('falls back to fixed position when header is disabled but position is set to header', () => {
    const { preferencesButtonPosition } = usePreferences();

    // Set position to header and enable preferences
    preferencesManager.updatePreferences({
      app: {
        enablePreferences: true,
        preferencesButtonPosition: 'header',
      },
      header: {
        enable: true,
        hidden: false,
      },
    });

    expect(preferencesButtonPosition.value).toEqual({
      fixed: false,
      header: true,
      userDropdown: false,
    });

    // Now disable the header: must automatically fallback to fixed: true
    preferencesManager.updatePreferences({
      header: {
        enable: false,
      },
    });

    expect(preferencesButtonPosition.value).toEqual({
      fixed: true,
      header: false,
      userDropdown: false,
    });
  });

  it('falls back to fixed position when header is hidden', () => {
    const { preferencesButtonPosition } = usePreferences();

    preferencesManager.updatePreferences({
      app: {
        enablePreferences: true,
        preferencesButtonPosition: 'header',
      },
      header: {
        enable: true,
        hidden: true,
      },
    });

    expect(preferencesButtonPosition.value).toEqual({
      fixed: true,
      header: false,
      userDropdown: false,
    });
  });

  it('falls back to fixed position when user dropdown is unavailable without a header', () => {
    const { preferencesButtonPosition } = usePreferences();

    preferencesManager.updatePreferences({
      app: {
        enablePreferences: true,
        preferencesButtonPosition: 'user-dropdown',
      },
      header: {
        enable: false,
        hidden: false,
      },
    });

    expect(preferencesButtonPosition.value).toEqual({
      fixed: true,
      header: false,
      userDropdown: false,
    });
  });

  it('returns all false when enablePreferences is false', () => {
    const { preferencesButtonPosition } = usePreferences();

    preferencesManager.updatePreferences({
      app: {
        enablePreferences: false,
        preferencesButtonPosition: 'header',
      },
      header: {
        enable: true,
        hidden: false,
      },
    });

    expect(preferencesButtonPosition.value).toEqual({
      fixed: false,
      header: false,
      userDropdown: false,
    });
  });

  it('migrates legacy sidebar-bottom cached position and header-mixed-nav layout on init', async () => {
    const { PreferenceManager } = await import('../src/preferences');
    const manager = new PreferenceManager();
    (manager as any).loadFromCache = async () => ({
      app: {
        layout: 'header-mixed-nav',
        preferencesButtonPosition: 'sidebar-bottom',
      },
      logo: {
        enable: false,
        fit: 'contain',
        logoMode: 'icon',
        showText: false,
      },
      sidebar: { extraCollapse: true },
      theme: { semiDarkSidebarSub: true },
    });
    await manager.initPreferences({ namespace: 'test-migrate' });

    expect(manager.getPreferences().app.preferencesButtonPosition).toBe('auto');
    expect(manager.getPreferences().app.layout).toBe('sidebar-nav');
    expect('enable' in manager.getPreferences().logo).toBe(false);
    expect('extraCollapse' in manager.getPreferences().sidebar).toBe(false);
    expect('semiDarkSidebarSub' in manager.getPreferences().theme).toBe(false);
  });

  it('does not produce diffPreference when only isMobile is toggled', () => {
    const { diffPreference } = usePreferences();

    // Baseline is identical
    expect(diffPreference.value).toBeUndefined();

    // Toggle runtime isMobile
    preferencesManager.updatePreferences({
      app: { isMobile: true },
    });

    // Should NOT report diffPreference because isMobile is runtime viewport state
    expect(diffPreference.value).toBeUndefined();

    // Change an actual user preference
    preferencesManager.updatePreferences({
      app: { locale: 'vi-VN' },
    });

    // Now it should report the real user preference diff
    expect(diffPreference.value).toEqual({
      app: { locale: 'vi-VN' },
    });
  });

  it('keeps diffPreference undefined when builtinType is neutral default and resets cleanly after change', async () => {
    const { diffPreference } = usePreferences();

    expect(preferencesManager.getPreferences().theme.builtinType).toBe(
      'neutral',
    );
    expect(diffPreference.value).toBeUndefined();

    preferencesManager.updatePreferences({
      theme: { builtinType: 'violet' },
    });

    expect(diffPreference.value).toEqual({
      theme: {
        builtinType: 'violet',
        colorPrimary: 'hsl(245 82% 67%)',
      },
    });

    await preferencesManager.resetPreferences();

    expect(preferencesManager.getPreferences().theme.builtinType).toBe(
      'neutral',
    );
    expect(diffPreference.value).toBeUndefined();
  });
});
