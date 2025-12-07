/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, history, cli, epic-004-sprint5, task-15]
 * @related: [index.ts, list.ts, test.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, ora]
 */

/**
 * Notification History Command (EPIC-004 Sprint 5 TASK-15)
 *
 * Display recent notification delivery history from .ginko/notifications/history.jsonl
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { requireGinkoRoot } from '../../utils/ginko-root.js';

interface NotificationHistoryEntry {
  timestamp: string;
  hookId: string;
  eventType: string;
  status: 'sent' | 'failed';
  destination: string;
  error?: string;
  responseTime?: number;
}

interface HistoryOptions {
  limit?: string;
  status?: 'sent' | 'failed';
  hook?: string;
}

/**
 * Load notification history from .ginko/notifications/history.jsonl
 */
async function loadNotificationHistory(
  limit: number,
  statusFilter?: 'sent' | 'failed',
  hookFilter?: string
): Promise<NotificationHistoryEntry[]> {
  try {
    const projectRoot = await requireGinkoRoot();
    const historyPath = path.join(projectRoot, '.ginko', 'notifications', 'history.jsonl');

    const content = await fs.readFile(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    // Parse JSONL
    let entries: NotificationHistoryEntry[] = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is NotificationHistoryEntry => entry !== null);

    // Apply filters
    if (statusFilter) {
      entries = entries.filter(e => e.status === statusFilter);
    }
    if (hookFilter) {
      entries = entries.filter(e => e.hookId === hookFilter);
    }

    // Sort by timestamp (newest first) and limit
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries.slice(0, limit);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // History file doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Display notification delivery history
 */
export async function historyNotificationCommand(options: HistoryOptions): Promise<void> {
  const spinner = ora('Loading notification history...').start();

  try {
    const limit = parseInt(options.limit || '20', 10);
    const entries = await loadNotificationHistory(limit, options.status, options.hook);

    if (entries.length === 0) {
      spinner.info(chalk.yellow('No notification history found'));

      const filters: string[] = [];
      if (options.status) filters.push(`status: ${options.status}`);
      if (options.hook) filters.push(`hook: ${options.hook}`);

      if (filters.length > 0) {
        console.log(chalk.dim(`\nFilters applied: ${filters.join(', ')}`));
        console.log(chalk.dim('Try removing filters or check your configuration.'));
      } else {
        console.log(chalk.dim('\nNo notifications have been sent yet.'));
        console.log(chalk.dim(`Send a test: ${chalk.cyan('ginko notifications test <hookId>')}`));
      }
      console.log();
      return;
    }

    spinner.succeed(chalk.green(`Found ${entries.length} notification${entries.length > 1 ? 's' : ''}`));

    // Summary stats
    const sentCount = entries.filter(e => e.status === 'sent').length;
    const failedCount = entries.filter(e => e.status === 'failed').length;

    console.log(chalk.gray('\n' + '─'.repeat(80)));
    console.log(chalk.bold('Notification History'));
    console.log(chalk.dim(`  Showing ${entries.length} of last ${limit} notifications`));
    console.log(chalk.dim(`  ${chalk.green(`✓ ${sentCount} sent`)} | ${chalk.red(`✗ ${failedCount} failed`)}`));

    console.log(chalk.gray('─'.repeat(80)));

    // Display entries
    entries.forEach((entry, index) => {
      const statusIcon = entry.status === 'sent' ? chalk.green('✓') : chalk.red('✗');
      const timestamp = formatTimestamp(entry.timestamp);

      console.log(`\n${statusIcon} ${chalk.bold(entry.hookId)} ${chalk.dim('→')} ${chalk.cyan(entry.destination)}`);
      console.log(`   ${chalk.yellow(entry.eventType)} ${chalk.dim('•')} ${chalk.dim(timestamp)}`);

      if (entry.status === 'sent' && entry.responseTime) {
        console.log(`   ${chalk.dim('Response:')} ${chalk.green(entry.responseTime + 'ms')}`);
      }

      if (entry.status === 'failed' && entry.error) {
        console.log(`   ${chalk.dim('Error:')} ${chalk.red(entry.error)}`);
      }
    });

    console.log(chalk.gray('\n' + '─'.repeat(80)));

    // Filter hints
    console.log(chalk.dim('\nFilter options:'));
    if (!options.status) {
      console.log(chalk.dim(`  • Show only failures: ${chalk.cyan('ginko notifications history --status failed')}`));
      console.log(chalk.dim(`  • Show only successful: ${chalk.cyan('ginko notifications history --status sent')}`));
    }
    if (!options.hook) {
      console.log(chalk.dim(`  • Filter by hook: ${chalk.cyan('ginko notifications history --hook <hookId>')}`));
    }
    if (entries.length === limit) {
      console.log(chalk.dim(`  • Show more: ${chalk.cyan('ginko notifications history --limit 50')}`));
    }
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to load notification history'));

    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }

    process.exit(1);
  }
}
