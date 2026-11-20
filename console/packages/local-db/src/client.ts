import type { Client } from '@libsql/client';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import * as fullSchema from './schema';
import * as automationSchema from './schema/automation';
import * as systemSchema from './schema/system';
import * as tenantsSchema from './schema/tenants';

export type OperonDb<
  TSchema extends Record<string, unknown> = typeof fullSchema,
> = ReturnType<typeof drizzle<TSchema>>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the canonical SQLite file path.
 * When domain is provided, returns ~/.operon/data/<domain>.sqlite.
 * When omitted, returns default ~/.operon/data/operon.sqlite.
 */
export function getCanonicalSqlitePath(domain?: string): string {
  const dataDir = path.join(os.homedir(), '.operon', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const fileName = domain ? `${domain}.sqlite` : 'operon.sqlite';
  return path.join(dataDir, fileName);
}

const DOMAIN_SCHEMAS: Record<string, Record<string, unknown>> = {
  automation: automationSchema,
  system: systemSchema,
  tenants: tenantsSchema,
};

/**
 * Returns the default schema bundle associated with a domain.
 */
export function getDomainSchema(domain: string) {
  return DOMAIN_SCHEMAS[domain.toLowerCase()] ?? fullSchema;
}

function createDrizzleClient<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  envKey: string,
  domain?: string,
  customUrl?: string,
): OperonDb<TSchema> {
  const defaultPath = getCanonicalSqlitePath(domain);
  const fileUrl = `file:${defaultPath.replaceAll('\\', '/')}`;
  const url = customUrl || process.env[envKey] || fileUrl;
  const client = createClient({ url });
  return drizzle(client, { schema });
}

/**
 * Initializes and returns a typed Drizzle ORM client for a specific micro-app domain.
 */
export function getDomainDb<
  TSchema extends Record<string, unknown> = typeof fullSchema,
>(
  domain: 'automation' | 'system' | 'tenants' | string,
  customSchema?: TSchema,
  customUrl?: string,
): OperonDb<TSchema> {
  const schemaToUse = (customSchema || getDomainSchema(domain)) as TSchema;
  return createDrizzleClient(
    schemaToUse,
    `OPERON_${domain.toUpperCase()}_SQLITE_URL`,
    domain,
    customUrl,
  );
}

/**
 * Initializes and returns a typed Drizzle ORM client for the unified local SQLite database.
 * Backward compatible with existing Operon code.
 */
export function getLocalDb(customUrl?: string): OperonDb<typeof fullSchema> {
  return createDrizzleClient(
    fullSchema,
    'OPERON_SQLITE_URL',
    undefined,
    customUrl,
  );
}

async function hasSqliteTable(
  client: Client,
  tableName: string,
): Promise<boolean> {
  const res = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [tableName],
  });
  return res.rows.length > 0;
}

/**
 * Helper to ensure pre-Drizzle Operon databases are safely upgraded to the latest schema.
 */
async function ensureLegacyCompatibility(client: Client): Promise<void> {
  try {
    if (await hasSqliteTable(client, 'jobs')) {
      const pragmaRes = await client.execute('PRAGMA table_info(jobs)');
      const existingCols = new Set(pragmaRes.rows.map((r: any) => r.name));

      const missingCols: Array<{ ddl: string; name: string }> = [
        { name: 'workflow_id', ddl: 'text' },
        { name: 'profile_id', ddl: 'text' },
        { name: 'device_id', ddl: 'text' },
        { name: 'result', ddl: "text DEFAULT '{}' NOT NULL" },
        { name: 'started_at', ddl: 'text' },
        { name: 'finished_at', ddl: 'text' },
      ];

      for (const col of missingCols) {
        if (!existingCols.has(col.name)) {
          await client.execute(
            `ALTER TABLE jobs ADD COLUMN ${col.name} ${col.ddl}`,
          );
        }
      }
    }
  } catch {
    // Non-fatal if legacy check or column addition fails
  }
}

async function migrateLegacyBrowsersTable(client: Client): Promise<void> {
  if (await hasSqliteTable(client, 'browsers')) {
    await client.execute(`
      INSERT OR IGNORE INTO browser_profiles (id, name, user_agent, timezone, created_at, updated_at)
      SELECT id, name, user_agent, timezone, created_at, updated_at FROM browsers;
    `);
  }
}

/**
 * Automatically applies pending Drizzle migrations to the target SQLite database.
 * Runs idempotently on both fresh installations and legacy upgrades.
 */
export async function runLocalMigrations<T extends Record<string, unknown>>(
  db: OperonDb<T>,
  migrationsFolder?: string,
): Promise<void> {
  const targetFolder =
    migrationsFolder || path.resolve(__dirname, './migrations');

  if (!fs.existsSync(targetFolder)) {
    return;
  }

  const client = (db as unknown as { $client?: Client }).$client;
  if (client && typeof client.execute === 'function') {
    await ensureLegacyCompatibility(client);
  }

  try {
    await migrate(db as unknown as Parameters<typeof migrate>[0], {
      migrationsFolder: targetFolder,
    });

    if (client && typeof client.execute === 'function') {
      await migrateLegacyBrowsersTable(client);
    }
  } catch (error) {
    console.error('[Local-DB] Failed to apply local SQLite migrations:', error);
    throw error;
  }
}
