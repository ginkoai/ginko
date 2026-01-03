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
import { syncCommand } from './sync-command.js';
import type { TeamSyncOptions, NodeType } from './types.js';

export function createSyncCommand(): Command {
  const sync = new Command('sync')
    .description('Pull dashboard knowledge edits to local git (ADR-054, EPIC-008)')
    .option('--preview', 'Preview team changes without syncing')
    .option('--dry-run', 'Preview what files would be synced')
    .option('--force', 'Overwrite local files with graph versions')
    .option('--type <type>', 'Sync only specific node type (ADR, PRD, Pattern, Gotcha, Charter, Sprint)')
    .option('--no-commit', 'Sync files but do not commit')
    .option('--staleness-days <days>', 'Days threshold for staleness warning (default: 3)', '3')
    .option('--skip-team-check', 'Skip team membership verification');

  sync.action(async (options: Record<string, unknown>) => {
    const syncOptions: TeamSyncOptions = {
      dryRun: options.dryRun === true,
      force: options.force === true,
      type: options.type as NodeType | undefined,
      interactive: true,
      stalenessThresholdDays: parseInt(options.stalenessDays as string, 10) || 3,
      skipMembershipCheck: options.skipTeamCheck === true,
      preview: options.preview === true,
    };

    await syncCommand(syncOptions);
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
