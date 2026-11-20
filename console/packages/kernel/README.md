# @operon/kernel

Typed boundary between `apps/shell` (`KERNEL_INJECTION_KEY`) and micro-apps (`useKernel()`, `createMockKernel()`, `KernelApiError`). Micro-apps consume auth, HTTP clients, and host events exclusively through `src/types.ts` without importing shell internals.

See [Architecture](../../docs/ARCHITECTURE.md).
