/**
 * @fileType: model
 * @status: current
 * @updated: 2026-01-09
 * @tags: [roadmap, epic, product-management, graph, strategic-planning]
 * @related: [ADR-056-roadmap-as-epic-view.md]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// =============================================================================
// Roadmap Types (ADR-056: Roadmap as Epic View)
// =============================================================================

/**
 * Commitment status for an Epic
 * - uncommitted: Exploratory idea, not yet committed to roadmap
 * - committed: Committed work with target quarters
 */
export type CommitmentStatus = 'uncommitted' | 'committed';

/**
 * Roadmap execution status for an Epic
 * - not_started: Committed but work hasn't begun
 * - in_progress: Active development
 * - completed: Successfully delivered
 * - cancelled: Removed from roadmap
 */
export type RoadmapStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Individual changelog entry for tracking roadmap changes
 * Provides audit trail for date/status changes
 */
export interface ChangelogEntry {
  /** ISO 8601 timestamp of the change */
  timestamp: string;
  /** Field that was changed (e.g., 'commitment_status', 'target_start_quarter') */
  field: string;
  /** Previous value (null for initial set) */
  from: string | null;
  /** New value */
  to: string;
  /** Optional reason for the change */
  reason?: string;
}

/**
 * Roadmap-specific properties for Epic nodes
 * These properties extend the base Epic with strategic planning capabilities
 *
 * @see ADR-056 for full specification
 */
export interface EpicRoadmapProperties {
  /**
   * Whether the Epic is committed to the roadmap
   * Uncommitted items cannot have target quarters
   */
  commitment_status: CommitmentStatus;

  /**
   * Execution status of the Epic
   * Tracks progress from not_started through completion/cancellation
   */
  roadmap_status: RoadmapStatus;

  /**
   * Target start quarter (e.g., "Q1-2026")
   * Only valid when commitment_status is 'committed'
   * Format: Q{1-4}-{YYYY}
   */
  target_start_quarter?: string;

  /**
   * Target end quarter (e.g., "Q2-2026")
   * Only valid when commitment_status is 'committed'
   * Must be >= target_start_quarter
   * Format: Q{1-4}-{YYYY}
   */
  target_end_quarter?: string;

  /**
   * Whether to show this Epic in public/external roadmap views
   * Set false for internal/tech-debt work
   */
  roadmap_visible: boolean;

  /**
   * Changelog of roadmap property changes
   * Append-only array for audit trail
   */
  changelog: ChangelogEntry[];
}

/**
 * Default roadmap properties for new or migrated Epics
 */
export const DEFAULT_ROADMAP_PROPERTIES: EpicRoadmapProperties = {
  commitment_status: 'uncommitted',
  roadmap_status: 'not_started',
  roadmap_visible: true,
  changelog: [],
};

/**
 * Validation result for roadmap properties
 */
export interface RoadmapValidationResult {
  valid: boolean;
  errors: RoadmapValidationError[];
  warnings: RoadmapValidationWarning[];
}

/**
 * Validation error - prevents saving
 */
export interface RoadmapValidationError {
  field: string;
  message: string;
  code: 'UNCOMMITTED_WITH_DATES' | 'INVALID_QUARTER_FORMAT' | 'END_BEFORE_START';
}

/**
 * Validation warning - allows saving with caution
 */
export interface RoadmapValidationWarning {
  field: string;
  message: string;
  code: 'FAR_FUTURE' | 'MISSING_END_QUARTER';
}
