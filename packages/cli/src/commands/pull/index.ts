/**
 * @fileType: command-entry
 * @status: current
 * @updated: 2026-01-30
 * @tags: [pull, command, graph-to-local, ADR-077]
 * @related: [pull-command.ts, ../sync/sync-command.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [commander]
 */

/**
 * Pull Command Entry Point (ADR-077)
 *
 * Registers the `ginko pull` command with subcommands for entity-specific pull.
 * Replaces `ginko sync` with a git-inspired interface.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { pullCommand, type PullOptions } from './pull-command.js';

export function createPullCommand(): Command {
  const pull = new Command('pull')
    .description('Pull dashboard changes to local git (ADR-077: git-integrated sync)')
    .option('--dry-run', 'Preview what would be pulled without making changes')
    .option('--force', 'Overwrite local files with graph versions')
    .addHelpText('after', `
${chalk.gray('Subcommands:')}
  ${chalk.green('ginko pull')}                     ${chalk.dim('Pull all changes from graph')}
  ${chalk.green('ginko pull sprint')}              ${chalk.dim('Pull only sprint changes')}
  ${chalk.green('ginko pull adr')}                 ${chalk.dim('Pull only ADR changes')}

${chalk.gray('Options:')}
  ${chalk.dim('--dry-run    Preview what would be pulled')}
  ${chalk.dim('--force      Overwrite local files with graph versions')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko pull')} ${chalk.dim('# Pull all changes from dashboard')}
  ${chalk.green('ginko pull --dry-run')} ${chalk.dim('# Preview changes')}
  ${chalk.green('ginko pull sprint')} ${chalk.dim('# Pull only sprint changes')}
  ${chalk.green('ginko pull --force')} ${chalk.dim('# Overwrite local with graph')}
`);

  // Default action: pull all changes
  pull.action(async (options: Record<string, unknown>) => {
    await pullCommand({
      dryRun: options.dryRun === true,
      force: options.force === true,
    });
  });

  // Subcommand: pull sprint
  pull
    .command('sprint')
    .description('Pull sprint changes from graph')
    .option('--dry-run', 'Preview what would be pulled')
    .option('--force', 'Overwrite local files')
    .action(async (subOptions: Record<string, unknown>) => {
      await pullCommand({
        entityType: 'sprint',
        dryRun: subOptions.dryRun === true || pull.opts().dryRun === true,
        force: subOptions.force === true || pull.opts().force === true,
      });
    });

  // Subcommand: pull adr
  pull
    .command('adr')
    .description('Pull ADR changes from graph')
    .option('--dry-run', 'Preview what would be pulled')
    .option('--force', 'Overwrite local files')
    .action(async (subOptions: Record<string, unknown>) => {
      await pullCommand({
        entityType: 'adr',
        dryRun: subOptions.dryRun === true || pull.opts().dryRun === true,
        force: subOptions.force === true || pull.opts().force === true,
      });
    });

  // Subcommand: pull epic
  pull
    .command('epic')
    .description('Pull epic changes from graph')
    .option('--dry-run', 'Preview what would be pulled')
    .option('--force', 'Overwrite local files')
    .action(async (subOptions: Record<string, unknown>) => {
      await pullCommand({
        entityType: 'epic',
        dryRun: subOptions.dryRun === true || pull.opts().dryRun === true,
        force: subOptions.force === true || pull.opts().force === true,
      });
    });

  return pull;
}

export { pullCommand } from './pull-command.js';
export type { PullOptions } from './pull-command.js';
