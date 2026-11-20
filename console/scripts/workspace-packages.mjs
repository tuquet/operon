import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function workspacePackages(root = process.cwd()) {
  const packages = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some((entry) => entry.name === 'package.json')) {
      const manifest = JSON.parse(
        await readFile(join(directory, 'package.json'), 'utf8'),
      );
      packages.push({ directory, manifest });
      return;
    }
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        await visit(join(directory, entry.name));
      }
    }
  }
  for (const directory of ['apps', 'packages', 'internal', 'scripts']) {
    await visit(join(root, directory));
  }
  return packages;
}
