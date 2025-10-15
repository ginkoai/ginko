/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-15
 * @tags: [session-logging, defensive-logging, adr-033]
 * @related: [../core/session-log-manager.ts, start/start-reflection.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk, commander, session-log-manager]
 */

import chalk from 'chalk';
import { SessionLogManager, LogCategory, LogImpact, LogEntry } from '../core/session-log-manager.js';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';
import * as path from 'path';

interface LogOptions {
  files?: string;
  impact?: string;
  category?: string;
}

/**
 * Log an event to the current session
 * Part of ADR-033 defensive logging strategy
 */
export async function logCommand(description: string, options: LogOptions): Promise<void> {
  try {
    // Get session directory
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // Check if session log exists
    const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
    if (!hasLog) {
      console.error(chalk.red('❌ No active session log found.'));
      console.error(chalk.dim('   Run `ginko start` first to create a session.'));
      process.exit(1);
    }

    // Parse and validate category
    const category = (options.category || 'feature') as LogCategory;
    const validCategories: LogCategory[] = ['fix', 'feature', 'decision', 'insight', 'git', 'achievement'];
    if (!validCategories.includes(category)) {
      console.error(chalk.red(`❌ Invalid category: ${category}`));
      console.error(chalk.dim(`   Valid categories: ${validCategories.join(', ')}`));
      process.exit(1);
    }

    // Parse and validate impact
    const impact = (options.impact || 'medium') as LogImpact;
    const validImpacts: LogImpact[] = ['high', 'medium', 'low'];
    if (!validImpacts.includes(impact)) {
      console.error(chalk.red(`❌ Invalid impact: ${impact}`));
      console.error(chalk.dim(`   Valid impacts: ${validImpacts.join(', ')}`));
      process.exit(1);
    }

    // Parse files if provided
    const files = options.files ? options.files.split(',').map(f => f.trim()) : undefined;

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      description,
      files,
      impact
    };

    // Append to session log
    await SessionLogManager.appendEntry(sessionDir, entry);

    console.log(chalk.green(`✓ Logged ${category} event`));
    if (files && files.length > 0) {
      console.log(chalk.dim(`  Files: ${files.join(', ')}`));
    }
    console.log(chalk.dim(`  Impact: ${impact}`));

  } catch (error) {
    console.error(chalk.red('Error logging event:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Show examples of logging events
 */
export function logExamples(): void {
  console.log(chalk.cyan('\nSession Logging Examples:\n'));
  console.log(chalk.white('# Log a bug fix'));
  console.log(chalk.dim('  ginko log "Fixed authentication timeout" --category=fix --impact=high --files=src/auth.ts:42\n'));

  console.log(chalk.white('# Log a decision'));
  console.log(chalk.dim('  ginko log "Chose JWT over sessions for better scalability" --category=decision --impact=high\n'));

  console.log(chalk.white('# Log an insight'));
  console.log(chalk.dim('  ginko log "Bcrypt rounds 10-11 optimal for performance" --category=insight\n'));

  console.log(chalk.white('# Log a git operation'));
  console.log(chalk.dim('  ginko log "Committed Phase 3 implementation" --category=git --impact=medium\n'));

  console.log(chalk.white('# Log an achievement'));
  console.log(chalk.dim('  ginko log "All tests passing" --category=achievement --impact=high\n'));

  console.log(chalk.cyan('Categories:'));
  console.log(chalk.dim('  fix         - Bug fixes and error resolution'));
  console.log(chalk.dim('  feature     - New functionality (default)'));
  console.log(chalk.dim('  decision    - Key architectural or design decisions'));
  console.log(chalk.dim('  insight     - Patterns, gotchas, learnings discovered'));
  console.log(chalk.dim('  git         - Git operations and version control'));
  console.log(chalk.dim('  achievement - Milestones and completions\n'));
}
