/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-20
 * @tags: [cli, migrate, status, epic-015, sprint-3]
 * @related: [status-migration.ts, ../graph/api-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk]
 */

/**
 * Migrate command with status subcommand
 * EPIC-015 Sprint 3: Status Migration
 *
 * Provides migration utilities for syncing data from markdown to graph.
 *
 * Usage:
 *   ginko migrate status              Migrate task statuses to graph
 *   ginko migrate status --dry-run    Preview changes without applying
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { runStatusMigration } from './status-migration.js';

/**
 * Create the migrate command with subcommands
 */
export function migrateCommand() {
  const migrate = new Command('migrate')
    .description('Migration utilities for syncing markdown to graph (EPIC-015)')
    .addHelpText('after', `
${chalk.gray('Subcommands:')}
  ${chalk.green('ginko migrate status')}              ${chalk.dim('Migrate task statuses from markdown to graph')}
  ${chalk.green('ginko migrate status --dry-run')}    ${chalk.dim('Preview changes without applying')}

${chalk.gray('How It Works:')}
  ${chalk.dim('1. Scans all sprint files in docs/sprints/SPRINT-*.md')}
  ${chalk.dim('2. Parses task checkboxes to determine status')}
  ${chalk.dim('3. Compares with current graph status')}
  ${chalk.dim('4. Updates graph with markdown status (unless --dry-run)')}

${chalk.gray('Checkbox Mapping:')}
  ${chalk.dim('[x] -> complete')}
  ${chalk.dim('[@] -> in_progress')}
  ${chalk.dim('[Z] -> not_started (paused)')}
  ${chalk.dim('[ ] -> not_started')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko migrate status --dry-run')}
  ${chalk.dim('# Output: Migration Plan: 47 tasks to update, 12 no change')}

  ${chalk.green('ginko migrate status')}
  ${chalk.dim('# Output: Migrating... Updated: 47, Errors: 0')}

  ${chalk.green('ginko migrate status --detail')}
  ${chalk.dim('# Shows individual task updates')}
`)
    .action(() => {
      migrate.help({ error: false });
    });

  // Status migration subcommand
  const statusCmd = migrate
    .command('status')
    .description('Migrate task statuses from sprint markdown files to graph')
    .option('--dry-run', 'Preview changes without applying them')
    .option('--detail', 'Show detailed output for each task')
    .action(async () => {
      const opts = statusCmd.opts();
      await runStatusMigration({
        dryRun: opts.dryRun,
        verbose: opts.detail,
      });
    });

  return migrate;
}

export default migrateCommand;
