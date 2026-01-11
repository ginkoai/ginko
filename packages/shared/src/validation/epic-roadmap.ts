/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-09
 * @tags: [validation, epic, roadmap, middleware]
 * @related: [types/roadmap.ts, utils/quarter.ts, ADR-056]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import {
  EpicRoadmapProperties,
  RoadmapValidationResult,
  RoadmapValidationError,
  RoadmapValidationWarning,
  RoadmapLane,
  RoadmapStatus,
} from '../types/roadmap';

// =============================================================================
// Epic Roadmap Validation (ADR-056 - Now/Next/Later Model)
// =============================================================================

const VALID_LANES: RoadmapLane[] = ['now', 'next', 'later', 'done', 'dropped'];
const VALID_STATUSES: RoadmapStatus[] = ['not_started', 'in_progress', 'completed', 'cancelled'];

/**
 * Validate Epic roadmap properties
 *
 * Rules enforced:
 * 1. NOW items should not have decision_factors (they're fully decided) - ERROR
 * 2. LATER items should have decision_factors explaining why not ready - WARNING
 * 3. Lane must be valid (now/next/later) - ERROR
 * 4. Status must be valid - ERROR
 * 5. Warn if too many items in NOW lane (checked at aggregate level)
 *
 * @param properties The roadmap properties to validate
 * @param nowItemCount Optional count of items in NOW lane for aggregate warning
 * @returns Validation result with errors and warnings
 */
export function validateEpicRoadmapProperties(
  properties: Partial<EpicRoadmapProperties>,
  nowItemCount?: number
): RoadmapValidationResult {
  const errors: RoadmapValidationError[] = [];
  const warnings: RoadmapValidationWarning[] = [];

  const {
    roadmap_lane,
    roadmap_status,
    decision_factors,
  } = properties;

  // Rule 3: Validate lane value
  if (roadmap_lane && !VALID_LANES.includes(roadmap_lane)) {
    errors.push({
      field: 'roadmap_lane',
      message: `Invalid lane: "${roadmap_lane}". Must be one of: now, next, later`,
      code: 'INVALID_LANE',
    });
  }

  // Rule 4: Validate status value
  if (roadmap_status && !VALID_STATUSES.includes(roadmap_status)) {
    errors.push({
      field: 'roadmap_status',
      message: `Invalid status: "${roadmap_status}". Must be one of: not_started, in_progress, completed, cancelled`,
      code: 'INVALID_STATUS',
    });
  }

  // Rule 1: NOW items should not have decision_factors
  if (roadmap_lane === 'now' && decision_factors && decision_factors.length > 0) {
    errors.push({
      field: 'decision_factors',
      message: 'Items in NOW lane should be fully decided. Remove decision factors or move to NEXT/LATER.',
      code: 'NOW_WITH_DECISION_FACTORS',
    });
  }

  // Rule 2: LATER items should have decision_factors
  if (roadmap_lane === 'later' && (!decision_factors || decision_factors.length === 0)) {
    warnings.push({
      field: 'decision_factors',
      message: 'Items in LATER lane should have decision factors explaining what needs to happen before they can be committed.',
      code: 'LATER_WITHOUT_FACTORS',
    });
  }

  // Rule 5: Warn if too many items in NOW lane (more than 3 is typically too many)
  if (nowItemCount !== undefined && nowItemCount > 3) {
    warnings.push({
      field: 'roadmap_lane',
      message: `${nowItemCount} items in NOW lane. Consider limiting to 3 or fewer to maintain focus.`,
      code: 'MANY_NOW_ITEMS',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a changelog entry for a field change
 *
 * @param field The field that was changed
 * @param from Previous value (null if new)
 * @param to New value
 * @param reason Optional reason for the change
 * @returns Changelog entry object
 */
export function createChangelogEntry(
  field: string,
  from: string | null,
  to: string,
  reason?: string
) {
  return {
    timestamp: new Date().toISOString(),
    field,
    from,
    to,
    reason,
  };
}

/**
 * Detect changes between old and new roadmap properties
 * Returns array of changelog entries for any changed fields
 *
 * @param oldProps Previous properties (or empty object for new Epics)
 * @param newProps New properties
 * @param reason Optional reason for all changes
 * @returns Array of changelog entries
 */
export function detectRoadmapChanges(
  oldProps: Partial<EpicRoadmapProperties>,
  newProps: Partial<EpicRoadmapProperties>,
  reason?: string
) {
  const trackedFields: (keyof EpicRoadmapProperties)[] = [
    'roadmap_lane',
    'roadmap_status',
    'priority',
    'roadmap_visible',
  ];

  const changes: ReturnType<typeof createChangelogEntry>[] = [];

  for (const field of trackedFields) {
    const oldValue = oldProps[field];
    const newValue = newProps[field];

    // Skip if unchanged
    if (oldValue === newValue) continue;

    // Skip if both are undefined/null
    if (oldValue == null && newValue == null) continue;

    changes.push(
      createChangelogEntry(
        field,
        oldValue != null ? String(oldValue) : null,
        newValue != null ? String(newValue) : 'removed',
        reason
      )
    );
  }

  return changes;
}

/**
 * Format validation errors for display
 *
 * @param result Validation result
 * @returns Formatted string with errors and warnings
 */
export function formatValidationResult(result: RoadmapValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - [${error.field}] ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.field}] ${warning.message}`);
    }
  }

  if (result.valid && result.warnings.length === 0) {
    lines.push('Validation passed');
  }

  return lines.join('\n');
}
