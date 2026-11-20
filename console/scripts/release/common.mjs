import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
export const writeJson = (path, value) =>
  writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`);
export const config = readJson('release/config.json');
export const product = readJson('release/version.json');
export const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
export const isMain = (url) =>
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url);

export function parseVersion(value) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/.exec(
      value,
    );
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split('.') ?? [],
  };
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i])
      return left.core[i] > right.core[i] ? 1 : -1;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return (
      Number(left.prerelease.length === 0) -
      Number(right.prerelease.length === 0)
    );
  }
  for (
    let i = 0;
    i < Math.max(left.prerelease.length, right.prerelease.length);
    i++
  ) {
    const x = left.prerelease[i];
    const y = right.prerelease[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn !== yn) return xn ? -1 : 1;
    return (xn ? Number(x) > Number(y) : x > y) ? 1 : -1;
  }
  return 0;
}

export function channelFor(version) {
  const { prerelease } = parseVersion(version);
  if (prerelease.length === 0) return 'stable';
  if (!['beta', 'nightly'].includes(prerelease[0]))
    throw new Error('Supported prereleases are beta and nightly');
  return prerelease[0];
}

export function channelUrl(channel) {
  if (!['beta', 'nightly', 'stable'].includes(channel))
    throw new Error('Invalid channel');
  return `https://raw.githubusercontent.com/${config.repository}/${config.stateBranch}/updates/${channel}/latest.json`;
}

export function syncVersion(version, { canonical = false } = {}) {
  parseVersion(version);
  for (const file of [
    'package.json',
    'apps/shell/package.json',
    'apps/shell/src-tauri/tauri.conf.json',
  ]) {
    writeJson(file, { ...readJson(file), version });
  }
  const cargoPath = resolve(root, 'apps/shell/src-tauri/Cargo.toml');
  writeFileSync(
    cargoPath,
    readFileSync(cargoPath, 'utf8').replace(
      /^(version = ")[^"]+("\r?$)/m,
      `$1${version}$2`,
    ),
  );
  const lockPath = resolve(root, 'apps/shell/src-tauri/Cargo.lock');
  const lock = readFileSync(lockPath, 'utf8');
  if (!/name = "workstation"\r?\nversion = "/.test(lock))
    throw new Error('workstation entry missing from Cargo.lock');
  writeFileSync(
    lockPath,
    lock.replace(
      /(name = "workstation"\r?\nversion = ")[^"]+("\r?$)/m,
      `$1${version}$2`,
    ),
  );
  if (canonical) writeJson('release/version.json', { ...product, version });
}

export function assertVersions() {
  parseVersion(product.version);
  const values = [
    'package.json',
    'apps/shell/package.json',
    'apps/shell/src-tauri/tauri.conf.json',
  ].map((file) => [file, readJson(file).version]);
  const cargo = readFileSync(
    resolve(root, 'apps/shell/src-tauri/Cargo.toml'),
    'utf8',
  ).match(/^version = "([^"]+)"/m)?.[1];
  const lock = readFileSync(
    resolve(root, 'apps/shell/src-tauri/Cargo.lock'),
    'utf8',
  ).match(/name = "workstation"\r?\nversion = "([^"]+)"/)?.[1];
  for (const [file, version] of [
    ...values,
    ['Cargo.toml', cargo],
    ['Cargo.lock', lock],
  ]) {
    if (version !== product.version)
      throw new Error(
        `${file} version ${version} differs from product ${product.version}`,
      );
  }
}
