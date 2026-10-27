import type { Ref } from 'vue';

import { ref } from 'vue';

import { toast } from '@operon-core/shadcn-ui';

import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

export interface AsyncActionOptions<T> {
  /** Optional loading message displayed while the promise is pending */
  loading?: string;
  /** Success message or a function that receives the resolved data and returns a message */
  success?: ((data: T) => string) | string;
  /** Fallback error message if error has no message */
  errorFallback?: string;
  /** If false, does not show an error toast (defaults to true) */
  showErrorToast?: boolean;
  /** If true, re-throws the error to the caller after toast and tracking (defaults to false) */
  rethrow?: boolean;
  /** Telemetry context forwarded directly to Bugsink captureError */
  tracking?: {
    action: string;
    view: string;
    [key: string]: any;
  };
}

export interface UseAsyncActionResult {
  /** Reactive loading state */
  isLoading: Ref<boolean>;
  /**
   * @deprecated Use `isLoading` instead.
   */
  loading: Ref<boolean>;
  /** Executes an async task with automatic Sonner toast feedback and Bugsink logging */
  executeAction: <T>(
    task: () => Promise<T>,
    options?: AsyncActionOptions<T>,
  ) => Promise<T | undefined>;
}

/**
 * Pure standalone execution helper for one-off commands.
 */
export async function executeWithFeedback<T>(
  task: () => Promise<T>,
  options?: AsyncActionOptions<T>,
): Promise<T | undefined> {
  let toastId: number | string | undefined;
  if (options?.loading) {
    toastId = toast.loading(options.loading);
  }

  try {
    const result = await task();

    if (toastId !== undefined) {
      toast.dismiss(toastId);
    }

    if (options?.success) {
      const msg =
        typeof options.success === 'function'
          ? options.success(result)
          : options.success;
      toast.success(msg);
    }

    return result;
  } catch (error: any) {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    }

    if (options?.tracking) {
      captureError(error, options.tracking);
    }

    if (options?.showErrorToast !== false) {
      const fallback = options?.errorFallback || $t('common.error');
      const errorMsg = error?.message || fallback;
      toast.error(errorMsg);
    }

    if (options?.rethrow) {
      throw error;
    }

    return undefined;
  }
}

/**
 * Composable providing reactive loading and automated toast/bugsink feedback.
 */
export function useAsyncAction(initialLoading = false): UseAsyncActionResult {
  const isLoading = ref(initialLoading);

  const executeAction = async <T>(
    task: () => Promise<T>,
    options?: AsyncActionOptions<T>,
  ): Promise<T | undefined> => {
    isLoading.value = true;
    try {
      return await executeWithFeedback(task, options);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    executeAction,
    isLoading,
    loading: isLoading,
  };
}
