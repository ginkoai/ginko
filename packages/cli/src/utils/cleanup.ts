/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-23
 * @tags: [cleanup, housekeeping, temp-files]
 * @related: [../commands/ship.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [fs/promises, path, ora, chalk]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import ora from 'ora';
import chalk from 'chalk';

/**
 * Clean up temporary files and artifacts
 *
 * Removes:
 * - .ginko/temp directory contents
 * - .ginko/cache directory contents
 * - All .tmp files in project root
 * - node_modules/.cache directory contents
 */
export async function cleanupTempFiles(): Promise<void> {
  const spinner = ora('Cleaning temp files...').start();

  try {
    const projectRoot = process.cwd();
    let cleaned = 0;

    // Clean .ginko/temp
    const tempDir = path.join(projectRoot, '.ginko', 'temp');
    try {
      const files = await fs.readdir(tempDir, { recursive: true });
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch {
          // Skip if file doesn't exist or can't be accessed
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }

    // Clean .ginko/cache
    const cacheDir = path.join(projectRoot, '.ginko', 'cache');
    try {
      const files = await fs.readdir(cacheDir, { recursive: true });
      for (const file of files) {
        const filePath = path.join(cacheDir, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch {
          // Skip if file doesn't exist or can't be accessed
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }

    // Clean *.tmp files in project root
    try {
      const files = await fs.readdir(projectRoot);
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          try {
            await fs.unlink(path.join(projectRoot, file));
            cleaned++;
          } catch {
            // Skip if can't delete
          }
        }
      }
    } catch {
      // Can't read directory, skip
    }

    // Clean node_modules/.cache
    const nmCacheDir = path.join(projectRoot, 'node_modules', '.cache');
    try {
      const files = await fs.readdir(nmCacheDir, { recursive: true });
      for (const file of files) {
        const filePath = path.join(nmCacheDir, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch {
          // Skip if file doesn't exist or can't be accessed
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }

    if (cleaned > 0) {
      spinner.succeed(`Cleaned ${cleaned} temp files`);
    } else {
      spinner.info('No temp files to clean');
    }
  } catch (error) {
    spinner.fail('Cleanup failed');
    console.log(chalk.dim(`     ${error}`));
  }
}
