import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from 'vue';

import { describe, expect, it } from 'vitest';

import {
  $t,
  loadLocaleMessages,
  registerLocaleMessages,
  resetRegisteredLocaleMessages,
  setupI18n,
} from '../src';

// Resolve scripts/check-i18n.mjs from packages/locales/__tests__/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkI18nPath = path.resolve(
  __dirname,
  '../../../scripts/check-i18n.mjs',
);

describe('official i18n Tooling & Integrity Test Suite', () => {
  it('validates 100% parity between en-US and vi-VN dictionaries', async () => {
    const { auditI18n } = await import(checkI18nPath);
    const result = auditI18n({ silent: true });

    expect(result.missingInVi, 'Keys missing in vi-VN').toEqual([]);
    expect(result.missingInEn, 'Keys missing in en-US').toEqual([]);
  });

  it('ensures all $t(...) and title keys in source code are defined in locale files', async () => {
    const { auditI18n } = await import(checkI18nPath);
    const result = auditI18n({ silent: true });

    expect(
      result.missingUsedKeys,
      'Referenced $t(...) keys missing from translation files',
    ).toEqual([]);
    expect(result.crossScopeLeaks, 'Cross-app locale scope violations').toEqual(
      [],
    );
  });

  it('guarantees no raw {{ }} interpolation syntax in locale values (avoids vue-i18n render crash)', async () => {
    const { auditI18n } = await import(checkI18nPath);
    const result = auditI18n({ silent: true });

    expect(
      result.interpolationLeaks,
      'Raw {{ }} interpolation detected in locale messages',
    ).toEqual([]);
  });

  it('guarantees no hardcoded Vietnamese strings leak into workstation code', async () => {
    const { auditI18n } = await import(checkI18nPath);
    const result = auditI18n({ silent: true });

    expect(
      result.hardcodedVnLeaks,
      'Hardcoded Vietnamese strings found in codebase',
    ).toEqual([]);
  });

  it('passes comprehensive i18n health check with active dictionaries', async () => {
    const { auditI18n } = await import(checkI18nPath);
    const result = auditI18n({ silent: true });

    expect(result.hasError).toBe(false);
    expect(result.enKeysCount).toBeGreaterThan(1200);
    expect(result.viKeysCount).toBeGreaterThan(1200);
    expect(result.totalReferencedCount).toBeGreaterThan(250);
  });

  it('lazy-loads micro-app dictionaries and preserves them across runtime language switches', async () => {
    resetRegisteredLocaleMessages();
    const app = createApp({ render: () => null });
    await setupI18n(app, {
      defaultLocale: 'en-US',
      loadMessages: async (lang) => ({
        page: {
          shellTitle: lang === 'vi-VN' ? 'Bảng điều khiển' : 'Dashboard',
        },
      }),
    });

    await registerLocaleMessages('playground', async (lang) => ({
      playground: {
        greeting: lang === 'vi-VN' ? 'Xin chào Playground' : 'Hello Playground',
      },
    }));

    expect($t('page.shellTitle')).toBe('Dashboard');
    expect($t('playground.greeting')).toBe('Hello Playground');

    // Switch language at runtime — both Shell and lazy-registered micro-app must reload cleanly
    await loadLocaleMessages('vi-VN');
    expect($t('page.shellTitle')).toBe('Bảng điều khiển');
    expect($t('playground.greeting')).toBe('Xin chào Playground');

    resetRegisteredLocaleMessages();
  });
});
