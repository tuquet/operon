import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeWithFeedback, useAsyncAction } from '../use-async-action';

const { mockCaptureError, mockToast } = vi.hoisted(() => ({
  mockCaptureError: vi.fn(),
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@operon-core/shadcn-ui', () => ({
  toast: mockToast,
}));

vi.mock('#/utils/bugsink', () => ({
  captureError: (...args: any[]) => mockCaptureError(...args),
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('useAsyncAction & executeWithFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manages loading state correctly across resolved lifecycle', async () => {
    const { executeAction, loading } = useAsyncAction();
    expect(loading.value).toBe(false);

    let observedLoadingInside = false;
    const task = vi.fn(async () => {
      observedLoadingInside = loading.value;
      return { id: 123 };
    });

    const result = await executeAction(task, {
      success: 'Task finished successfully',
    });

    expect(observedLoadingInside).toBe(true);
    expect(loading.value).toBe(false);
    expect(result).toEqual({ id: 123 });
    expect(mockToast.success).toHaveBeenCalledWith(
      'Task finished successfully',
    );
    expect(mockCaptureError).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('supports dynamic success message function', async () => {
    const { executeAction } = useAsyncAction();
    await executeAction(async () => ({ name: 'Operon Core' }), {
      success: (data) => `Created ${data.name}`,
    });

    expect(mockToast.success).toHaveBeenCalledWith('Created OperonCore');
  });

  it('handles error, reports to Bugsink, and shows error toast', async () => {
    const { executeAction, loading } = useAsyncAction();
    const error = new Error('Network timeout');

    const result = await executeAction(
      async () => {
        throw error;
      },
      {
        errorFallback: 'Failed to execute',
        tracking: { action: 'testAction', view: 'TestView' },
      },
    );

    expect(loading.value).toBe(false);
    expect(result).toBeUndefined();
    expect(mockCaptureError).toHaveBeenCalledWith(error, {
      action: 'testAction',
      view: 'TestView',
    });
    expect(mockToast.error).toHaveBeenCalledWith('Network timeout');
  });

  it('uses errorFallback when error message is missing', async () => {
    const { executeAction } = useAsyncAction();
    await executeAction(
      async () => {
        throw new Error('Non-error test object');
      },
      {
        errorFallback: 'Fallback error message',
      },
    );

    expect(mockToast.error).toHaveBeenCalledWith('Fallback error message');
  });

  it('supports rethrow option', async () => {
    const { executeAction } = useAsyncAction();
    const error = new Error('Fatal DB crash');

    await expect(
      executeAction(
        async () => {
          throw error;
        },
        {
          rethrow: true,
        },
      ),
    ).rejects.toThrow('Fatal DB crash');

    expect(mockToast.error).toHaveBeenCalledWith('Fatal DB crash');
  });

  it('works standalone via executeWithFeedback', async () => {
    const result = await executeWithFeedback(async () => 'hello world', {
      success: 'Greeting received',
    });

    expect(result).toBe('hello world');
    expect(mockToast.success).toHaveBeenCalledWith('Greeting received');
  });
});
