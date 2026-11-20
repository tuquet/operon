import { describe, expect, it } from 'vitest';

import {
  isSafeRedirectPath,
  sanitizeRedirectPath,
  validateDesktopBridgePort,
} from '#/utils/security';

describe('validateDesktopBridgePort', () => {
  it('should default to 8765 when undefined, null, or empty string', () => {
    expect(validateDesktopBridgePort(undefined)).toBe(8765);
    expect(validateDesktopBridgePort(null)).toBe(8765);
    expect(validateDesktopBridgePort('')).toBe(8765);
    expect(validateDesktopBridgePort('   ')).toBe(8765);
  });

  it('should accept valid unprivileged loopback ports (1024..65535)', () => {
    expect(validateDesktopBridgePort(8765)).toBe(8765);
    expect(validateDesktopBridgePort('8765')).toBe(8765);
    expect(validateDesktopBridgePort(1024)).toBe(1024);
    expect(validateDesktopBridgePort(65_535)).toBe(65_535);
    expect(validateDesktopBridgePort('3000')).toBe(3000);
  });

  it('should reject privileged system ports (<1024) to prevent SSRF', () => {
    expect(validateDesktopBridgePort(80)).toBeNull();
    expect(validateDesktopBridgePort(443)).toBeNull();
    expect(validateDesktopBridgePort(22)).toBeNull();
    expect(validateDesktopBridgePort(0)).toBeNull();
    expect(validateDesktopBridgePort(1023)).toBeNull();
  });

  it('should reject out-of-range ports (>65535)', () => {
    expect(validateDesktopBridgePort(65_536)).toBeNull();
    expect(validateDesktopBridgePort(99_999)).toBeNull();
    expect(validateDesktopBridgePort('70000')).toBeNull();
  });

  it('should reject negative numbers, decimals, and malicious host injections', () => {
    expect(validateDesktopBridgePort(-1)).toBeNull();
    expect(validateDesktopBridgePort('-8765')).toBeNull();
    expect(validateDesktopBridgePort('8765.5')).toBeNull();
    expect(validateDesktopBridgePort('8765@evil.com:443')).toBeNull();
    expect(validateDesktopBridgePort('localhost:8765')).toBeNull();
    expect(validateDesktopBridgePort('abc')).toBeNull();
  });
});

describe('sanitizeRedirectPath & isSafeRedirectPath', () => {
  it('should allow valid absolute local paths', () => {
    expect(sanitizeRedirectPath('/dashboard/analytics')).toBe(
      '/dashboard/analytics',
    );
    expect(sanitizeRedirectPath('/tenants?tab=members')).toBe(
      '/tenants?tab=members',
    );
    expect(sanitizeRedirectPath('/workspace/settings#general')).toBe(
      '/workspace/settings#general',
    );
    expect(isSafeRedirectPath('/dashboard')).toBe(true);
  });

  it('should strip leading hash fragments if valid local path follows', () => {
    expect(sanitizeRedirectPath('#/dashboard/analytics')).toBe(
      '/dashboard/analytics',
    );
    expect(sanitizeRedirectPath('##/tenants')).toBe('/tenants');
  });

  it('should block protocol-relative URLs (//evil.com)', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/');
    expect(sanitizeRedirectPath('//attacker.com/malicious')).toBe('/');
    expect(isSafeRedirectPath('//evil.com')).toBe(false);
  });

  it(
    String.raw`should block backslash tricks (/\evil.com and \evil.com)`,
    () => {
      expect(sanitizeRedirectPath(String.raw`/\evil.com`)).toBe('/');
      expect(sanitizeRedirectPath(String.raw`\evil.com`)).toBe('/');
      expect(isSafeRedirectPath(String.raw`/\evil.com`)).toBe(false);
      expect(isSafeRedirectPath(String.raw`\evil.com`)).toBe(false);
    },
  );

  it('should block dangerous URL protocols (javascript:, data:, file:)', () => {
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/');
    expect(
      sanitizeRedirectPath('data:text/html,<script>alert(1)</script>'),
    ).toBe('/');
    expect(sanitizeRedirectPath('file:///etc/passwd')).toBe('/');
    expect(sanitizeRedirectPath('https://evil.com/phishing')).toBe('/');
    expect(sanitizeRedirectPath('http://127.0.0.1:8765/kill')).toBe('/');
    expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
  });

  it('should prevent redirect loops back to login', () => {
    expect(sanitizeRedirectPath('/auth/login')).toBe('/');
    expect(sanitizeRedirectPath('/auth/login?redirect=/dashboard')).toBe('/');
  });

  it('should use custom fallback when provided', () => {
    expect(sanitizeRedirectPath('//evil.com', '/fallback')).toBe('/fallback');
    expect(sanitizeRedirectPath(undefined, '/fallback')).toBe('/fallback');
  });
});
