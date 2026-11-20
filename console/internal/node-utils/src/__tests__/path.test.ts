// pathUtils.test.ts

import { describe, expect, it } from 'vitest';

import { toPosixPath } from '../path';

describe('toPosixPath', () => {
  // Test Windows-style path to POSIX-style path conversion
  it('converts Windows-style paths to POSIX paths', () => {
    const windowsPath = String.raw`C:\Users\Example\file.txt`;
    const expectedPosixPath = 'C:/Users/Example/file.txt';
    expect(toPosixPath(windowsPath)).toBe(expectedPosixPath);
  });

  // Confirm POSIX-style path remains unchanged
  it('leaves POSIX-style paths unchanged', () => {
    const posixPath = '/home/user/file.txt';
    expect(toPosixPath(posixPath)).toBe(posixPath);
  });

  // Test path with multiple separators
  it('converts paths with mixed separators', () => {
    const mixedPath = String.raw`C:/Users\Example\file.txt`;
    const expectedPosixPath = 'C:/Users/Example/file.txt';
    expect(toPosixPath(mixedPath)).toBe(expectedPosixPath);
  });

  // Test empty string
  it('handles empty strings', () => {
    const emptyPath = '';
    expect(toPosixPath(emptyPath)).toBe('');
  });

  // Test path containing only separators
  it('handles path with only separators', () => {
    const separatorsPath = '\\\\\\';
    const expectedPosixPath = '///';
    expect(toPosixPath(separatorsPath)).toBe(expectedPosixPath);
  });

  // Test path without separators
  it('handles path without separators', () => {
    const noSeparatorPath = 'file.txt';
    expect(toPosixPath(noSeparatorPath)).toBe('file.txt');
  });

  // Test path ending with separator
  it('handles path ending with a separator', () => {
    const endingSeparatorPath = 'C:\\Users\\Example\\';
    const expectedPosixPath = 'C:/Users/Example/';
    expect(toPosixPath(endingSeparatorPath)).toBe(expectedPosixPath);
  });

  // Test path starting with separator
  it('handles path starting with a separator', () => {
    const startingSeparatorPath = String.raw`\Users\Example`;
    const expectedPosixPath = '/Users/Example';
    expect(toPosixPath(startingSeparatorPath)).toBe(expectedPosixPath);
  });

  // Test path with invalid characters
  it('handles path with invalid characters', () => {
    const invalidCharsPath = String.raw`C:\Us*?ers\Ex<ample>|file.txt`;
    const expectedPosixPath = 'C:/Us*?ers/Ex<ample>|file.txt';
    expect(toPosixPath(invalidCharsPath)).toBe(expectedPosixPath);
  });
});
