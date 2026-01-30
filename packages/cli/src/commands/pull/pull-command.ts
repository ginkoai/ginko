/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-30
 * @tags: [pull, sync, graph-to-local, ADR-077]
 * @related: [index.ts, ../sync/sync-command.ts, ../../lib/sync-state.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk]
 */

/**
 * Pull Command (ADR-077)
 *
 * Wraps existing sync logic from sync-command.ts with a git-inspired interface.
 * Pulls dashboard edits from graph to local git.
 *
 * Usage:
 *   ginko pull                     # Pull all changes
 *   ginko pull epic                # Pull only epics
 *   ginko pull sprint              # Pull only sprints
 *   ginko pull --force             # Overwrite local with graph version
 *   ginko pull --dry-run           # Preview what would be pulled
 */

import chalk from 'chalk';
import { syncCommand } from '../sync/sync-command.js';
import { recordPull, readSyncState } from '../../lib/sync-state.js';
import type { TeamSyncOptions, NodeType } from '../sync/types.js';

export interface PullOptions {
  dryRun?: boolean;
  force?: boolean;
  /** Entity type filter (from subcommand: epic, sprint, adr, etc.) */
  entityType?: string;
  /** Quiet mode for auto-pull */
  quiet?: boolean;
}

/**
 * Map subcommand entity types to sync NodeType
 */
function mapEntityType(entityType?: string): NodeType | undefined {
  if (!entityType) return undefined;

  const mapping: Record<string, NodeType> = {
    'epic': 'Charter', // Epics don't have a direct NodeType in sync, we'll handle specially
    'sprint': 'Sprint',
    'adr': 'ADR',
    'prd': 'PRD',
    'pattern': 'Pattern',
    'gotcha': 'Gotcha',
    'charter': 'Charter',
    'task': 'Task',
  };

  return mapping[entityType.toLowerCase()];
}

/**
 * Main pull command implementation
 */
export async function pullCommand(options: PullOptions): Promise<void> {
  const quiet = !!options.quiet;

  if (!quiet) {
    console.log(chalk.bold.cyan('\n\u2b07  Pull: Graph \u2192 Git\n'));
  }

  // Read sync state for display
  const syncState = await readSyncState();
  if (!quiet && syncState.lastPullTimestamp) {
    console.log(chalk.dim(`Last pull: ${syncState.lastPullTimestamp}`));
  }

  // Map entity type to sync NodeType
  const nodeType = mapEntityType(options.entityType);

  // Build sync options - delegate to existing sync logic
  const syncOptions: TeamSyncOptions = {
    dryRun: options.dryRun,
    force: options.force,
    type: nodeType,
    interactive: !options.force,
    skipMembershipCheck: quiet,
  };

  try {
    const result = await syncCommand(syncOptions);

    // Update sync state on successful pull
    if (!options.dryRun && result.synced.length > 0) {
      await recordPull();
    }

    // Summary with reinforcement
    if (!quiet && !options.dryRun) {
      if (result.synced.length > 0) {
        console.log(chalk.dim('\n\ud83d\udca1 Local files are up to date. Use `ginko push` to sync your changes to graph.'));
      }
    }
  } catch (error) {
    if (!quiet) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\u2717 Pull failed: ${msg}`));
    }
    throw error;
  }
}
