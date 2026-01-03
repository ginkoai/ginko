/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-03
 * @tags: [sync, team, membership, staleness, EPIC-008]
 * @related: [sync-command.ts, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

/**
 * Team Sync Helper (EPIC-008)
 *
 * Handles team-related sync operations:
 * - Team membership verification
 * - Staleness detection and warnings
 * - Last sync timestamp tracking
 */

import chalk from 'chalk';
import type { TeamSyncStatus, TeamMembership } from './types.js';

const API_BASE = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

// Default staleness threshold (days since last sync)
const DEFAULT_STALENESS_THRESHOLD_DAYS = 3;

/**
 * Check team membership and sync status for current user
 */
export async function getTeamSyncStatus(
  graphId: string,
  token: string,
  stalenessThresholdDays: number = DEFAULT_STALENESS_THRESHOLD_DAYS
): Promise<TeamSyncStatus> {
  try {
    const url = new URL(`${API_BASE}/api/v1/graph/membership`);
    url.searchParams.set('graphId', graphId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // User is not a member of any team for this graph
      return {
        isMember: false,
        membership: null,
        staleness: {
          isStale: false,
          lastSyncAt: null,
          daysSinceSync: 0,
          thresholdDays: stalenessThresholdDays,
        },
      };
    }

    if (!response.ok) {
      // API error - assume not a member to be safe
      console.warn(chalk.dim(`⚠️  Could not verify team membership: ${response.status}`));
      return {
        isMember: false,
        membership: null,
        staleness: {
          isStale: false,
          lastSyncAt: null,
          daysSinceSync: 0,
          thresholdDays: stalenessThresholdDays,
        },
      };
    }

    const data = await response.json() as { membership?: TeamMembership };
    const membership: TeamMembership | null = data.membership || null;

    // Calculate staleness
    const staleness = calculateStaleness(membership?.last_sync_at, stalenessThresholdDays);

    return {
      isMember: true,
      membership,
      staleness,
    };
  } catch (error) {
    // Network error - continue without team features
    console.warn(chalk.dim('⚠️  Could not check team membership (offline?)'));
    return {
      isMember: false,
      membership: null,
      staleness: {
        isStale: false,
        lastSyncAt: null,
        daysSinceSync: 0,
        thresholdDays: stalenessThresholdDays,
      },
    };
  }
}

/**
 * Calculate staleness based on last sync timestamp
 */
function calculateStaleness(
  lastSyncAt: string | null | undefined,
  thresholdDays: number
): TeamSyncStatus['staleness'] {
  if (!lastSyncAt) {
    // Never synced - consider stale if threshold is met
    return {
      isStale: true,
      lastSyncAt: null,
      daysSinceSync: Infinity,
      thresholdDays,
    };
  }

  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const daysSinceSync = diffMs / (1000 * 60 * 60 * 24);

  return {
    isStale: daysSinceSync > thresholdDays,
    lastSyncAt,
    daysSinceSync: Math.floor(daysSinceSync),
    thresholdDays,
  };
}

/**
 * Update last sync timestamp for current user
 */
export async function updateLastSyncTimestamp(
  graphId: string,
  token: string
): Promise<boolean> {
  try {
    const url = new URL(`${API_BASE}/api/v1/graph/membership/sync`);
    url.searchParams.set('graphId', graphId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syncedAt: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch {
    // Silent failure - not critical
    return false;
  }
}

/**
 * Display staleness warning if context is stale
 */
export function displayStalenessWarning(status: TeamSyncStatus): void {
  if (!status.staleness.isStale) {
    return;
  }

  const { daysSinceSync, lastSyncAt } = status.staleness;

  console.log('');
  if (lastSyncAt === null) {
    console.log(chalk.yellow('⚠️  First sync for this project'));
    console.log(chalk.dim('   Team context will be loaded for the first time.'));
  } else if (daysSinceSync === Infinity) {
    console.log(chalk.yellow('⚠️  You have never synced team context'));
    console.log(chalk.dim('   Run `ginko sync` regularly to stay current with team knowledge.'));
  } else {
    console.log(chalk.yellow(`⚠️  Team context may be stale (${daysSinceSync} days since last sync)`));
    console.log(chalk.dim(`   Last synced: ${new Date(lastSyncAt).toLocaleDateString()}`));
    console.log(chalk.dim('   Patterns, gotchas, and ADRs may have been updated by teammates.'));
  }
  console.log('');
}

/**
 * Display team membership info
 */
export function displayTeamInfo(status: TeamSyncStatus): void {
  if (!status.isMember || !status.membership) {
    return;
  }

  const { membership } = status;
  const roleIcon = membership.role === 'owner' ? '👑' : membership.role === 'admin' ? '🛡️' : '👤';

  console.log(chalk.dim(`${roleIcon} Team: ${membership.team_name} (${membership.role})`));
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) {
    return 'never';
  }

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}
