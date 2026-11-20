import type { InjectionKey } from 'vue';

import type { KernelContext } from './types';

import { inject } from 'vue';

import { createMockKernel } from './mock';

export const KERNEL_INJECTION_KEY: InjectionKey<KernelContext> = Symbol(
  'OPERON_KERNEL_CONTEXT',
);

/**
 * Access the active Operon Kernel Context.
 * In a Host Shell, returns the real injected context.
 * In standalone development (Micro-app dev server), falls back gracefully to a mock kernel.
 */
export function useKernel(): KernelContext {
  const kernel = inject(KERNEL_INJECTION_KEY, null);
  if (kernel) {
    return kernel;
  }

  // Graceful fallback for standalone dev mode
  return createMockKernel();
}
