/**
 * Adjust this file according to specific business logic requirements
 */
import type { RequestClientOptions } from '@operon/request';

import { useAppConfig } from '@operon/hooks';
import { preferences } from '@operon/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@operon/request';
import { useAccessStore } from '@operon/stores';

import { toast } from '@operon-core/shadcn-ui';

import { useAuthStore } from '#/store';
import { addNetworkBreadcrumb, captureError } from '#/utils/bugsink';

import { refreshToken } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * Re-authentication logic (delegates to AuthStore SSOT)
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired.');
    const authStore = useAuthStore();
    await authStore.handleSessionExpired();
  }

  /**
   * Token refresh logic
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshToken();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // Request headers handling
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // Response data format handling
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // Handle token expiration
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // Generic error handling fallback
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // Customize based on business needs using error code/payload
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      addNetworkBreadcrumb({
        method: error?.config?.method || 'GET',
        status: error?.response?.status || 0,
        url: error?.config?.url || '',
      });
      captureError(error, {
        message: errorMessage || msg,
        phase: 'request_client',
        status: error?.response?.status,
        url: error?.config?.url,
      });
      // Fallback to HTTP status code message if no error payload
      toast.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
