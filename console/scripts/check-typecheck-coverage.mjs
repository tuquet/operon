import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { workspacePackages } from './workspace-packages.mjs';

const packages = await workspacePackages();
const missing = packages.filter(
  ({ directory, manifest }) =>
    (existsSync(join(directory, 'src')) ||
      existsSync(join(directory, 'tsconfig.json'))) &&
    !manifest.scripts?.typecheck,
);
if (missing.length > 0) {
  console.error(
    `Source packages without a typecheck task:\n${missing
      .map(({ directory }) => relative(process.cwd(), directory))
      .join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Typecheck coverage: ${packages.filter(({ manifest }) => manifest.scripts?.typecheck).length} source packages covered.`,
  );
}
