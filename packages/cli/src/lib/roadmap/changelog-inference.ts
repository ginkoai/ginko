/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-09
 * @tags: [roadmap, changelog, inference, migration, ADR-056]
 * @related: [../../commands/graph/migrations/009-epic-roadmap-properties.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: []
 */

// =============================================================================
// Changelog Inference for Epic Migration (ADR-056)
// =============================================================================

/**
 * Epic data from graph or local file
 */
export interface EpicData {
  id: string;
  title: string;
  status?: 'planning' | 'active' | 'complete' | 'on-hold';
  created_at?: string;
  updated_at?: string;
}

/**
 * Sprint data associated with an Epic
 */
export interface SprintData {
  id: string;
  title?: string;
  status?: 'planning' | 'active' | 'complete';
  start_date?: string;
  end_date?: string;
}

/**
 * Changelog entry format
 */
export interface ChangelogEntry {
  timestamp: string;
  field: string;
  from: string | null;
  to: string;
  reason?: string;
}

/**
 * Infer historical changelog entries from existing Epic and Sprint data
 *
 * This function analyzes existing data to create a changelog that reflects
 * the history of the Epic before roadmap properties were added.
 *
 * Inference rules:
 * 1. If Epic has status='complete', infer roadmap_status changed to 'completed'
 * 2. If Epic has status='active', infer roadmap_status changed to 'in_progress'
 * 3. If Epic has sprints with dates, use first sprint start as project start
 * 4. Always create an initial "Migrated from legacy schema" entry
 *
 * @param epic Epic data from graph or file
 * @param sprints Associated sprint data (optional)
 * @returns Array of inferred changelog entries
 */
export function inferHistoricalChangelog(
  epic: EpicData,
  sprints: SprintData[] = []
): ChangelogEntry[] {
  const changelog: ChangelogEntry[] = [];
  const now = new Date().toISOString();

  // Find earliest sprint start date for timeline inference
  const sprintStartDates = sprints
    .filter(s => s.start_date)
    .map(s => new Date(s.start_date!).getTime())
    .sort((a, b) => a - b);

  const earliestSprintStart = sprintStartDates.length > 0
    ? new Date(sprintStartDates[0]).toISOString()
    : null;

  // Find latest sprint end date for completion inference
  const completedSprints = sprints.filter(s => s.status === 'complete' && s.end_date);
  const sprintEndDates = completedSprints
    .map(s => new Date(s.end_date!).getTime())
    .sort((a, b) => b - a); // Descending

  const latestSprintEnd = sprintEndDates.length > 0
    ? new Date(sprintEndDates[0]).toISOString()
    : null;

  // Entry 1: Initial migration entry
  changelog.push({
    timestamp: epic.created_at || now,
    field: 'roadmap_properties',
    from: null,
    to: 'initialized',
    reason: 'Migration 009: Added roadmap properties per ADR-056',
  });

  // Entry 2: Infer roadmap_status from Epic status
  if (epic.status === 'complete') {
    // Epic is complete - infer roadmap_status = completed
    changelog.push({
      timestamp: latestSprintEnd || epic.updated_at || now,
      field: 'roadmap_status',
      from: 'not_started',
      to: 'completed',
      reason: `Inferred from Epic status='complete'${latestSprintEnd ? ' and sprint completion dates' : ''}`,
    });
  } else if (epic.status === 'active') {
    // Epic is active - infer roadmap_status = in_progress
    changelog.push({
      timestamp: earliestSprintStart || epic.updated_at || now,
      field: 'roadmap_status',
      from: 'not_started',
      to: 'in_progress',
      reason: `Inferred from Epic status='active'${earliestSprintStart ? ' and sprint start dates' : ''}`,
    });
  } else if (epic.status === 'on-hold') {
    // Epic is on-hold - was likely in progress before
    changelog.push({
      timestamp: earliestSprintStart || epic.updated_at || now,
      field: 'roadmap_status',
      from: 'not_started',
      to: 'in_progress',
      reason: 'Inferred from Epic status (was active before on-hold)',
    });
  }

  // Note: We don't infer commitment_status changes because we can't reliably
  // determine when an Epic was "committed" vs exploratory from existing data.
  // All migrated Epics start as 'uncommitted' and can be manually committed.

  return changelog;
}

/**
 * Merge inferred changelog with any existing changelog entries
 * Preserves existing entries and adds inferred ones at the beginning
 *
 * @param existingChangelog Existing changelog entries (if any)
 * @param inferredChangelog Inferred entries from migration
 * @returns Merged changelog, sorted by timestamp
 */
export function mergeChangelogs(
  existingChangelog: ChangelogEntry[] = [],
  inferredChangelog: ChangelogEntry[] = []
): ChangelogEntry[] {
  const merged = [...inferredChangelog, ...existingChangelog];

  // Sort by timestamp (oldest first)
  return merged.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Create a summary of changelog entries for display
 *
 * @param changelog Changelog entries to summarize
 * @returns Human-readable summary string
 */
export function summarizeChangelog(changelog: ChangelogEntry[]): string {
  if (changelog.length === 0) {
    return 'No changes recorded';
  }

  const lines: string[] = [];

  for (const entry of changelog) {
    const date = new Date(entry.timestamp).toLocaleDateString();
    const change = entry.from
      ? `${entry.field}: ${entry.from} → ${entry.to}`
      : `${entry.field}: ${entry.to}`;
    const reason = entry.reason ? ` (${entry.reason})` : '';
    lines.push(`[${date}] ${change}${reason}`);
  }

  return lines.join('\n');
}

/**
 * Validate changelog entries for consistency
 *
 * @param changelog Entries to validate
 * @returns Validation result with any issues found
 */
export function validateChangelog(changelog: ChangelogEntry[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (let i = 0; i < changelog.length; i++) {
    const entry = changelog[i];

    // Check required fields
    if (!entry.timestamp) {
      issues.push(`Entry ${i}: Missing timestamp`);
    }
    if (!entry.field) {
      issues.push(`Entry ${i}: Missing field name`);
    }
    if (entry.to === undefined || entry.to === null) {
      issues.push(`Entry ${i}: Missing 'to' value`);
    }

    // Validate timestamp format
    if (entry.timestamp && isNaN(new Date(entry.timestamp).getTime())) {
      issues.push(`Entry ${i}: Invalid timestamp format`);
    }
  }

  // Check for duplicate timestamps on same field
  const seen = new Set<string>();
  for (const entry of changelog) {
    const key = `${entry.timestamp}:${entry.field}`;
    if (seen.has(key)) {
      issues.push(`Duplicate entry for ${entry.field} at ${entry.timestamp}`);
    }
    seen.add(key);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
