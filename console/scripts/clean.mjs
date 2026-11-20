import { promises as fs } from 'node:fs';
import { join, normalize } from 'node:path';

const rootDir = process.cwd();

// Control concurrency to avoid creating too many parallel tasks
const CONCURRENCY_LIMIT = 10;

// Directories to skip during cleanup
const SKIP_DIRS = new Set(['.DS_Store', '.git', '.idea', '.vscode']);

/**
 * Process individual file or directory item
 * @param {string} currentDir - Current directory path
 * @param {string} item - File or directory name
 * @param {string[]} targets - List of targets to delete
 * @param {number} _depth - Current recursion depth
 * @returns {Promise<boolean>} - Whether further recursion is needed
 */
async function processItem(currentDir, item, targets, _depth) {
  // Skip special directories
  if (SKIP_DIRS.has(item)) {
    return false;
  }

  try {
    const itemPath = normalize(join(currentDir, item));

    if (targets.includes(item)) {
      // Delete directly when matching target directory or file
      await fs.rm(itemPath, { force: true, recursive: true });
      console.log(`✅ Deleted: ${itemPath}`);
      return false; // Deleted, no recursion needed
    }

    // Use readdir withFileTypes option to avoid extra lstat calls
    return true; // May need recursion, decided by caller
  } catch (error) {
    // More detailed error info
    if (error.code === 'ENOENT') {
      // File does not exist, may have been deleted already (expected)
      return false;
    } else if (error.code === 'EPERM' || error.code === 'EACCES') {
      console.error(`❌ Permission denied: ${item} in ${currentDir}`);
    } else {
      console.error(
        `❌ Error handling item ${item} in ${currentDir}: ${error.message}`,
      );
    }
    return false;
  }
}

/**
 * Recursively find and delete target directories (concurrency-optimized version)
 * @param {string} currentDir - Current traversed directory path
 * @param {string[]} targets - List of targets to delete
 * @param {number} depth - Current recursion depth to avoid exceeding limit
 */
async function cleanTargetsRecursively(currentDir, targets, depth = 0) {
  // Limit recursion depth to avoid infinite recursion
  if (depth > 10) {
    console.warn(`Max recursion depth reached at: ${currentDir}`);
    return;
  }

  let dirents;
  try {
    // Use withFileTypes option to fetch file types at once, avoiding subsequent lstat calls
    dirents = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    // If directory cannot be read, it may be deleted or permissions insufficient
    console.warn(`Cannot read directory ${currentDir}: ${error.message}`);
    return;
  }

  // Process in batches to control concurrency
  for (let i = 0; i < dirents.length; i += CONCURRENCY_LIMIT) {
    const batch = dirents.slice(i, i + CONCURRENCY_LIMIT);

    const tasks = batch.map(async (dirent) => {
      const item = dirent.name;
      const shouldRecurse = await processItem(currentDir, item, targets, depth);

      // If directory and not deleted, process recursively
      if (shouldRecurse && dirent.isDirectory()) {
        const itemPath = normalize(join(currentDir, item));
        return cleanTargetsRecursively(itemPath, targets, depth + 1);
      }

      return null;
    });

    // Execute current batch tasks concurrently
    const results = await Promise.allSettled(tasks);

    // Check for failed tasks (optional: for debugging)
    const failedTasks = results.filter(
      (result) => result.status === 'rejected',
    );
    if (failedTasks.length > 0) {
      console.warn(
        `${failedTasks.length} tasks failed in batch starting at index ${i} in directory: ${currentDir}`,
      );
    }
  }
}

(async function startCleanup() {
  // Directory and file names to delete
  const targets = ['node_modules', 'dist', '.turbo', 'dist.zip'];
  const deleteLockFile = process.argv.includes('--del-lock');
  const cleanupTargets = [...targets];

  if (deleteLockFile) {
    cleanupTargets.push('pnpm-lock.yaml');
  }

  console.log(
    `🚀 Starting cleanup of targets: ${cleanupTargets.join(', ')} from root: ${rootDir}`,
  );

  const startTime = Date.now();

  try {
    // Count number of targets to delete first
    console.log('📊 Scanning for cleanup targets...');

    await cleanTargetsRecursively(rootDir, cleanupTargets);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `✨ Cleanup process completed successfully in ${duration.toFixed(2)}s`,
    );
  } catch (error) {
    console.error(`💥 Unexpected error during cleanup: ${error.message}`);
    process.exit(1);
  }
})();
