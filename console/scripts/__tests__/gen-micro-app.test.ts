import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('gen-micro-app CLI Scaffolder', () => {
  const repoRoot = process.cwd();
  const sandboxDir = join(repoRoot, '.temp', 'test-gen-app-sandbox');
  const testAppName = 'unit-test-sample';
  const testAppDir = join(sandboxDir, 'apps', testAppName);
  const shellRoutePath = join(
    sandboxDir,
    'apps',
    'shell',
    'src',
    'router',
    'routes',
    'modules',
    `${testAppName}.ts`,
  );

  beforeEach(() => {
    rmSync(sandboxDir, { force: true, recursive: true });
    mkdirSync(join(sandboxDir, 'apps', 'shell', 'public'), { recursive: true });
    mkdirSync(join(sandboxDir, 'apps', 'shell', 'src', 'registry'), {
      recursive: true,
    });
    mkdirSync(
      join(sandboxDir, 'apps', 'shell', 'src', 'router', 'routes', 'modules'),
      {
        recursive: true,
      },
    );
    mkdirSync(
      join(sandboxDir, 'apps', 'shell', 'src', 'locales', 'langs', 'en-US'),
      {
        recursive: true,
      },
    );
    mkdirSync(
      join(sandboxDir, 'apps', 'shell', 'src', 'locales', 'langs', 'vi-VN'),
      {
        recursive: true,
      },
    );

    // Seed mock structure in sandbox
    cpSync(
      join(repoRoot, 'apps', 'shell', 'package.json'),
      join(sandboxDir, 'apps', 'shell', 'package.json'),
    );
    cpSync(
      join(repoRoot, 'apps', 'shell', 'public', 'apps.manifest.json'),
      join(sandboxDir, 'apps', 'shell', 'public', 'apps.manifest.json'),
    );
    cpSync(
      join(repoRoot, 'apps', 'shell', 'src', 'registry', 'apps.ts'),
      join(sandboxDir, 'apps', 'shell', 'src', 'registry', 'apps.ts'),
    );
    cpSync(
      join(
        repoRoot,
        'apps',
        'shell',
        'src',
        'locales',
        'langs',
        'en-US',
        'page.json',
      ),
      join(
        sandboxDir,
        'apps',
        'shell',
        'src',
        'locales',
        'langs',
        'en-US',
        'page.json',
      ),
    );
    cpSync(
      join(
        repoRoot,
        'apps',
        'shell',
        'src',
        'locales',
        'langs',
        'vi-VN',
        'page.json',
      ),
      join(
        sandboxDir,
        'apps',
        'shell',
        'src',
        'locales',
        'langs',
        'vi-VN',
        'page.json',
      ),
    );
    cpSync(join(repoRoot, 'package.json'), join(sandboxDir, 'package.json'));
  });

  afterEach(() => {
    rmSync(sandboxDir, { force: true, recursive: true });
  });

  it('scaffolds a complete valid micro-app in sandbox without touching real repository', () => {
    const scriptPath = resolve(repoRoot, 'scripts', 'gen-micro-app.mjs');

    execSync(`node "${scriptPath}" ${testAppName}`, {
      cwd: repoRoot,
      env: {
        ...process.env,
        OPERON_ROOT: sandboxDir,
      },
      stdio: 'pipe',
    });

    expect(existsSync(join(testAppDir, 'package.json'))).toBe(true);
    expect(existsSync(join(testAppDir, 'vite.config.ts'))).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'main.ts'))).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'bootstrap.ts'))).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'manifest.ts'))).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'remote-entry.ts'))).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'locales', 'index.ts'))).toBe(
      true,
    );
    expect(
      existsSync(
        join(
          testAppDir,
          'src',
          'locales',
          'langs',
          'en-US',
          `${testAppName}.json`,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          testAppDir,
          'src',
          'locales',
          'langs',
          'vi-VN',
          `${testAppName}.json`,
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(testAppDir, 'src', 'views', 'index.vue'))).toBe(
      true,
    );

    const pkg = JSON.parse(
      readFileSync(join(testAppDir, 'package.json'), 'utf8'),
    );
    expect(pkg.name).toBe(`@operon/${testAppName}`);
    expect(pkg.dependencies['@operon/kernel']).toBe('workspace:*');
    expect(pkg.dependencies['@operon/locales']).toBe('workspace:*');

    // Check shell route was created in sandbox
    expect(existsSync(shellRoutePath)).toBe(true);
  });
});
