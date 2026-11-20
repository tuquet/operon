#!/usr/bin/env node
// Compatibility entry point; packaging is strict and requires explicit CI context.
import { resolve } from 'node:path';

import { packagePreview, packageRelease } from './release/artifacts.mjs';
import { readJson, root } from './release/common.mjs';

const binaryDirectory = resolve(
  root,
  process.env.RELEASE_BINARY_DIR ??
    'apps/shell/src-tauri/target/x86_64-pc-windows-msvc/release',
);
const outputDirectory = resolve(
  root,
  process.env.RELEASE_OUTPUT_DIR ?? 'dist-release',
);
await (process.argv.includes('--preview')
  ? packagePreview(binaryDirectory, outputDirectory)
  : packageRelease({
      binaryDirectory,
      outputDirectory,
      context: readJson('.temp/release/context.json'),
    }));
