import type { Device } from '../automation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  browsersApi,
  buildAutomationFilterQuery,
  buildFleetFilterQuery,
  calculateAutomationOverviewSummary,
  calculateFleetMetrics,
  calculateProgressPercentage,
  cancelJob,
  devicesApi,
  getJob,
  isRunActive,
  jobsApi,
  listBrowserReleases,
  listBrowsers,
  listDevices,
  listExecutionLogs,
  listJobs,
  listProxies,
  listWorkflows,
  mapRawDeviceToFleetNode,
  proxiesApi,
  revokeDevice,
  workflowsApi,
} from '../automation';
import { supabaseRequest } from '../supabase-client';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn(),
}));

describe('automation core api & helpers (automation & workers schemas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRunActive', () => {
    it('should return true for active campaign states', () => {
      expect(isRunActive('pending')).toBe(true);
      expect(isRunActive('queued')).toBe(true);
      expect(isRunActive('running')).toBe(true);
    });

    it('should return false for terminal or paused states', () => {
      expect(isRunActive('completed')).toBe(false);
      expect(isRunActive('failed')).toBe(false);
      expect(isRunActive('cancelled')).toBe(false);
      expect(isRunActive('paused')).toBe(false);
    });
  });

  describe('calculateProgressPercentage', () => {
    it('should safely return 0 when total is 0 or negative', () => {
      expect(calculateProgressPercentage(0, 0)).toBe(0);
      expect(calculateProgressPercentage(5, -1)).toBe(0);
    });

    it('should return rounded percentage for normal task values', () => {
      expect(calculateProgressPercentage(25, 100)).toBe(25);
      expect(calculateProgressPercentage(1, 3)).toBe(33);
      expect(calculateProgressPercentage(2, 3)).toBe(67);
    });

    it('should cap at 100% if completed exceeds total', () => {
      expect(calculateProgressPercentage(150, 100)).toBe(100);
    });
  });

  describe('buildAutomationFilterQuery', () => {
    it('should return base query when no filters are provided', () => {
      const query = buildAutomationFilterQuery('/rest/v1/workflows?select=*');
      expect(query).toBe('/rest/v1/workflows?select=*');
    });

    it('should append tenantId, status, and workflowId correctly', () => {
      const query = buildAutomationFilterQuery(
        '/rest/v1/campaign_runs?select=*',
        {
          status: 'running',
          tenantId: 'tenant-123',
          workflowId: 'wf-456',
        },
      );
      expect(query).toBe(
        '/rest/v1/campaign_runs?select=*&tenant_id=eq.tenant-123&status=eq.running&workflow_id=eq.wf-456',
      );
    });

    it('should ignore filters set to all', () => {
      const query = buildAutomationFilterQuery('/rest/v1/workflows?select=*', {
        status: 'all',
        tenantId: 'tenant-123',
        workflowId: 'all',
      });
      expect(query).toBe('/rest/v1/workflows?select=*&tenant_id=eq.tenant-123');
    });
  });

  describe('api functions with automation schema header', () => {
    it('should call listWorkflows via workflow_list RPC', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          created_at: '2026-10-13T00:00:00Z',
          description: 'Test WF',
          id: 'wf-1',
          name: 'Scraper Workflow',
          status: 'published',
          tenant_id: 't1',
          updated_at: '2026-10-13T00:00:00Z',
          version: '1.0.0',
        },
      ]);

      const result = await listWorkflows({ tenantId: 't1' });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/workflow_list',
        {
          body: JSON.stringify({ p_search: null }),
          method: 'POST',
          suppressErrorCapture: true,
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Scraper Workflow');
    });

    it('should call listJobs with schema automation', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          completed_tasks: 10,
          created_at: '2026-10-13T00:00:00Z',
          ended_at: null,
          error_message: null,
          failed_tasks: 0,
          id: 'run-1',
          name: 'Morning Batch Run',
          worker_id: 'worker-1',
          started_at: '2026-10-13T00:01:00Z',
          status: 'running',
          tenant_id: 't1',
          total_tasks: 50,
          workflow_id: 'wf-1',
        },
      ]);

      const runs = await listJobs({ status: 'running' });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/jobs?select='),
        { schema: 'automation', suppressErrorCapture: true },
      );
      expect(runs).toHaveLength(1);
      expect(runs[0]?.name).toBe('Morning Batch Run');
    });

    it('should call getJob and return single run', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          completed_tasks: 50,
          created_at: '2026-10-13T00:00:00Z',
          ended_at: '2026-10-13T00:05:00Z',
          error_message: null,
          failed_tasks: 0,
          id: 'run-99',
          name: 'Done Run',
          worker_id: 'worker-1',
          started_at: '2026-10-13T00:01:00Z',
          status: 'completed',
          tenant_id: 't1',
          total_tasks: 50,
          workflow_id: 'wf-1',
        },
      ]);

      const run = await getJob('run-99');

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/jobs?id=eq.run-99'),
        { schema: 'automation' },
      );
      expect(run?.id).toBe('run-99');
    });

    it('should call listExecutionLogs with sinceId pagination', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          job_id: 'run-1',
          id: 15,
          level: 'info',
          logged_at: '2026-10-13T00:02:00Z',
          message: 'Task executed',
          node_id: 'n1',
          payload: {},
          step_name: 'click_button',
          tenant_id: 't1',
        },
      ]);

      const logs = await listExecutionLogs('run-1', {
        limit: 100,
        sinceId: 10,
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('&id=gt.10'),
        { schema: 'automation' },
      );
      expect(logs).toHaveLength(1);
      expect(logs[0]?.id).toBe(15);
    });

    it('should call cancelJob with PATCH method and cancelled status', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce(undefined);

      await cancelJob('run-active-1');

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/jobs?id=eq.run-active-1',
        expect.objectContaining({
          body: expect.stringContaining('"status":"cancelled"'),
          method: 'PATCH',
          schema: 'automation',
        }),
      );
    });
  });

  describe('mapRawDeviceToFleetNode', () => {
    it('should correctly map raw row to Device with memory conversion', () => {
      const raw = {
        active_jobs: 2,
        capabilities: ['browser', 'automation'],
        cpu_cores: 16,
        id: 'dev-123',
        last_heartbeat_at: '2026-10-13T10:00:00Z',
        machine_fingerprint: 'fp-win32-xyz',
        metadata: {
          ip_address: '192.168.1.50',
        },
        name: 'Workstation Alpha',
        os_info: 'windows',
        ram_mb: 16_384,
        registered_at: '2026-10-01T00:00:00Z',
        status: 'busy',
        tenant_id: 'tenant-456',
        updated_at: '2026-10-13T10:05:00Z',
        version: 'v1.0.0',
      };

      const result = mapRawDeviceToFleetNode(raw);

      expect(result).toEqual({
        active_jobs: 2,
        capabilities: ['browser', 'automation'],
        cpu_cores: 16,
        driver_type: 'browser',
        hostname: 'fp-win32-xyz',
        id: 'dev-123',
        ip_address: '192.168.1.50',
        last_heartbeat_at: '2026-10-13T10:00:00Z',
        machine_fingerprint: 'fp-win32-xyz',
        metadata: {
          ip_address: '192.168.1.50',
        },
        name: 'Workstation Alpha',
        os_info: 'windows',
        ram_gb: 16,
        ram_mb: 16_384,
        registered_at: '2026-10-01T00:00:00Z',
        status: 'busy',
        tenant_id: 'tenant-456',
        updated_at: '2026-10-13T10:05:00Z',
        version: 'v1.0.0',
      });
    });

    it('should supply safe defaults for missing or invalid raw fields', () => {
      const raw = {
        id: 'dev-fallback',
      };

      const result = mapRawDeviceToFleetNode(raw);

      expect(result.name).toBe('Unnamed Device');
      expect(result.cpu_cores).toBe(1);
      expect(result.ram_mb).toBe(1024);
      expect(result.ram_gb).toBe(1);
      expect(result.active_jobs).toBe(0);
      expect(result.status).toBe('offline');
      expect(result.driver_type).toBe('automation');
      expect(result.ip_address).toBe('—');
      expect(result.hostname).toBe('unknown-host');
    });
  });

  describe('calculateFleetMetrics', () => {
    it('should aggregate online count (idle and busy) and sum active jobs', () => {
      const nodes: Device[] = [
        {
          active_jobs: 0,
          capabilities: [],
          cpu_cores: 4,
          id: '1',
          last_heartbeat_at: null,
          machine_fingerprint: 'm1',
          name: 'N1',
          os_info: 'linux',
          ram_gb: 4,
          ram_mb: 4096,
          registered_at: 'now',
          status: 'idle',
          tenant_id: 't1',
          updated_at: 'now',
          version: '1',
        },
        {
          active_jobs: 3,
          capabilities: [],
          cpu_cores: 8,
          id: '2',
          last_heartbeat_at: null,
          machine_fingerprint: 'm2',
          name: 'N2',
          os_info: 'windows',
          ram_gb: 16,
          ram_mb: 16_384,
          registered_at: 'now',
          status: 'busy',
          tenant_id: 't1',
          updated_at: 'now',
          version: '1',
        },
        {
          active_jobs: 0,
          capabilities: [],
          cpu_cores: 2,
          id: '3',
          last_heartbeat_at: null,
          machine_fingerprint: 'm3',
          name: 'N3',
          os_info: 'macos',
          ram_gb: 8,
          ram_mb: 8192,
          registered_at: 'now',
          status: 'offline',
          tenant_id: 't1',
          updated_at: 'now',
          version: '1',
        },
      ];

      const metrics = calculateFleetMetrics(nodes, true);

      expect(metrics).toEqual({
        active_jobs: 3,
        loopback_online: true,
        loopback_port: 8765,
        online_nodes: 2,
        total_nodes: 3,
      });
    });
  });

  describe('buildFleetFilterQuery', () => {
    it('should return base query when no filters are present', () => {
      const query = buildFleetFilterQuery('/rest/v1/devices?select=*');
      expect(query).toBe('/rest/v1/devices?select=*');
    });

    it('should append tenant_id and status filters correctly', () => {
      const query = buildFleetFilterQuery('/rest/v1/devices?select=*', {
        status: 'busy',
        tenantId: 'tenant-123',
      });
      expect(query).toBe(
        '/rest/v1/devices?select=*&tenant_id=eq.tenant-123&status=eq.busy',
      );
    });

    it('should ignore status filter when set to all', () => {
      const query = buildFleetFilterQuery('/rest/v1/devices?select=*', {
        status: 'all',
        tenantId: 'tenant-123',
      });
      expect(query).toBe('/rest/v1/devices?select=*&tenant_id=eq.tenant-123');
    });
  });

  describe('api functions with schema workers header', () => {
    it('should query listDevices with workers schema', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          cpu_cores: 4,
          id: 'dev-1',
          name: 'Device 1',
          ram_mb: 4096,
          status: 'idle',
        },
      ]);

      const devices = await listDevices({ tenantId: 't1' });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/devices?select='),
        { schema: 'workers', suppressErrorCapture: true },
      );
      expect(devices).toHaveLength(1);
      expect(devices[0]?.name).toBe('Device 1');
    });

    it('should call revokeDevice with workers schema DELETE', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce(undefined);

      await revokeDevice('dev-999');

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/devices?id=eq.dev-999',
        {
          method: 'DELETE',
          schema: 'workers',
        },
      );
    });

    it('should query listBrowsers with workers schema', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          browser_type: 'chromium',
          id: 'br-1',
          name: 'Profile 1',
          status: 'idle',
        },
      ]);

      const browsers = await listBrowsers({ status: 'idle' });

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/browsers?select='),
        { schema: 'workers', suppressErrorCapture: true },
      );
      expect(browsers).toHaveLength(1);
    });

    it('should query listProxies with workers schema', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          host: '1.2.3.4',
          id: 'px-1',
          port: 8080,
          protocol: 'http',
          status: 'active',
        },
      ]);

      const proxies = await listProxies();

      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/proxies?select=*'),
        { schema: 'workers', suppressErrorCapture: true },
      );
      expect(proxies).toHaveLength(1);
    });

    it('should expose resource-oriented API objects', () => {
      expect(browsersApi.list).toBe(listBrowsers);
      expect(browsersApi.listReleases).toBe(listBrowserReleases);
      expect(devicesApi.list).toBe(listDevices);
      expect(devicesApi.revoke).toBe(revokeDevice);
      expect(jobsApi.list).toBe(listJobs);
      expect(jobsApi.get).toBe(getJob);
      expect(jobsApi.cancel).toBe(cancelJob);
      expect(jobsApi.listLogs).toBe(listExecutionLogs);
      expect(workflowsApi.list).toBe(listWorkflows);
      expect(proxiesApi.list).toBe(listProxies);
    });

    it('should call local daemon session endpoint when starting and stopping browser', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { startBrowserProfile, stopBrowserProfile } =
        await import('../automation');

      await startBrowserProfile('test-browser-id', { headless: false });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765/api/v1/browsers/test-browser-id/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ headless: false }),
        }),
      );

      await stopBrowserProfile('test-browser-id');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765/api/v1/browsers/test-browser-id/session',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );

      vi.unstubAllGlobals();
    });
  });

  describe('calculateAutomationOverviewSummary', () => {
    it('aggregates workflows, runs, devices, browsers, and proxy latency accurately', () => {
      const summary = calculateAutomationOverviewSummary({
        browsers: [
          {
            browser_type: 'chromium',
            cookies_count: 10,
            cpu_cores: 4,
            created_at: 'now',
            engine_version: '130',
            id: 'b1',
            last_synced_at: null,
            name: 'B1',
            os_platform: 'windows',
            os_version: '11',
            ram_gb: 8,
            status: 'running',
            storage_size_bytes: 1024,
            tenant_id: 't1',
          },
          {
            browser_type: 'chromium',
            cookies_count: 0,
            cpu_cores: 2,
            created_at: 'now',
            engine_version: '130',
            id: 'b2',
            last_synced_at: null,
            name: 'B2',
            os_platform: 'linux',
            os_version: '22',
            ram_gb: 4,
            status: 'idle',
            storage_size_bytes: 0,
            tenant_id: 't1',
          },
        ],
        devices: [
          {
            active_jobs: 2,
            capabilities: [],
            cpu_cores: 8,
            id: 'd1',
            last_heartbeat_at: null,
            machine_fingerprint: 'fp1',
            name: 'Node 1',
            os_info: 'linux',
            ram_gb: 16,
            ram_mb: 16_384,
            registered_at: 'now',
            status: 'busy',
            tenant_id: 't1',
            updated_at: 'now',
            version: '1.0',
          },
        ],
        loopbackOnline: true,
        proxies: [
          {
            city: 'Hanoi',
            country_code: 'VN',
            created_at: 'now',
            error_count: 0,
            host: '1.1.1.1',
            id: 'p1',
            is_residential: true,
            last_checked_at: 'now',
            latency_ms: 100,
            port: 1080,
            protocol: 'socks5',
            status: 'active',
            tags: [],
            tenant_id: 't1',
          },
          {
            city: 'SG',
            country_code: 'SG',
            created_at: 'now',
            error_count: 2,
            host: '2.2.2.2',
            id: 'p2',
            is_residential: false,
            last_checked_at: 'now',
            latency_ms: 200,
            port: 8080,
            protocol: 'http',
            status: 'failing',
            tags: [],
            tenant_id: 't1',
          },
        ],
        runs: [
          {
            completed_tasks: 5,
            created_at: 'now',
            ended_at: null,
            error_message: null,
            failed_tasks: 0,
            id: 'r1',
            name: 'Run 1',
            started_at: 'now',
            status: 'running',
            tenant_id: 't1',
            total_tasks: 10,
            worker_id: 'd1',
            workflow_id: 'w1',
          },
          {
            completed_tasks: 10,
            created_at: 'now',
            ended_at: 'now',
            error_message: null,
            failed_tasks: 0,
            id: 'r2',
            name: 'Run 2',
            started_at: 'now',
            status: 'completed',
            tenant_id: 't1',
            total_tasks: 10,
            worker_id: 'd1',
            workflow_id: 'w1',
          },
        ],
        workflows: [
          {
            created_at: 'now',
            description: null,
            id: 'w1',
            name: 'WF 1',
            status: 'published',
            tenant_id: 't1',
            updated_at: 'now',
            version: '1.0',
          },
          {
            created_at: 'now',
            description: null,
            id: 'w2',
            name: 'WF 2',
            status: 'draft',
            tenant_id: 't1',
            updated_at: 'now',
            version: '1.0',
          },
        ],
      });

      expect(summary.workflows).toEqual({
        archived: 0,
        draft: 1,
        published: 1,
        total: 2,
      });
      expect(summary.runs).toEqual({
        completed: 1,
        failed: 0,
        running: 1,
        total: 2,
      });
      expect(summary.fleet).toEqual({
        active_jobs: 2,
        loopback_online: true,
        loopback_port: 8765,
        online_nodes: 1,
        total_nodes: 1,
      });
      expect(summary.browsers).toEqual({
        error: 0,
        idle: 1,
        running: 1,
        total: 2,
      });
      expect(summary.proxies).toEqual({
        active: 1,
        avgLatencyMs: 150,
        failing: 1,
        total: 2,
      });
      expect(summary.recentRuns).toHaveLength(2);
      expect(summary.recentDevices).toHaveLength(1);
    });
  });
});
