import type { KernelContext } from './types';

import { KernelApiError } from './errors';

/**
 * Creates a mock Kernel Context for standalone micro-app development and testing.
 */
export function createMockKernel(
  overrides?: Partial<KernelContext>,
): KernelContext {
  const defaultDaemonPort = 8765;

  return {
    auth: {
      accessToken: null,
      hasCloudAuth: false,
      userId: 'local-operator',
      tenantId: null,
      roles: ['local_operator'],
      isSuperadmin: false,
      username: 'operator',
      ...overrides?.auth,
    },
    api: {
      daemonPort: defaultDaemonPort,
      supabaseRequest: async <T = unknown>(path: string) => {
        console.warn(
          `[MockKernel] supabaseRequest called on path "${path}" without active cloud auth.`,
        );
        return [] as unknown as T;
      },
      localDaemonFetch: async <T = unknown>(
        endpoint: string,
        options?: RequestInit,
      ) => {
        const url = endpoint.startsWith('http')
          ? endpoint
          : `http://127.0.0.1:${defaultDaemonPort}${endpoint}`;
        const res = await fetch(url, options);
        if (!res.ok) {
          throw new KernelApiError(
            `Local daemon responded with HTTP ${res.status}`,
            res.status,
          );
        }
        return (await res.json()) as T;
      },
      ...overrides?.api,
    },
    events: {
      notify: (type, message) => {
        console.warn(
          `[MockKernel Notification - ${type.toUpperCase()}]: ${message}`,
        );
      },
      openLoginModal: () => {
        console.warn('[MockKernel] openLoginModal requested.');
      },
      navigate: (path) => {
        console.warn(`[MockKernel Navigate]: ${path}`);
      },
      ...overrides?.events,
    },
    notifications: {
      platform: 'web',
      push: async (payload) => {
        console.warn(
          `[MockKernel Push - ${(payload.severity ?? 'info').toUpperCase()}]: ${payload.title}`,
          payload.body ?? '',
        );
      },
      getPermission: async () => 'default',
      requestPermission: async () => 'default',
      ...overrides?.notifications,
    },
    tenant: {
      activeId: 'local-default',
      activeName: 'Local Tenant',
      activeSlug: 'local',
      isLoading: false,
      items: [
        {
          avatarUrl: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'local',
          id: 'local-default',
          metadata: { plan: 'local' },
          name: 'Local Tenant',
          plan: 'local',
          slug: 'local',
          status: 'active',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      refresh: async () => [],
      switchTenant: (id: string) => {
        console.warn(`[MockKernel] switchTenant called: ${id}`);
      },
      ...overrides?.tenant,
    },
  };
}
