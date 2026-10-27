import type { CAC } from 'cac';

import { availableParallelism, freemem } from 'node:os';

import { colors, execa } from '@operon/node-utils';

interface LintCommandOptions {
  /**
   * Format lint problem.
   */
  format?: boolean;
  /**
   * Number of threads for oxfmt and oxlint (default: 2).
   */
  threads?: number;
}

/**
 * CPU logical core threshold: 4 cores.
 * - Below or equal: treated as low-spec machine, commands run serially to avoid resource spikes.
 */
const CPU_CORE_THRESHOLD = 4;

/**
 * Available memory threshold: 8 GB.
 * Only when free and available memory exceed thresholds,
 * default threads for oxfmt / oxlint increase to 4, otherwise 2.
 */
const FREE_MEMORY_THRESHOLD = 8 * 1024 ** 3;

/**
 * Single command: executable filename + arguments array.
 *
 * execa v10 removed execaCommand; the first argument of execa(file, args?, options?) is
 * the executable filename rather than the full command line, running without shell by default. Using [file, args] arrays
 * avoids shell escaping and ensures consistent cross-platform behavior.
 */
type Command = [file: string, args: string[]];

/** Execute a single command. */
function runCommand([file, args]: Command) {
  return execa(file, args, { stdio: 'inherit' });
}

/** Convert command to human-readable string for failure display. */
function formatCommand([file, args]: Command) {
  return [file, ...args].join(' ');
}

/**
 * Unified lint failure error.
 * Lists all failed commands and displays fix suggestions.
 */
class LintError extends Error {
  constructor(failed: Command[]) {
    super(
      `Lint failed:\n${failed
        .map((command) => `  - ${formatCommand(command)}`)
        .join(
          '\n',
        )}\n\nRun ${colors.cyan('vsh lint --format')} to automatically fix.`,
    );
    this.name = 'LintError';
  }
}

/**
 * Execute all commands serially: one process at a time.
 * Ensures all tool errors are visible (friendlier to low-spec machines).
 */
async function runSerial(commands: Command[]) {
  const failed: Command[] = [];

  for (const command of commands) {
    try {
      await runCommand(command);
    } catch {
      failed.push(command);
    }
  }

  if (failed.length > 0) {
    throw new LintError(failed);
  }
}

/**
 * Execute all commands in parallel: start all processes concurrently.
 * Await all completions then summarize failed commands, consistent with serial output.
 */
async function runParallel(commands: Command[]) {
  const subprocesses = commands.map((command) => runCommand(command));

  const results = await Promise.allSettled(subprocesses);

  // Summarize all failed commands, consistent with serial mode error output
  const failed: Command[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      failed.push(commands[index]);
    }
  });

  if (failed.length > 0) {
    throw new LintError(failed);
  }
}

async function runLint({ format, threads }: LintCommandOptions) {
  // process.env.FORCE_COLOR = '3';
  const cpuCores = availableParallelism();

  // When CPU cores and available memory are sufficient, default threads increase to 4, otherwise 2;
  // explicit --threads flag takes precedence.
  const defaultThreads =
    cpuCores > CPU_CORE_THRESHOLD && freemem() > FREE_MEMORY_THRESHOLD ? 4 : 2;
  const threadsArg = `--threads=${threads || defaultThreads}`;

  if (format) {
    await runSerial([
      ['oxlint', ['--fix', '--type-aware', threadsArg]],
      ['oxfmt', [threadsArg]],
      ['eslint', ['.', '--cache', '--fix']],
      ['stylelint', ['**/*.{vue,css,less,scss}', '--cache', '--fix']],
    ]);
    return;
  }

  const commands: Command[] = [
    ['oxlint', ['--type-aware', threadsArg]],
    ['oxfmt', ['--check', threadsArg]],
    ['eslint', ['.', '--cache']],
    ['stylelint', ['**/*.{vue,css,less,scss}', '--cache']],
  ];

  // Low-spec machines (fewer CPU cores) run serially to avoid spikes;
  // high-spec machines run in parallel to shorten total duration.
  await (cpuCores <= CPU_CORE_THRESHOLD
    ? runSerial(commands)
    : runParallel(commands));
}

function defineLintCommand(cac: CAC) {
  cac
    .command('lint')
    .usage('Batch execute project lint check.')
    .option('--format', 'Format lint problem.')
    .option('--threads <count>', 'Number of threads for oxfmt and oxlint.')
    .action(runLint);
}

export { defineLintCommand, LintError };
