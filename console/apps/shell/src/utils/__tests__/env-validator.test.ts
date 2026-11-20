import { describe, expect, it } from 'vitest';

import { assertValidEnvironment, validateEnvironment } from '../env-validator';

describe('env-validator (Fast-Fail)', () => {
  it('validates current environment successfully when keys are present', () => {
    const originalUrl = import.meta.env.VITE_SUPABASE_URL;
    const originalKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      (import.meta.env as any).VITE_SUPABASE_URL =
        'https://example.supabase.co';
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY = 'mock-anon-key';
      const result = validateEnvironment();
      expect(result.errors).toEqual([]);
    } finally {
      (import.meta.env as any).VITE_SUPABASE_URL = originalUrl;
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY = originalKey;
    }
  });

  it('fails fast when VITE_SUPABASE_URL is missing', () => {
    const originalUrl = import.meta.env.VITE_SUPABASE_URL;
    try {
      (import.meta.env as any).VITE_SUPABASE_URL = '';
      const result = validateEnvironment();
      expect(result.errors).toContain(
        'VITE_SUPABASE_URL is required but not provided in .env',
      );
      expect(() => assertValidEnvironment()).toThrowError(
        /\[FATAL\] Environment validation failed/,
      );
    } finally {
      (import.meta.env as any).VITE_SUPABASE_URL = originalUrl;
    }
  });

  it('fails fast when VITE_SUPABASE_ANON_KEY is missing', () => {
    const originalKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY = '';
      const result = validateEnvironment();
      expect(result.errors).toContain(
        'VITE_SUPABASE_ANON_KEY is required but not provided in .env',
      );
      expect(() => assertValidEnvironment()).toThrowError(
        /\[FATAL\] Environment validation failed/,
      );
    } finally {
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY = originalKey;
    }
  });

  it('fails fast on malformed URLs', () => {
    const originalUrl = import.meta.env.VITE_SUPABASE_URL;
    try {
      (import.meta.env as any).VITE_SUPABASE_URL = 'invalid-url-domain';
      const result = validateEnvironment();
      expect(result.errors[0]).toContain('must be a valid HTTP/HTTPS URL');
    } finally {
      (import.meta.env as any).VITE_SUPABASE_URL = originalUrl;
    }
  });
});
