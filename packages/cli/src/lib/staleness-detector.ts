/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-03
 * @tags: [staleness, detection, team, sync, EPIC-008]
 * @related: [../commands/sync/team-sync.ts, ../commands/start/start-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

/**
 * Staleness Detection System (EPIC-008 Sprint 2)
 *
 * Provides comprehensive staleness detection for team context synchronization.
 * Used by both CLI (ginko start) and Dashboard (StalenessWarning component).
 *
 * Key features:
 * - Configurable warning/critical thresholds
 * - Tracks changes since last sync (ADRs, Patterns, Sprints)
 * - Human-readable messages for different severity levels
 */

import chalk from 'chalk';

// =============================================================================
// Types
// =============================================================================

export interface StalenessConfig {
  /** Days before showing warning (default: 1) */
  warningThresholdDays: number;
  /** Days before showing critical warning (default: 7) */
  criticalThresholdDays: number;
}

export interface ChangedSinceSync {
  adrs: number;
  patterns: number;
  sprints: number;
  total: number;
}

export interface StalenessResult {
  /** Whether context is stale (exceeds warning threshold) */
  isStale: boolean;
  /** Severity level based on days since sync */
  severity: 'none' | 'warning' | 'critical';
  /** Number of days since last sync (Infinity if never synced) */
  daysSinceSync: number;
  /** ISO timestamp of last sync, null if never synced */
  lastSyncAt: string | null;
  /** Count of changes by category since last sync */
  changedSinceSync: ChangedSinceSync;
  /** Human-readable message describing staleness state */
  message: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

const DEFAULT_CONFIG: StalenessConfig = {
  warningThresholdDays: 1,
  criticalThresholdDays: 7,
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Check staleness of team context for current user
 *
 * @param graphId - The graph ID to check
 * @param token - Bearer token for authentication
 * @param config - Optional staleness configuration
 * @returns StalenessResult with severity, days since sync, and changes
 *
 * @example
 * ```typescript
 * const result = await checkStaleness(graphId, token, {
 *   warningThresholdDays: 1,
 *   criticalThresholdDays: 7,
 * });
 *
 * if (result.severity === 'critical') {
 *   console.log(chalk.red(result.message));
 * }
 * ```
 */
export async function checkStaleness(
  graphId: string,
  token: string,
  config?: Partial<StalenessConfig>
): Promise<StalenessResult> {
  const mergedConfig: StalenessConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  try {
    // Fetch membership status (includes last_sync_at)
    const membershipUrl = new URL(`${API_BASE}/api/v1/graph/membership`);
    membershipUrl.searchParams.set('graphId', graphId);

    const membershipResponse = await fetch(membershipUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (membershipResponse.status === 404) {
      // User is not a team member - return non-stale (no team context to sync)
      return createResult({
        isStale: false,
        severity: 'none',
        daysSinceSync: 0,
        lastSyncAt: null,
        changedSinceSync: { adrs: 0, patterns: 0, sprints: 0, total: 0 },
        message: 'Not a team member',
      });
    }

    if (!membershipResponse.ok) {
      // API error - return safe default (non-stale to avoid blocking)
      return createResult({
        isStale: false,
        severity: 'none',
        daysSinceSync: 0,
        lastSyncAt: null,
        changedSinceSync: { adrs: 0, patterns: 0, sprints: 0, total: 0 },
        message: 'Could not verify membership status',
      });
    }

    const membershipData = await membershipResponse.json() as { membership?: { last_sync_at?: string | null } };
    const lastSyncAt = membershipData.membership?.last_sync_at || null;

    // Calculate days since sync
    const daysSinceSync = calculateDaysSinceSync(lastSyncAt);

    // Determine severity based on thresholds
    const severity = determineSeverity(daysSinceSync, mergedConfig);

    // If not stale, return early (skip expensive changes query)
    if (severity === 'none') {
      return createResult({
        isStale: false,
        severity: 'none',
        daysSinceSync,
        lastSyncAt,
        changedSinceSync: { adrs: 0, patterns: 0, sprints: 0, total: 0 },
        message: formatMessage(severity, daysSinceSync, lastSyncAt, { adrs: 0, patterns: 0, sprints: 0, total: 0 }),
      });
    }

    // Fetch changes since last sync
    const changedSinceSync = await fetchChangesSinceSync(graphId, token, lastSyncAt);

    // Generate human-readable message
    const message = formatMessage(severity, daysSinceSync, lastSyncAt, changedSinceSync);

    return createResult({
      isStale: true,
      severity,
      daysSinceSync,
      lastSyncAt,
      changedSinceSync,
      message,
    });
  } catch (error) {
    // Network error - return safe default
    return createResult({
      isStale: false,
      severity: 'none',
      daysSinceSync: 0,
      lastSyncAt: null,
      changedSinceSync: { adrs: 0, patterns: 0, sprints: 0, total: 0 },
      message: 'Could not check staleness (offline?)',
    });
  }
}

// =============================================================================
// CLI Display Helper
// =============================================================================

/**
 * Display staleness warning in CLI with appropriate styling
 *
 * @param result - The staleness check result
 */
export function displayStalenessWarning(result: StalenessResult): void {
  if (!result.isStale) {
    return;
  }

  console.log('');

  if (result.severity === 'critical') {
    console.log(chalk.red.bold('🚨 Team context is critically stale'));
    console.log(chalk.red(`   ${result.message}`));
  } else {
    console.log(chalk.yellow('⚠️  Team context may be stale'));
    console.log(chalk.yellow(`   ${result.message}`));
  }

  // Show changes breakdown if any
  if (result.changedSinceSync.total > 0) {
    console.log('');
    console.log(chalk.dim('   Changes since last sync:'));
    if (result.changedSinceSync.adrs > 0) {
      console.log(chalk.dim(`     - ${result.changedSinceSync.adrs} ADR${result.changedSinceSync.adrs === 1 ? '' : 's'}`));
    }
    if (result.changedSinceSync.patterns > 0) {
      console.log(chalk.dim(`     - ${result.changedSinceSync.patterns} Pattern${result.changedSinceSync.patterns === 1 ? '' : 's'}`));
    }
    if (result.changedSinceSync.sprints > 0) {
      console.log(chalk.dim(`     - ${result.changedSinceSync.sprints} Sprint${result.changedSinceSync.sprints === 1 ? '' : 's'}`));
    }
  }

  console.log('');
  console.log(chalk.dim('   Run `ginko pull` to pull team updates.'));
  console.log('');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate number of days since last sync
 */
function calculateDaysSinceSync(lastSyncAt: string | null): number {
  if (!lastSyncAt) {
    return Infinity;
  }

  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const daysSinceSync = diffMs / (1000 * 60 * 60 * 24);

  return Math.floor(daysSinceSync);
}

/**
 * Determine severity based on days since sync and config thresholds
 */
function determineSeverity(
  daysSinceSync: number,
  config: StalenessConfig
): 'none' | 'warning' | 'critical' {
  if (daysSinceSync >= config.criticalThresholdDays) {
    return 'critical';
  }
  if (daysSinceSync >= config.warningThresholdDays) {
    return 'warning';
  }
  return 'none';
}

/**
 * Fetch count of changes since last sync from API
 */
async function fetchChangesSinceSync(
  graphId: string,
  token: string,
  lastSyncAt: string | null
): Promise<ChangedSinceSync> {
  try {
    const url = new URL(`${API_BASE}/api/v1/graph/changes`);
    url.searchParams.set('graphId', graphId);
    if (lastSyncAt) {
      url.searchParams.set('since', lastSyncAt);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback if endpoint not available
      return { adrs: 0, patterns: 0, sprints: 0, total: 0 };
    }

    const data = await response.json() as {
      changes?: { ADR?: number; Pattern?: number; Sprint?: number };
      total?: number;
    };

    // API returns { changes: { ADR: n, Pattern: n, Sprint: n, ... }, total: n }
    return {
      adrs: data.changes?.ADR || 0,
      patterns: data.changes?.Pattern || 0,
      sprints: data.changes?.Sprint || 0,
      total: data.total || 0,
    };
  } catch {
    return { adrs: 0, patterns: 0, sprints: 0, total: 0 };
  }
}

/**
 * Format human-readable message based on staleness state
 */
function formatMessage(
  severity: 'none' | 'warning' | 'critical',
  daysSinceSync: number,
  lastSyncAt: string | null,
  changes: ChangedSinceSync
): string {
  if (severity === 'none') {
    if (!lastSyncAt) {
      return 'No sync history';
    }
    return `Last synced ${formatRelativeTime(lastSyncAt)}`;
  }

  if (!lastSyncAt || daysSinceSync === Infinity) {
    return 'Never synced - team context not loaded';
  }

  const changeInfo = changes.total > 0
    ? ` (${changes.total} change${changes.total === 1 ? '' : 's'})`
    : '';

  if (severity === 'critical') {
    return `${daysSinceSync} days since last sync${changeInfo}. Team patterns and ADRs may be outdated.`;
  }

  return `${daysSinceSync} day${daysSinceSync === 1 ? '' : 's'} since last sync${changeInfo}.`;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateStr: string): string {
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

/**
 * Helper to create a StalenessResult with proper types
 */
function createResult(partial: StalenessResult): StalenessResult {
  return partial;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _internal = {
  calculateDaysSinceSync,
  determineSeverity,
  formatMessage,
  formatRelativeTime,
  DEFAULT_CONFIG,
};
