import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { defineConfig } from 'drizzle-kit';

/**
 * Operon Local Database SSOT Resolver
 * Canonical location: ~/.operon/data/operon.sqlite
 * Graceful fallback: copies legacy ~/.operon/automation/automation.sqlite if present.
 */
const operonHome = path.join(os.homedir(), '.operon');
const dataDir = path.join(operonHome, 'data');
const canonicalDbPath = path.join(dataDir, 'operon.sqlite');

const legacyDir = path.join(operonHome, 'automation');
const legacyDbPath = path.join(legacyDir, 'automation.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Graceful auto-migration from legacy path
if (!fs.existsSync(canonicalDbPath) && fs.existsSync(legacyDbPath)) {
  try {
    fs.copyFileSync(legacyDbPath, canonicalDbPath);
  } catch (error) {
    console.warn(
      '[Drizzle Config] Warning: failed to auto-migrate legacy database:',
      error,
    );
  }
}

// Ensure valid file: URI format across OS platforms (especially Windows)
const fileUrl = `file:${canonicalDbPath.replaceAll('\\', '/')}`;

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.OPERON_SQLITE_URL || fileUrl,
  },
});
