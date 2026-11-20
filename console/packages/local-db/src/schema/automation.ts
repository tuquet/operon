import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const syncAuditColumns = () => ({
  tenantId: text('tenant_id'),
  lastSyncedAt: text('last_synced_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 1. Workflows (Automations & AST Graphs)
export const workflows = sqliteTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    version: text('version').default('1.0.0').notNull(),
    nodes: text('nodes', { mode: 'json' })
      .$type<Record<string, unknown>[]>()
      .default([])
      .notNull(),
    edges: text('edges', { mode: 'json' })
      .$type<Record<string, unknown>[]>()
      .default([])
      .notNull(),
    settings: text('settings', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    ...syncAuditColumns(),
  },
  (table) => [
    index('idx_workflows_is_active').on(table.isActive),
    index('idx_workflows_tenant').on(table.tenantId),
  ],
);

// 2. Proxies (Network Gateway Configuration)
export const proxies = sqliteTable(
  'proxies',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    protocol: text('protocol', { enum: ['http', 'https', 'socks5'] })
      .default('socks5')
      .notNull(),
    host: text('host').notNull(),
    port: integer('port').notNull(),
    username: text('username'),
    password: text('password'),
    countryCode: text('country_code'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    ...syncAuditColumns(),
  },
  (table) => [
    index('idx_proxies_is_active').on(table.isActive),
    index('idx_proxies_tenant').on(table.tenantId),
  ],
);

export interface BrowserFingerprintConfig {
  acceptLang?: string;
  deviceMemoryGb?: number;
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  lang?: string;
  noiseLevel?: 'aggressive' | 'balanced' | 'off' | 'subtle';
  osPlatform?: string;
  osVersion?: string;
  screenHeight?: number;
  screenWidth?: number;
  seed?: number;
  webrtcMode?: 'default' | 'disabled' | 'proxy_shielded';
  [key: string]: unknown;
}

// 3. Browser Profiles (Isolated Stealth Fingerprints & Sessions)
export const browserProfiles = sqliteTable(
  'browser_profiles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    releaseId: text('release_id'),
    templateId: text('template_id'),
    proxyId: text('proxy_id').references(() => proxies.id, {
      onDelete: 'set null',
    }),
    userAgent: text('user_agent'),
    timezone: text('timezone'),
    browserType: text('browser_type').default('Chromium').notNull(),
    fingerprint: text('fingerprint', { mode: 'json' })
      .$type<BrowserFingerprintConfig>()
      .default({})
      .notNull(),
    cookies: text('cookies', { mode: 'json' })
      .$type<Record<string, unknown>[]>()
      .default([])
      .notNull(),
    storageState: text('storage_state', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isLocked: integer('is_locked', { mode: 'boolean' })
      .default(false)
      .notNull(),
    ...syncAuditColumns(),
  },
  (table) => [
    index('idx_browser_profiles_proxy').on(table.proxyId),
    index('idx_browser_profiles_locked').on(table.isLocked),
    index('idx_browser_profiles_tenant').on(table.tenantId),
  ],
);

// 4. Devices (Local Daemon & Worker Nodes)
export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ipAddress: text('ip_address'),
    status: text('status', {
      enum: ['online', 'offline', 'busy', 'error'],
    })
      .default('offline')
      .notNull(),
    specs: text('specs', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    lastHeartbeatAt: text('last_heartbeat_at'),
    enrolledAt: text('enrolled_at').notNull(),
  },
  (table) => [index('idx_devices_status').on(table.status)],
);

// 5. Jobs (Execution Runs & Tasks)
export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').references(() => workflows.id, {
      onDelete: 'set null',
    }),
    profileId: text('profile_id').references(() => browserProfiles.id, {
      onDelete: 'set null',
    }),
    deviceId: text('device_id').references(() => devices.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    data: text('data', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    options: text('options', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: text('status', {
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    })
      .default('pending')
      .notNull(),
    result: text('result', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    startedAt: text('started_at'),
    finishedAt: text('finished_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_jobs_workflow').on(table.workflowId),
    index('idx_jobs_profile').on(table.profileId),
    index('idx_jobs_status').on(table.status),
  ],
);

// 6. Execution Logs (Audit & Traces)
export const executionLogs = sqliteTable(
  'execution_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    level: text('level', { enum: ['info', 'warn', 'error', 'debug'] })
      .default('info')
      .notNull(),
    message: text('message').notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_execution_logs_job_id').on(table.jobId),
    index('idx_execution_logs_level').on(table.level),
  ],
);

// 7. Assets (Screenshots, Artifacts & Media)
export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').references(() => jobs.id, {
      onDelete: 'cascade',
    }),
    profileId: text('profile_id').references(() => browserProfiles.id, {
      onDelete: 'set null',
    }),
    fileType: text('file_type').default('screenshot').notNull(),
    storagePath: text('storage_path').notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_assets_job_id').on(table.jobId)],
);

/** Relations */
export const workflowsRelations = relations(workflows, ({ many }) => ({
  jobs: many(jobs),
}));

export const proxiesRelations = relations(proxies, ({ many }) => ({
  browserProfiles: many(browserProfiles),
}));

export const browserProfilesRelations = relations(
  browserProfiles,
  ({ one, many }) => ({
    proxy: one(proxies, {
      fields: [browserProfiles.proxyId],
      references: [proxies.id],
    }),
    jobs: many(jobs),
    assets: many(assets),
  }),
);

export const devicesRelations = relations(devices, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [jobs.workflowId],
    references: [workflows.id],
  }),
  browserProfile: one(browserProfiles, {
    fields: [jobs.profileId],
    references: [browserProfiles.id],
  }),
  device: one(devices, {
    fields: [jobs.deviceId],
    references: [devices.id],
  }),
  logs: many(executionLogs),
  assets: many(assets),
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [executionLogs.jobId],
    references: [jobs.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  job: one(jobs, {
    fields: [assets.jobId],
    references: [jobs.id],
  }),
  browserProfile: one(browserProfiles, {
    fields: [assets.profileId],
    references: [browserProfiles.id],
  }),
}));

/** Inferred types */
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;
export type BrowserProfile = typeof browserProfiles.$inferSelect;
export type NewBrowserProfile = typeof browserProfiles.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
