/**
 * Workflow Definition Lifecycle Status (`operon.workflows.status`)
 */
export const WORKFLOW_STATUS = {
  ARCHIVED: 'archived',
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

export const WORKFLOW_STATUS_VALUES = Object.values(
  WORKFLOW_STATUS,
) as readonly WorkflowStatus[];

/**
 * Automation Job Execution Status (`operon.jobs.status`)
 */
export const JOB_STATUS = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const JOB_STATUS_VALUES = Object.values(
  JOB_STATUS,
) as readonly JobStatus[];

/**
 * Execution Log Severity Level (`operon.execution_logs.level`)
 */
export const LOG_LEVEL = {
  DEBUG: 'debug',
  ERROR: 'error',
  FATAL: 'fatal',
  INFO: 'info',
  TRACE: 'trace',
  WARN: 'warn',
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

export const LOG_LEVEL_VALUES = Object.values(LOG_LEVEL) as readonly LogLevel[];

/**
 * Worker Device Operational Status (`operon.devices.status`)
 */
export const DEVICE_STATUS = {
  BUSY: 'busy',
  DISABLED: 'disabled',
  IDLE: 'idle',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
} as const;

export type DeviceStatus = (typeof DEVICE_STATUS)[keyof typeof DEVICE_STATUS];

export const DEVICE_STATUS_VALUES = Object.values(
  DEVICE_STATUS,
) as readonly DeviceStatus[];

/**
 * Antidetect Browser Profile Status (`operon.browser_profiles.status`)
 */
export const BROWSER_STATUS = {
  ERROR: 'error',
  IDLE: 'idle',
  RUNNING: 'running',
  SYNCING: 'syncing',
} as const;

export type BrowserStatus =
  (typeof BROWSER_STATUS)[keyof typeof BROWSER_STATUS];

export const BROWSER_STATUS_VALUES = Object.values(
  BROWSER_STATUS,
) as readonly BrowserStatus[];

/**
 * Proxy Node Health Status (`operon.proxies.status`)
 */
export const PROXY_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  FAILING: 'failing',
  TESTING: 'testing',
} as const;

export type ProxyStatus = (typeof PROXY_STATUS)[keyof typeof PROXY_STATUS];

export const PROXY_STATUS_VALUES = Object.values(
  PROXY_STATUS,
) as readonly ProxyStatus[];

/**
 * Proxy Transport Protocol (`operon.proxies.protocol`)
 */
export const PROXY_PROTOCOL = {
  HTTP: 'http',
  HTTPS: 'https',
  SOCKS4: 'socks4',
  SOCKS5: 'socks5',
} as const;

export type ProxyProtocol =
  (typeof PROXY_PROTOCOL)[keyof typeof PROXY_PROTOCOL];

export const PROXY_PROTOCOL_VALUES = Object.values(
  PROXY_PROTOCOL,
) as readonly ProxyProtocol[];

/**
 * Proxy Pool Network Classification (`is_residential` filter)
 */
export const PROXY_NETWORK_TYPE = {
  DATACENTER: 'datacenter',
  RESIDENTIAL: 'residential',
} as const;

export type ProxyNetworkType =
  (typeof PROXY_NETWORK_TYPE)[keyof typeof PROXY_NETWORK_TYPE];
