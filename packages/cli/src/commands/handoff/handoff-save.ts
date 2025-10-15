/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-04
 * @tags: [handoff, session-logging, adr-033, deterministic-save]
 * @related: [./index.ts, ../../core/session-log-manager.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs/promises, path, chalk]
 */

import { SessionLogManager } from '../../core/session-log-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Save session log as handoff (deterministic, no AI needed)
 * Implements ADR-033 quality inversion: save raw log, synthesize later
 */
export async function saveSessionLogAsHandoff(userDir: string, message?: string): Promise<void> {
  console.log(chalk.cyan('📋 Saving session log as handoff...'));

  const sessionLogPath = path.join(userDir, 'current-session-log.md');
  const archiveDir = path.join(userDir, 'archive');

  // Read session log
  const logContent = await fs.readFile(sessionLogPath, 'utf-8');

  // Append session-end event if message provided
  let finalContent = logContent;
  if (message) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const sessionEndEvent = `
### ${timestamp} - [session-end]
Session ended via handoff: ${message}
Impact: high
`;

    // Append to Timeline section
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

  // Get statistics for display
  const stats = SessionLogManager.getSummary(finalContent);

  console.log(chalk.green(`  ✅ Handoff saved: ${path.relative(process.cwd(), archivePath)}`));
  console.log(chalk.cyan(`  📊 Session captured:`));
  console.log(chalk.gray(`     - ${stats.totalEntries} events logged`));
  console.log(chalk.gray(`     - ${stats.byCategory.decision || 0} key decisions`));
  console.log(chalk.gray(`     - ${stats.byCategory.insight || 0} insights discovered`));
  console.log(chalk.gray(`     - ${stats.filesAffected} files affected`));
  console.log();
  console.log(chalk.cyan('  💡 Next: Run `ginko start` to resume (synthesis happens then)'));
  console.log(chalk.gray('     High-quality summary will be generated at optimal context pressure'));
}
