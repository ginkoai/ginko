/**
 * @fileType: command-entry
 * @status: current
 * @updated: 2026-01-03
 * @tags: [sync, command, cloud-to-local, ADR-054, EPIC-008]
 * @related: [sync-command.ts, types.ts, node-syncer.ts, ../../lib/team-sync-reporter.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [commander]
 */

/**
 * Sync Command Entry Point (ADR-054, EPIC-008)
 *
 * Registers the `ginko sync` command for pulling dashboard edits to git.
 * Team-aware with enhanced feedback showing who changed what.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { syncCommand } from './sync-command.js';
import { pullCommand } from '../pull/pull-command.js';
import type { TeamSyncOptions, NodeType } from './types.js';

export function createSyncCommand(): Command {
  const sync = new Command('sync')
    .description('Pull dashboard knowledge edits to local git (deprecated: use `ginko pull`)')
    .option('--preview', 'Preview team changes without syncing')
    .option('--dry-run', 'Preview what files would be synced')
    .option('--force', 'Overwrite local files with graph versions')
    .option('--type <type>', 'Sync only specific node type (ADR, PRD, Pattern, Gotcha, Charter, Sprint)')
    .option('--no-commit', 'Sync files but do not commit')
    .option('--staleness-days <days>', 'Days threshold for staleness warning (default: 3)', '3')
    .option('--skip-team-check', 'Skip team membership verification');

  sync.action(async (options: Record<string, unknown>) => {
    // ADR-077: Deprecation warning
    console.log(chalk.yellow('\u26a0\ufe0f  `ginko sync` is deprecated. Use `ginko pull` instead.'));
    console.log(chalk.dim('   Migration: ginko sync → ginko pull'));
    console.log(chalk.dim('   Migration: ginko sync --type Sprint → ginko pull sprint'));
    console.log('');

    // Delegate to pull command
    await pullCommand({
      dryRun: options.dryRun === true,
      force: options.force === true,
      entityType: options.type as string | undefined,
    });
  });

  return sync;
}

export { syncCommand } from './sync-command.js';
export { findSprintFiles, syncSprintFile } from './sprint-syncer.js';
export {
  getTeamSyncStatus,
  updateLastSyncTimestamp,
  displayStalenessWarning,
} from './team-sync.js';
export {
  getTeamChangesSinceLast,
  displayTeamChangeReport,
  formatTeamChangeReport,
  formatCompactSummary,
} from '../../lib/team-sync-reporter.js';
export type {
  SyncOptions,
  SyncResult,
  UnsyncedNode,
  SprintSyncResult,
  TeamSyncOptions,
  TeamSyncStatus,
} from './types.js';
export type {
  MemberChangeSummary,
  TeamChangeSummary,
  TypeChange,
} from '../../lib/team-sync-reporter.js';
