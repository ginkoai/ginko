/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [dead-letter-queue, dlq, cli-command, epic-004]
 * @related: [../lib/dead-letter-queue.ts, log.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander]
 */

import { Command } from 'commander';
import {
  getDeadLetterEntries,
  getDeadLetterEntry,
  retryDeadLetter,
  autoRetryDeadLetters,
  getDeadLetterStats,
  cleanupDeadLetters
} from '../lib/dead-letter-queue.js';

/**
 * ginko dlq - Dead Letter Queue management
 *
 * Commands:
 * - ginko dlq list [--status=pending]
 * - ginko dlq show <id>
 * - ginko dlq retry <id>
 * - ginko dlq retry-all
 * - ginko dlq stats
 * - ginko dlq cleanup [--days=30]
 */
export const dlqCommand = new Command('dlq')
  .description('Manage Dead Letter Queue (failed events)')
  .addCommand(
    new Command('list')
      .description('List DLQ entries')
      .option('-s, --status <status>', 'Filter by status (pending|retrying|resolved|abandoned)')
      .option('-l, --limit <number>', 'Limit number of results', '20')
      .action(async (options) => {
        try {
          const status = options.status as 'pending' | 'retrying' | 'resolved' | 'abandoned' | undefined;
          const limit = parseInt(options.limit, 10);

          const entries = await getDeadLetterEntries(status);
          const displayEntries = entries.slice(0, limit);

          if (displayEntries.length === 0) {
            console.log('No DLQ entries found.');
            return;
          }

          console.log(`\nDead Letter Queue Entries (${displayEntries.length}/${entries.length}):\n`);

          for (const entry of displayEntries) {
            const age = Math.floor((Date.now() - entry.failedAt.getTime()) / 1000 / 60);
            const ageStr = age < 60 ? `${age}m` : `${Math.floor(age / 60)}h`;

            console.log(`  ${entry.id}`);
            console.log(`    Status:   ${entry.status}`);
            console.log(`    Event:    ${entry.originalEvent.id}`);
            console.log(`    Failed:   ${ageStr} ago (${entry.retryCount} retries)`);
            console.log(`    Reason:   ${entry.failureReason.split('\n')[0]}`);
            console.log('');
          }

          if (entries.length > limit) {
            console.log(`  ... and ${entries.length - limit} more entries`);
          }
        } catch (error) {
          console.error('Error listing DLQ entries:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show details of a specific DLQ entry')
      .argument('<id>', 'DLQ entry ID')
      .action(async (id) => {
        try {
          const entry = await getDeadLetterEntry(id);

          if (!entry) {
            console.error(`DLQ entry not found: ${id}`);
            process.exit(1);
          }

          console.log(`\nDLQ Entry: ${entry.id}\n`);
          console.log(`Status:        ${entry.status}`);
          console.log(`Failed At:     ${entry.failedAt.toISOString()}`);
          console.log(`Retry Count:   ${entry.retryCount}`);
          if (entry.lastRetryAt) {
            console.log(`Last Retry:    ${entry.lastRetryAt.toISOString()}`);
          }
          console.log(`\nFailure Reason:`);
          console.log(entry.failureReason.split('\n').map(line => `  ${line}`).join('\n'));
          console.log(`\nOriginal Event:`);
          console.log(`  ID:          ${entry.originalEvent.id}`);
          console.log(`  Category:    ${entry.originalEvent.category}`);
          console.log(`  Description: ${entry.originalEvent.description}`);
          console.log(`  Timestamp:   ${entry.originalEvent.timestamp}`);
        } catch (error) {
          console.error('Error showing DLQ entry:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('retry')
      .description('Retry a specific DLQ entry')
      .argument('<id>', 'DLQ entry ID')
      .action(async (id) => {
        try {
          console.log(`Retrying DLQ entry: ${id}...`);

          const result = await retryDeadLetter(id);

          if (result.success) {
            console.log(`✓ Entry ${id} successfully retried and resolved`);
          } else {
            console.error(`✗ Retry failed: ${result.error}`);
            console.error(`  Status: ${result.entry.status}`);
            process.exit(1);
          }
        } catch (error) {
          console.error('Error retrying DLQ entry:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('retry-all')
      .description('Auto-retry all eligible pending entries')
      .action(async () => {
        try {
          console.log('Auto-retrying eligible DLQ entries...');

          const retriedCount = await autoRetryDeadLetters();

          if (retriedCount === 0) {
            console.log('No entries eligible for retry at this time.');
          } else {
            console.log(`✓ Successfully retried ${retriedCount} entries`);
          }
        } catch (error) {
          console.error('Error auto-retrying DLQ entries:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('stats')
      .description('Show DLQ statistics')
      .action(async () => {
        try {
          const stats = await getDeadLetterStats();

          console.log('\nDead Letter Queue Statistics:\n');
          console.log(`  Total:     ${stats.total}`);
          console.log(`  Pending:   ${stats.pending}`);
          console.log(`  Retrying:  ${stats.retrying}`);
          console.log(`  Resolved:  ${stats.resolved}`);
          console.log(`  Abandoned: ${stats.abandoned}`);

          if (stats.oldestPending) {
            const age = Math.floor((Date.now() - stats.oldestPending.getTime()) / 1000 / 60);
            const ageStr = age < 60 ? `${age} minutes` : `${Math.floor(age / 60)} hours`;
            console.log(`\n  Oldest pending: ${ageStr} ago`);
          }

          console.log('');
        } catch (error) {
          console.error('Error getting DLQ stats:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('cleanup')
      .description('Clean up old resolved/abandoned entries')
      .option('-d, --days <number>', 'Delete entries older than N days', '30')
      .action(async (options) => {
        try {
          const days = parseInt(options.days, 10);

          console.log(`Cleaning up DLQ entries older than ${days} days...`);

          const deletedCount = await cleanupDeadLetters(days);

          if (deletedCount === 0) {
            console.log('No old entries to clean up.');
          } else {
            console.log(`✓ Deleted ${deletedCount} old entries`);
          }
        } catch (error) {
          console.error('Error cleaning up DLQ:', error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })
  );
