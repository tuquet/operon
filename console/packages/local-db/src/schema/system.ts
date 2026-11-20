import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 1. System Settings (Local Key-Value Preferences & Flags)
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. System Plugins Registry
export const systemPlugins = sqliteTable('system_plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  settings: text('settings', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  installedAt: text('installed_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 3. System Audit Logs
export const systemAuditLogs = sqliteTable('system_audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  details: text('details', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  createdAt: text('created_at').notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
export type SystemPlugin = typeof systemPlugins.$inferSelect;
export type NewSystemPlugin = typeof systemPlugins.$inferInsert;
export type SystemAuditLog = typeof systemAuditLogs.$inferSelect;
export type NewSystemAuditLog = typeof systemAuditLogs.$inferInsert;
