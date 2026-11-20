import type { KernelApiContext } from '@operon/kernel';

export interface FingerprintConfig {
  acceptLang?: null | string;
  deviceMemoryGb?: null | number;
  devicePixelRatio?: null | number;
  hardwareConcurrency?: null | number;
  lang?: null | string;
  noiseLevel?: null | string;
  osPlatform?: null | string;
  osVersion?: null | string;
  screenHeight?: null | number;
  screenWidth?: null | number;
  seed?: null | number;
  webrtcMode?: null | string;
}

export interface BrowserProfileRecord {
  createdAt: string;
  debuggingPort?: null | number;
  diskSizeBytes?: null | number;
  extensions: string[];
  fingerprintConfig: FingerprintConfig;
  groupName?: null | string;
  id: string;
  isDefault: boolean;
  isOnline: boolean;
  name: string;
  pid?: null | number;
  proxy?: null | string;
  startupFlags: string[];
  tags: string[];
  tenantId: string;
  timezone?: null | string;
  updatedAt: string;
  userAgent?: null | string;
  wsUrl?: null | string;
}

export interface ListBrowsersParams {
  group?: string;
  hasProxy?: boolean;
  limit?: number;
  offset?: number;
  platform?: string;
  scope?: 'all' | 'tenant';
  search?: string;
  status?: 'offline' | 'online';
  tenantId?: string;
}

export interface CreateBrowserInput {
  extensions?: string[];
  fingerprintConfig?: FingerprintConfig;
  groupName?: string;
  id?: string;
  name: string;
  proxy?: string;
  startupFlags?: string[];
  tags?: string[];
  tenantId?: string;
  timezone?: string;
  userAgent?: string;
}

export interface CreateBrowserResult {
  browser?: BrowserProfileRecord;
  id: string;
  message: string;
  success: boolean;
}

export interface PatchBrowserPatch {
  extensions?: string[];
  fingerprintConfig?: FingerprintConfig;
  groupName?: null | string;
  name?: string;
  proxy?: null | string;
  startupFlags?: string[];
  tags?: string[];
  timezone?: null | string;
  userAgent?: null | string;
}

export interface DeleteBrowserResult {
  message: string;
  success: boolean;
}

export interface StartSessionInput {
  args?: string[];
  headless?: boolean;
  proxy?: string;
  startUrl?: string;
}

export interface StartSessionResult {
  browserId: string;
  debuggingPort?: null | number;
  message: string;
  pid?: null | number;
  status: string;
  userDataDir?: null | string;
  wsUrl?: null | string;
}

export interface StopSessionResult {
  message: string;
  status: string;
}

export interface CloneBrowserInput {
  copyStorage?: boolean;
  name?: string;
  newId?: string;
  preserveSeed?: boolean;
  targetTenantId?: string;
}

export interface MoveBrowserInput {
  targetTenantId: string;
}

export interface ProbeProxyInput {
  proxy: string;
  timeoutSecs?: number;
}

export interface ProbeProxyResult {
  alive: boolean;
  colo?: null | string;
  country?: null | string;
  egressIp?: null | string;
  error?: null | string;
  protocol: string;
  proxyUrl: string;
  rttMs: number;
}

export interface BatchDeleteFailure {
  id: string;
  reason: string;
}

export interface BatchDeleteResult {
  deleted: string[];
  errors: BatchDeleteFailure[];
  skipped: BatchDeleteFailure[];
}

export interface ImportCsvErrorItem {
  reason: string;
  row: number;
}

export interface ImportCsvResult {
  errors: ImportCsvErrorItem[];
  imported: number;
  message: string;
  skipped: number;
  status: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function createBrowserApi(api: KernelApiContext) {
  return {
    autoDetect: () =>
      api.localDaemonFetch<BrowserProfileRecord[]>(
        '/api/v1/browsers/auto-detect',
        { method: 'POST' },
      ),

    batchDelete: (ids: string[], force = false) =>
      api.localDaemonFetch<BatchDeleteResult>(
        '/api/v1/browsers/batch/delete',
        {
          body: JSON.stringify({ force, ids }),
          headers: JSON_HEADERS,
          method: 'POST',
        },
      ),

    clone: (id: string, input: CloneBrowserInput) =>
      api.localDaemonFetch<BrowserProfileRecord>(
        `/api/v1/browsers/${encodeURIComponent(id)}/clone`,
        {
          body: JSON.stringify(input),
          headers: JSON_HEADERS,
          method: 'POST',
        },
      ),

    create: (input: CreateBrowserInput) =>
      api.localDaemonFetch<CreateBrowserResult>('/api/v1/browsers', {
        body: JSON.stringify(input),
        headers: JSON_HEADERS,
        method: 'POST',
      }),

    detail: (id: string) =>
      api.localDaemonFetch<BrowserProfileRecord>(
        `/api/v1/browsers/${encodeURIComponent(id)}`,
      ),

    importCsv: (csvString: string, tenantId?: string) =>
      api.localDaemonFetch<ImportCsvResult>('/api/v1/browsers/import-csv', {
        body: JSON.stringify({ csvString, tenantId }),
        headers: JSON_HEADERS,
        method: 'POST',
      }),

    list: (params: ListBrowsersParams = {}) => {
      const qs = new URLSearchParams();
      if (params.tenantId) qs.set('tenantId', params.tenantId);
      if (params.scope) qs.set('scope', params.scope);
      if (params.search?.trim()) qs.set('search', params.search.trim());
      if (params.status) qs.set('status', params.status);
      if (params.hasProxy !== undefined) {
        qs.set('hasProxy', String(params.hasProxy));
      }
      if (params.platform) qs.set('platform', params.platform);
      if (params.group) qs.set('group', params.group);
      if (params.limit !== undefined) qs.set('limit', String(params.limit));
      if (params.offset !== undefined) qs.set('offset', String(params.offset));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return api.localDaemonFetch<BrowserProfileRecord[]>(
        `/api/v1/browsers${suffix}`,
      );
    },

    move: (id: string, input: MoveBrowserInput) =>
      api.localDaemonFetch<BrowserProfileRecord>(
        `/api/v1/browsers/${encodeURIComponent(id)}/move`,
        {
          body: JSON.stringify(input),
          headers: JSON_HEADERS,
          method: 'POST',
        },
      ),

    patch: (id: string, patch: PatchBrowserPatch) =>
      api.localDaemonFetch<BrowserProfileRecord>(
        `/api/v1/browsers/${encodeURIComponent(id)}`,
        {
          body: JSON.stringify(patch),
          headers: JSON_HEADERS,
          method: 'PATCH',
        },
      ),

    probeProxy: (input: ProbeProxyInput) =>
      api.localDaemonFetch<ProbeProxyResult>('/api/v1/browsers/proxy/probe', {
        body: JSON.stringify(input),
        headers: JSON_HEADERS,
        method: 'POST',
      }),

    remove: (id: string, force = false) =>
      api.localDaemonFetch<DeleteBrowserResult>(
        `/api/v1/browsers/${encodeURIComponent(id)}?force=${force}`,
        { method: 'DELETE' },
      ),

    setDefault: (id: string) =>
      api.localDaemonFetch<{ defaultProfileId: string; success: boolean }>(
        `/api/v1/browsers/${encodeURIComponent(id)}/set-default`,
        { method: 'POST' },
      ),

    startSession: (id: string, input: StartSessionInput = {}) =>
      api.localDaemonFetch<StartSessionResult>(
        `/api/v1/browsers/${encodeURIComponent(id)}/session`,
        {
          body: JSON.stringify(input),
          headers: JSON_HEADERS,
          method: 'POST',
        },
      ),

    stopSession: (id: string, force = false) =>
      api.localDaemonFetch<StopSessionResult>(
        `/api/v1/browsers/${encodeURIComponent(id)}/session?force=${force}`,
        { method: 'DELETE' },
      ),

    unbind: (id: string) =>
      api.localDaemonFetch<{
        cloudReleased: boolean;
        id: string;
        message: string;
        success: boolean;
      }>(`/api/v1/browsers/${encodeURIComponent(id)}/unbind`, {
        method: 'POST',
      }),

    updateExtensions: (
      id: string,
      extensions: string[],
      allowRemoveAutomation = false,
    ) =>
      api.localDaemonFetch<BrowserProfileRecord>(
        `/api/v1/browsers/${encodeURIComponent(id)}/extensions`,
        {
          body: JSON.stringify({ allowRemoveAutomation, extensions }),
          headers: JSON_HEADERS,
          method: 'PUT',
        },
      ),
  };
}
