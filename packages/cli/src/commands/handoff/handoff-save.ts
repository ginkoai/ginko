/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-20
 * @tags: [handoff, session-logging, adr-033, adr-036, housekeeping]
 * @related: [./index.ts, ../../core/session-log-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs/promises, path, chalk, simple-git]
 */

import { SessionLogManager } from '../../core/session-log-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import ora from 'ora';

/**
 * Housekeeping options for handoff
 */
export interface HandoffOptions {
  message?: string;
  clean?: boolean;      // Clean temp files
  commit?: boolean;     // Commit staged changes
  noClean?: boolean;    // Skip cleanup
  noCommit?: boolean;   // Skip commit
}

/**
 * Save session log as handoff with optional housekeeping (ADR-036)
 *
 * Handoff is OPTIONAL - provides logical boundary marking + cleanup
 * Not required for session resumption (ginko start handles that)
 */
export async function saveSessionLogAsHandoff(
  userDir: string,
  messageOrOptions?: string | HandoffOptions
): Promise<void> {
  // Parse options
  const options: HandoffOptions = typeof messageOrOptions === 'string'
    ? { message: messageOrOptions }
    : messageOrOptions || {};

  const spinner = ora('Archiving session log...').start();

  const sessionLogPath = path.join(userDir, 'current-session-log.md');
  const archiveDir = path.join(userDir, 'archive');

  // Read session log
  const logContent = await fs.readFile(sessionLogPath, 'utf-8');

  // Append session-end event if message provided
  let finalContent = logContent;
  if (options.message) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const sessionEndEvent = `
### ${timestamp} - [achievement]
Session handoff: ${options.message}
Impact: high
`;

    // Append to Timeline and Achievements
    const timelineIndex = finalContent.indexOf('## Timeline');
    if (timelineIndex !== -1) {
      const nextSectionIndex = finalContent.indexOf('\n## ', timelineIndex + 11);
      const insertPoint = nextSectionIndex === -1 ? finalContent.length : nextSectionIndex;

      finalContent =
        finalContent.slice(0, insertPoint) +
        sessionEndEvent +
        (nextSectionIndex === -1 ? '' : '\n' + finalContent.slice(insertPoint));
    }
  }

  // Create archive directory if needed
  await fs.mkdir(archiveDir, { recursive: true });

  // Generate archive filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');
  const archivePath = path.join(archiveDir, `${timestamp}-handoff.md`);

  // Save to archive
  await fs.writeFile(archivePath, finalContent, 'utf-8');

  // Note: Session log remains for next 'ginko start' to synthesize from (ADR-033, ADR-036)
  // It will be archived by 'ginko start', not here

  // Get statistics for display
  const stats = SessionLogManager.getSummary(finalContent);

  spinner.succeed('Session archived');

  console.log(chalk.green(`  ✅ Handoff saved: ${path.relative(process.cwd(), archivePath)}`));
  console.log(chalk.cyan(`  📊 Session captured:`));
  console.log(chalk.gray(`     - ${stats.totalEntries} events logged`));
  console.log(chalk.gray(`     - ${stats.byCategory.decision || 0} key decisions`));
  console.log(chalk.gray(`     - ${stats.byCategory.insight || 0} insights discovered`));
  console.log(chalk.gray(`     - ${stats.filesAffected} files affected`));
  console.log();

  // Optional housekeeping tasks (ADR-036)
  const shouldClean = options.clean || (!options.noClean && stats.totalEntries > 5);
  const shouldCommit = options.commit && !options.noCommit;

  if (shouldClean) {
    await performCleanup();
  }

  if (shouldCommit) {
    await performCommit(options.message || 'Session handoff');
  }

  console.log(chalk.cyan('  💡 Next: Run `ginko start` anytime to resume'));
  console.log(chalk.gray('     Context synthesis happens automatically - no handoff required'));
  console.log();
}

/**
 * Clean up temporary files and artifacts
 */
async function performCleanup(): Promise<void> {
  const spinner = ora('Cleaning temp files...').start();

  try {
    const projectRoot = process.cwd();
    const tempPatterns = [
      '.ginko/temp/**/*',
      '.ginko/cache/**/*',
      '**/*.tmp',
      '**/node_modules/.cache/**/*'
    ];

    let cleaned = 0;

    for (const pattern of tempPatterns) {
      try {
        const globPath = path.join(projectRoot, pattern);
        // Simple check - just look for .ginko/temp
        const tempDir = path.join(projectRoot, '.ginko', 'temp');
        try {
          const files = await fs.readdir(tempDir);
          for (const file of files) {
            await fs.unlink(path.join(tempDir, file));
            cleaned++;
          }
        } catch {
          // Directory doesn't exist, skip
        }
      } catch {
        // Pattern not found, skip
      }
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

/**
 * Commit staged changes with handoff message
 */
async function performCommit(message: string): Promise<void> {
  const spinner = ora('Committing changes...').start();

  try {
    const git = simpleGit();
    const status = await git.status();

    if (status.files.length === 0) {
      spinner.info('No changes to commit');
      return;
    }

    // Only commit staged files
    if (status.staged.length === 0) {
      spinner.warn('No staged files - use git add first');
      return;
    }

    const commitMessage = `Session handoff: ${message}

🤖 Generated with [Ginko CLI](https://github.com/anthropics/ginko)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    await git.commit(commitMessage);
    spinner.succeed(`Committed ${status.staged.length} files`);

  } catch (error) {
    spinner.fail('Commit failed');
    console.log(chalk.dim(`     ${error}`));
  }
}
