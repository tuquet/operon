import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClipboard } from '../use-clipboard';

vi.mock('@operon-core/shadcn-ui', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@operon/locales', () => ({
  $t: (key: string, params?: any) => `${key}:${JSON.stringify(params || {})}`,
}));

describe('useClipboard composable TDD suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('copies text successfully using navigator.clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const { copiedField, copyToClipboard, isCopied } = useClipboard();

    const ok = await copyToClipboard('secret-api-key', 'API Key');
    expect(ok).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('secret-api-key');
    expect(copiedField.value).toBe('API Key');
    expect(isCopied('API Key')).toBe(true);

    // After 2 seconds, copied state should reset
    vi.advanceTimersByTime(2000);
    expect(copiedField.value).toBeNull();
    expect(isCopied('API Key')).toBe(false);
  });

  it('handles clipboard write failure gracefully without throwing', async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const { copyToClipboard } = useClipboard();
    const ok = await copyToClipboard('failed-content', 'Token');

    expect(ok).toBe(false);
  });
});
