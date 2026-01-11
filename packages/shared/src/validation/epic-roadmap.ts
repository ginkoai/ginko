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
} from '../types/roadmap';
import { isValidQuarter, compareQuarters, isFarFuture } from '../utils/quarter';

// =============================================================================
// Epic Roadmap Validation (ADR-056)
// =============================================================================

/**
 * Validate Epic roadmap properties
 *
 * Rules enforced:
 * 1. Uncommitted items cannot have target dates (ERROR)
 * 2. Committed items should warn if > 2 years out (WARNING)
 * 3. start_quarter must be <= end_quarter (ERROR)
 * 4. Quarter format must be valid Q{1-4}-{YYYY} (ERROR)
 *
 * @param properties The roadmap properties to validate
 * @returns Validation result with errors and warnings
 */
export function validateEpicRoadmapProperties(
  properties: Partial<EpicRoadmapProperties>
): RoadmapValidationResult {
  const errors: RoadmapValidationError[] = [];
  const warnings: RoadmapValidationWarning[] = [];

  const {
    commitment_status,
    target_start_quarter,
    target_end_quarter,
  } = properties;

  // Rule 1: Uncommitted items cannot have dates
  if (commitment_status === 'uncommitted') {
    if (target_start_quarter) {
      errors.push({
        field: 'target_start_quarter',
        message: 'Uncommitted items cannot have a target start quarter. Commit the Epic first.',
        code: 'UNCOMMITTED_WITH_DATES',
      });
    }
    if (target_end_quarter) {
      errors.push({
        field: 'target_end_quarter',
        message: 'Uncommitted items cannot have a target end quarter. Commit the Epic first.',
        code: 'UNCOMMITTED_WITH_DATES',
      });
    }
  }

  // Rule 4: Validate quarter format (check before comparing)
  if (target_start_quarter && !isValidQuarter(target_start_quarter)) {
    errors.push({
      field: 'target_start_quarter',
      message: `Invalid quarter format: "${target_start_quarter}". Expected Q{1-4}-{YYYY} (e.g., Q1-2026)`,
      code: 'INVALID_QUARTER_FORMAT',
    });
  }

  if (target_end_quarter && !isValidQuarter(target_end_quarter)) {
    errors.push({
      field: 'target_end_quarter',
      message: `Invalid quarter format: "${target_end_quarter}". Expected Q{1-4}-{YYYY} (e.g., Q2-2026)`,
      code: 'INVALID_QUARTER_FORMAT',
    });
  }

  // Only check these rules if format is valid
  const startValid = target_start_quarter && isValidQuarter(target_start_quarter);
  const endValid = target_end_quarter && isValidQuarter(target_end_quarter);

  // Rule 3: start_quarter must be <= end_quarter
  if (startValid && endValid) {
    if (compareQuarters(target_start_quarter!, target_end_quarter!) > 0) {
      errors.push({
        field: 'target_end_quarter',
        message: `End quarter (${target_end_quarter}) must be on or after start quarter (${target_start_quarter})`,
        code: 'END_BEFORE_START',
      });
    }
  }

  // Rule 2: Warn if quarters are > 2 years in the future
  if (commitment_status === 'committed') {
    if (startValid && isFarFuture(target_start_quarter!)) {
      warnings.push({
        field: 'target_start_quarter',
        message: `Start quarter (${target_start_quarter}) is more than 2 years in the future. Consider a nearer-term target.`,
        code: 'FAR_FUTURE',
      });
    }

    if (endValid && isFarFuture(target_end_quarter!)) {
      warnings.push({
        field: 'target_end_quarter',
        message: `End quarter (${target_end_quarter}) is more than 2 years in the future. Consider a nearer-term target.`,
        code: 'FAR_FUTURE',
      });
    }

    // Warn if committed but missing end quarter
    if (startValid && !target_end_quarter) {
      warnings.push({
        field: 'target_end_quarter',
        message: 'Committed Epic has a start quarter but no end quarter. Consider adding a target completion quarter.',
        code: 'MISSING_END_QUARTER',
      });
    }
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
    'commitment_status',
    'roadmap_status',
    'target_start_quarter',
    'target_end_quarter',
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
