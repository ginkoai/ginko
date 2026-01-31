/**
 * @fileType: command-entry
 * @status: current
 * @updated: 2026-01-30
 * @tags: [push, command, git-to-graph, ADR-077]
 * @related: [push-command.ts, ../../lib/sync-state.ts, ../../lib/git-change-detector.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [commander]
 */

/**
 * Push Command Entry Point (ADR-077)
 *
 * Registers the `ginko push` command with subcommands for entity-specific push.
 * Replaces `ginko graph load` and `--sync` flags.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { pushCommand, type PushOptions } from './push-command.js';

export function createPushCommand(): Command {
  const push = new Command('push')
    .description('Push local changes to graph (ADR-077: git-integrated sync)')
    .option('--dry-run', 'Preview what would be pushed without making changes')
    .option('--force', 'Overwrite graph content even if conflicts exist')
    .option('--all', 'Push all content files (ignore change detection)')
    .option('--no-events', 'Skip pushing event files (JSONL)')
    .addHelpText('after', `
${chalk.gray('Subcommands:')}
  ${chalk.green('ginko push')}                     ${chalk.dim('Push all changes since last push')}
  ${chalk.green('ginko push epic')}                 ${chalk.dim('Push only changed epics')}
  ${chalk.green('ginko push epic EPIC-001')}        ${chalk.dim('Push specific epic')}
  ${chalk.green('ginko push sprint e001_s01')}      ${chalk.dim('Push specific sprint')}
  ${chalk.green('ginko push charter')}              ${chalk.dim('Push charter')}
  ${chalk.green('ginko push adr')}                  ${chalk.dim('Push all changed ADRs')}

${chalk.gray('Options:')}
  ${chalk.dim('--dry-run    Preview what would be pushed')}
  ${chalk.dim('--force      Overwrite graph even if conflicts')}
  ${chalk.dim('--all        Push all content (not just changes)')}
  ${chalk.dim('--no-events  Skip event files')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko push')} ${chalk.dim('# Push all changes since last push')}
  ${chalk.green('ginko push --dry-run')} ${chalk.dim('# Preview changes')}
  ${chalk.green('ginko push epic')} ${chalk.dim('# Push only epics')}
  ${chalk.green('ginko push sprint e015_s01')} ${chalk.dim('# Push specific sprint')}
  ${chalk.green('ginko push --all')} ${chalk.dim('# Full push (like graph load)')}
`);

  // Default action (no subcommand): push all changes
  push.action(async (options: Record<string, unknown>) => {
    await pushCommand({
      dryRun: options.dryRun === true,
      force: options.force === true,
      all: options.all === true,
      events: options.events !== false,
    });
  });

  // Subcommand: push epic [id]
  push
    .command('epic [epicId]')
    .description('Push changed epic(s) to graph')
    .option('--dry-run', 'Preview what would be pushed')
    .option('--force', 'Overwrite graph content')
    .action(async (epicId: string | undefined, subOptions: Record<string, unknown>) => {
      await pushCommand({
        entityType: 'epic',
        entityId: epicId,
        dryRun: subOptions.dryRun === true || push.opts().dryRun === true,
        force: subOptions.force === true || push.opts().force === true,
        events: false,
      });
    });

  // Subcommand: push sprint [id]
  push
    .command('sprint [sprintId]')
    .description('Push changed sprint(s) to graph')
    .option('--dry-run', 'Preview what would be pushed')
    .option('--force', 'Overwrite graph content')
    .action(async (sprintId: string | undefined, subOptions: Record<string, unknown>) => {
      await pushCommand({
        entityType: 'sprint',
        entityId: sprintId,
        dryRun: subOptions.dryRun === true || push.opts().dryRun === true,
        force: subOptions.force === true || push.opts().force === true,
        events: false,
      });
    });

  // Subcommand: push charter
  push
    .command('charter')
    .description('Push project charter to graph')
    .option('--dry-run', 'Preview what would be pushed')
    .option('--force', 'Overwrite graph content')
    .action(async (subOptions: Record<string, unknown>) => {
      await pushCommand({
        entityType: 'charter',
        dryRun: subOptions.dryRun === true || push.opts().dryRun === true,
        force: subOptions.force === true || push.opts().force === true,
        events: false,
      });
    });

  // Subcommand: push adr [id]
  push
    .command('adr [adrId]')
    .description('Push changed ADR(s) to graph')
    .option('--dry-run', 'Preview what would be pushed')
    .option('--force', 'Overwrite graph content')
    .action(async (adrId: string | undefined, subOptions: Record<string, unknown>) => {
      await pushCommand({
        entityType: 'adr',
        entityId: adrId,
        dryRun: subOptions.dryRun === true || push.opts().dryRun === true,
        force: subOptions.force === true || push.opts().force === true,
        events: false,
      });
    });

  return push;
}

export { pushCommand } from './push-command.js';
export type { PushOptions, PushResult } from './push-command.js';
