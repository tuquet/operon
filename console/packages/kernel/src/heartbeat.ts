import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useKernel } from './tokens';

export type LocalBridgeStatus = 'checking' | 'healthy' | 'offline';

export interface LocalBridgeHealth {
  message: string;
  status: string;
  version: string;
}

export interface LocalBridgeInstallInfo {
  command: string;
  platform: 'unix' | 'windows';
  releasesUrl: string;
}

export function getLocalBridgeInstallInfo(
  repo = 'tuquet/operon',
): LocalBridgeInstallInfo {
  const isWindows =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('windows');
  const base = `https://github.com/${repo}/releases/latest`;
  return {
    command: isWindows
      ? `irm ${base}/download/install.ps1 | iex`
      : `curl -fsSL ${base}/download/install.sh | sh`,
    platform: isWindows ? 'windows' : 'unix',
    releasesUrl: base,
  };
}

export interface LocalBridgeHeartbeatOptions {
  /** Start polling automatically on mount (default: true) */
  autoStart?: boolean;
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** Override daemon port (defaults to kernel.api.daemonPort or 8765) */
  port?: number;
  /** Per-request timeout in milliseconds (default: 2000) */
  timeoutMs?: number;
}

type BridgeMonitor = ReturnType<typeof createBridgeMonitor>;

const bridgeMonitors = new Map<number, BridgeMonitor>();

function createBridgeMonitor(
  port: number,
  intervalMs: number,
  timeoutMs: number,
) {
  const status = ref<LocalBridgeStatus>('checking');
  const health = ref<LocalBridgeHealth | null>(null);
  const lastCheckedAt = ref<null | number>(null);
  const lastError = ref<null | string>(null);

  const isHealthy = computed(() => status.value === 'healthy');
  const isInitialChecking = computed(
    () => status.value === 'checking' && lastCheckedAt.value === null,
  );

  let timer: null | ReturnType<typeof setInterval> = null;
  let activeController: AbortController | null = null;
  let subscriberCount = 0;

  async function checkNow(manual = true): Promise<boolean> {
    if (manual || lastCheckedAt.value === null) {
      status.value = 'checking';
    }
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as LocalBridgeHealth;
      if (data?.status !== 'ok') {
        throw new Error(
          `Unexpected daemon status: ${data?.status ?? 'unknown'}`,
        );
      }
      health.value = data;
      status.value = 'healthy';
      lastError.value = null;
      lastCheckedAt.value = Date.now();
      return true;
    } catch (error) {
      if (
        (error as Error)?.name === 'AbortError' &&
        activeController !== controller
      ) {
        return isHealthy.value;
      }
      health.value = null;
      status.value = 'offline';
      lastError.value =
        error instanceof Error ? error.message : 'Local daemon unreachable';
      lastCheckedAt.value = Date.now();
      return false;
    } finally {
      clearTimeout(timeoutId);
      if (activeController === controller) {
        activeController = null;
      }
    }
  }

  function start() {
    if (timer) return;
    void checkNow(false);
    timer = setInterval(() => {
      void checkNow(false);
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    activeController?.abort();
    activeController = null;
  }

  function retain() {
    subscriberCount += 1;
    if (subscriberCount === 1) {
      start();
    }
  }

  function release() {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stop();
    }
  }

  return {
    checkNow,
    error: lastError,
    health,
    isHealthy,
    isInitialChecking,
    lastCheckedAt,
    port,
    release,
    retain,
    start,
    status,
    stop,
  };
}

/**
 * Returns the latest cached status for the local Operon bridge monitor on `port`.
 */
export function getLocalBridgeStatus(port = 8765): LocalBridgeStatus {
  return bridgeMonitors.get(port)?.status.value ?? 'checking';
}

/**
 * Polls the device-local Operon daemon (`GET /api/v1/health`) on loopback
 * to determine whether the local bridge is healthy and ready for UI interaction.
 * Shares a singleton monitor per daemon port so multiple UI surfaces stay in sync.
 */
export function useLocalBridgeHeartbeat(
  options: LocalBridgeHeartbeatOptions = {},
) {
  const kernel = useKernel();
  const port = options.port ?? kernel.api.daemonPort ?? 8765;
  const intervalMs = options.intervalMs ?? 5000;
  const timeoutMs = options.timeoutMs ?? 2000;
  const autoStart = options.autoStart ?? true;

  let monitor = bridgeMonitors.get(port);
  if (!monitor) {
    monitor = createBridgeMonitor(port, intervalMs, timeoutMs);
    bridgeMonitors.set(port, monitor);
  }

  if (autoStart) {
    onMounted(() => monitor.retain());
    onUnmounted(() => monitor.release());
  }

  return {
    checkNow: monitor.checkNow,
    error: monitor.error,
    health: monitor.health,
    isHealthy: monitor.isHealthy,
    isInitialChecking: monitor.isInitialChecking,
    lastCheckedAt: monitor.lastCheckedAt,
    port: monitor.port,
    start: monitor.start,
    status: monitor.status,
    stop: monitor.stop,
  };
}
