import type { Package } from '@manypkg/get-packages';

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import * as manypkg from '@manypkg/get-packages';
const { getPackages: getPackagesFunc, getPackagesSync: getPackagesSyncFunc } =
  manypkg;

/**
 * Find monorepo root directory
 * @param cwd
 */
function findMonorepoRoot(cwd: string = process.cwd()) {
  let currentDir = resolve(cwd);

  while (true) {
    if (existsSync(join(currentDir, 'pnpm-lock.yaml'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return '';
    }

    currentDir = parentDir;
  }
}

/**
 * Get all packages in monorepo
 */
function getPackagesSync() {
  const root = findMonorepoRoot();
  return getPackagesSyncFunc(root);
}

/**
 * Get all packages in monorepo
 */
async function getPackages() {
  const root = findMonorepoRoot();

  return await getPackagesFunc(root);
}

/**
 * Get specified package in monorepo
 */
async function getPackage(pkgName: string) {
  const { packages } = await getPackages();
  return packages.find((pkg: Package) => pkg.packageJson.name === pkgName);
}

export { findMonorepoRoot, getPackage, getPackages, getPackagesSync };
