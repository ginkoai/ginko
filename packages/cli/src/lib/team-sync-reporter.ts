/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-03
 * @tags: [sync, team, reporting, changes, EPIC-008]
 * @related: [../commands/sync/sync-command.ts, ../commands/sync/team-sync.ts, staleness-detector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

/**
 * Team Sync Reporter (EPIC-008 Sprint 2)
 *
 * Provides team-aware change reporting for the sync command.
 * Shows who changed what since last sync with colored output.
 *
 * Key features:
 * - Groups changes by team member
 * - Counts changes by type (ADR, Pattern, Sprint, Gotcha)
 * - Formats output with chalk colors
 * - Supports preview/dry-run mode
 */

import chalk from 'chalk';

// =============================================================================
// Types
// =============================================================================

/**
 * Change details for a single node type
 */
export interface TypeChange {
  type: string;     // ADR, Pattern, Sprint, Gotcha, Task
  action: string;   // created, updated, deleted
  count: number;
  titles: string[];
}

/**
 * Summary of changes for a single team member
 */
export interface MemberChangeSummary {
  email: string;
  displayName: string | null;
  changes: TypeChange[];
  totalChanges: number;
}

/**
 * Summary of all team changes since last sync
 */
export interface TeamChangeSummary {
  byMember: Map<string, MemberChangeSummary>;
  totalChanges: number;
  sinceSyncAt: string | null;
  period: string;  // "3 days", "1 week", etc.
}

/**
 * Raw change record from API
 */
interface RawChangeRecord {
  id: string;
  type: string;
  title: string;
  action: 'created' | 'updated' | 'deleted';
  editedBy: string;
  editedByName?: string | null;
  editedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

// =============================================================================
// Main API
// =============================================================================

/**
 * Fetch team changes since last sync
 *
 * @param graphId - The graph ID to query
 * @param token - Bearer token for authentication
 * @param lastSyncAt - ISO timestamp of last sync (null if never synced)
 * @returns TeamChangeSummary with changes grouped by member
 *
 * @example
 * ```typescript
 * const summary = await getTeamChangesSinceLast(graphId, token, '2026-01-01T00:00:00Z');
 * if (summary.totalChanges > 0) {
 *   displayTeamChangeReport(summary);
 * }
 * ```
 */
export async function getTeamChangesSinceLast(
  graphId: string,
  token: string,
  lastSyncAt: string | null
): Promise<TeamChangeSummary> {
  try {
    // Build query URL
    const url = new URL(`${API_BASE}/api/v1/team/activity`);
    url.searchParams.set('graphId', graphId);
    if (lastSyncAt) {
      url.searchParams.set('since', lastSyncAt);
    }
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle API not available (fallback to unsynced nodes endpoint)
    if (response.status === 404 || response.status === 501) {
      return await getTeamChangesFromUnsyncedNodes(graphId, token, lastSyncAt);
    }

    if (!response.ok) {
      // Return empty summary on error (non-blocking)
      return createEmptySummary(lastSyncAt);
    }

    const data = await response.json() as {
      changes?: RawChangeRecord[];
      total?: number;
    };

    return aggregateChanges(data.changes || [], lastSyncAt);
  } catch {
    // Network error - return empty summary (non-blocking)
    return createEmptySummary(lastSyncAt);
  }
}

/**
 * Fallback: Get changes from unsynced nodes endpoint
 * Used when /api/v1/team/activity is not available
 */
async function getTeamChangesFromUnsyncedNodes(
  graphId: string,
  token: string,
  lastSyncAt: string | null
): Promise<TeamChangeSummary> {
  try {
    const url = new URL(`${API_BASE}/api/v1/graph/nodes/unsynced`);
    url.searchParams.set('graphId', graphId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return createEmptySummary(lastSyncAt);
    }

    const data = await response.json() as {
      nodes?: Array<{
        node: { id: string; label: string; properties: Record<string, unknown> };
        syncStatus: { editedBy: string; editedAt: string };
      }>;
    };

    // Transform unsynced nodes to change records
    const changes: RawChangeRecord[] = (data.nodes || []).map(n => ({
      id: n.node.id || (n.node.properties.id as string) || '',
      type: (n.node.label || n.node.properties.type || 'ADR') as string,
      title: (n.node.properties.title as string) || (n.node.properties.name as string) || 'Untitled',
      action: 'updated' as const,
      editedBy: n.syncStatus?.editedBy || 'unknown',
      editedAt: n.syncStatus?.editedAt || new Date().toISOString(),
    }));

    return aggregateChanges(changes, lastSyncAt);
  } catch {
    return createEmptySummary(lastSyncAt);
  }
}

/**
 * Aggregate raw changes into team summary
 */
function aggregateChanges(
  changes: RawChangeRecord[],
  lastSyncAt: string | null
): TeamChangeSummary {
  const byMember = new Map<string, MemberChangeSummary>();

  for (const change of changes) {
    const email = change.editedBy;

    // Get or create member summary
    let member = byMember.get(email);
    if (!member) {
      member = {
        email,
        displayName: change.editedByName || null,
        changes: [],
        totalChanges: 0,
      };
      byMember.set(email, member);
    }

    // Find or create type/action bucket
    let typeChange = member.changes.find(
      c => c.type === change.type && c.action === change.action
    );
    if (!typeChange) {
      typeChange = {
        type: change.type,
        action: change.action,
        count: 0,
        titles: [],
      };
      member.changes.push(typeChange);
    }

    typeChange.count++;
    if (typeChange.titles.length < 3) {
      typeChange.titles.push(change.title);
    }
    member.totalChanges++;
  }

  // Calculate period string
  const period = calculatePeriod(lastSyncAt);

  return {
    byMember,
    totalChanges: changes.length,
    sinceSyncAt: lastSyncAt,
    period,
  };
}

/**
 * Create empty summary (used for error cases)
 */
function createEmptySummary(lastSyncAt: string | null): TeamChangeSummary {
  return {
    byMember: new Map(),
    totalChanges: 0,
    sinceSyncAt: lastSyncAt,
    period: calculatePeriod(lastSyncAt),
  };
}

/**
 * Calculate human-readable period string
 */
function calculatePeriod(lastSyncAt: string | null): string {
  if (!lastSyncAt) {
    return 'all time';
  }

  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return '1 week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
  if (diffDays < 60) return '1 month';
  return `${Math.floor(diffDays / 30)} months`;
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Format team change report as string (for logging or testing)
 *
 * @param summary - The team change summary to format
 * @returns Formatted string with colors stripped for logging
 */
export function formatTeamChangeReport(summary: TeamChangeSummary): string {
  const lines: string[] = [];

  if (summary.totalChanges === 0) {
    lines.push('No changes since last sync.');
    return lines.join('\n');
  }

  lines.push(`Team changes since last sync (${summary.period} ago):`);
  lines.push('');

  // Sort members by total changes (most active first)
  const sortedMembers = Array.from(summary.byMember.values())
    .sort((a, b) => b.totalChanges - a.totalChanges);

  for (const member of sortedMembers) {
    const displayName = member.displayName || formatEmail(member.email);
    lines.push(`  ${displayName}:`);

    // Sort changes: created first, then updated, then deleted
    const sortedChanges = member.changes.sort((a, b) => {
      const order = { created: 0, updated: 1, deleted: 2 };
      return (order[a.action as keyof typeof order] || 1) - (order[b.action as keyof typeof order] || 1);
    });

    for (const change of sortedChanges) {
      const icon = change.action === 'created' ? '+' : change.action === 'updated' ? '~' : '-';
      const plural = change.count === 1 ? '' : 's';
      lines.push(`    ${icon} ${change.count} ${change.type}${plural} ${change.action}`);
    }

    lines.push('');
  }

  // Summary line
  const memberCount = summary.byMember.size;
  lines.push(`  Total: ${summary.totalChanges} change${summary.totalChanges === 1 ? '' : 's'} from ${memberCount} team member${memberCount === 1 ? '' : 's'}`);

  return lines.join('\n');
}

/**
 * Display team change report to console with chalk colors
 *
 * @param summary - The team change summary to display
 */
export function displayTeamChangeReport(summary: TeamChangeSummary): void {
  if (summary.totalChanges === 0) {
    console.log(chalk.dim('No changes since last sync.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan.bold(`Team changes since last sync (${summary.period} ago):`));
  console.log('');

  // Sort members by total changes (most active first)
  const sortedMembers = Array.from(summary.byMember.values())
    .sort((a, b) => b.totalChanges - a.totalChanges);

  for (const member of sortedMembers) {
    const displayName = member.displayName || formatEmail(member.email);
    console.log(chalk.white(`  ${displayName}:`));

    // Sort changes: created first, then updated, then deleted
    const sortedChanges = member.changes.sort((a, b) => {
      const order = { created: 0, updated: 1, deleted: 2 };
      return (order[a.action as keyof typeof order] || 1) - (order[b.action as keyof typeof order] || 1);
    });

    for (const change of sortedChanges) {
      const plural = change.count === 1 ? '' : 's';
      let line: string;

      if (change.action === 'created') {
        line = chalk.green(`    + ${change.count} ${change.type}${plural} created`);
      } else if (change.action === 'updated') {
        line = chalk.yellow(`    ~ ${change.count} ${change.type}${plural} updated`);
      } else {
        line = chalk.red(`    - ${change.count} ${change.type}${plural} deleted`);
      }

      console.log(line);
    }

    console.log('');
  }

  // Summary line
  const memberCount = summary.byMember.size;
  console.log(
    chalk.dim(`  Total: ${summary.totalChanges} change${summary.totalChanges === 1 ? '' : 's'} from ${memberCount} team member${memberCount === 1 ? '' : 's'}`)
  );
  console.log('');
}

/**
 * Display compact change summary (single line)
 *
 * @param summary - The team change summary
 * @returns Single line summary string
 */
export function formatCompactSummary(summary: TeamChangeSummary): string {
  if (summary.totalChanges === 0) {
    return 'No pending changes';
  }

  const memberCount = summary.byMember.size;
  return `${summary.totalChanges} change${summary.totalChanges === 1 ? '' : 's'} from ${memberCount} member${memberCount === 1 ? '' : 's'} (${summary.period})`;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format email for display (truncate domain)
 */
function formatEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;

  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);

  // Shorten common domains
  if (domain === 'gmail.com' || domain === 'outlook.com' || domain === 'yahoo.com') {
    return `${local}@${domain.split('.')[0]}`;
  }

  return `${local}@`;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _internal = {
  aggregateChanges,
  calculatePeriod,
  formatEmail,
  createEmptySummary,
};
