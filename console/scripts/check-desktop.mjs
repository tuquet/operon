import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const subsystem = JSON.parse(
  readFileSync(new URL('../subsystem.json', import.meta.url), 'utf8'),
);
const directory = resolve(
  fileURLToPath(new URL('..', import.meta.url)),
  subsystem.path,
);

try {
  for (const executable of ['rustc', 'cargo'])
    execFileSync(executable, ['--version'], { stdio: 'pipe' });
  if (!existsSync(resolve(directory, 'crates/cli/Cargo.toml')))
    throw new Error(
      `Missing subsystem at ${directory}. Clone ${subsystem.repository} there.`,
    );
  const revision = execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  if (revision !== subsystem.revision)
    throw new Error(
      `Subsystem revision is ${revision}; expected ${subsystem.revision}. Checkout the pinned revision before building.`,
    );
  const changes = execFileSync(
    'git',
    ['-C', directory, 'status', '--porcelain'],
    { encoding: 'utf8' },
  ).trim();
  if (changes)
    throw new Error(
      'Subsystem has local changes. Use a clean checkout for a reproducible desktop build.',
    );
  console.log(`Desktop prerequisites passed (${revision}).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
