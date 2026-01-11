/**
 * @fileType: types
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, epic, types, ADR-056, now-next-later]
 * @related: [../validation/epic-roadmap.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// =============================================================================
// ADR-056: Roadmap as Epic View (Now/Next/Later Model)
// Amendment 2026-01-11: Priority-based lanes for AI-native teams
// =============================================================================

/**
 * Roadmap lane - priority-based organization for AI-native teams
 *
 * - now: Fully planned, committed, ready for immediate implementation
 * - next: Committed but may require additional planning or enablers
 * - later: Proposed but not pulled into active development (default)
 */
export type RoadmapLane = 'now' | 'next' | 'later';

/**
 * Execution status of an Epic on the roadmap
 */
export type RoadmapStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Decision factors indicating why work is in Later lane
 *
 * Each tag should have a corresponding description in the Epic's
 * "Decision Factors" section explaining the specific blocker.
 */
export type DecisionFactor =
  | 'planning'      // Needs further scope definition or breakdown
  | 'value'         // Value proposition unclear or unvalidated
  | 'feasibility'   // Technical feasibility not yet assessed
  | 'advisability'  // Strategic fit or timing uncertain
  | 'architecture'  // Requires architectural decisions or ADRs
  | 'design'        // Needs UX/UI design work
  | 'risks'         // Unmitigated risks identified
  | 'market-fit'    // Market validation needed
  | 'dependencies'; // Blocked by external dependencies

/**
 * Human-readable descriptions for decision factors
 */
export const DECISION_FACTOR_LABELS: Record<DecisionFactor, string> = {
  planning: 'Needs further scope definition or breakdown',
  value: 'Value proposition unclear or unvalidated',
  feasibility: 'Technical feasibility not yet assessed',
  advisability: 'Strategic fit or timing uncertain',
  architecture: 'Requires architectural decisions or ADRs',
  design: 'Needs UX/UI design work',
  risks: 'Unmitigated risks identified',
  'market-fit': 'Market validation needed',
  dependencies: 'Blocked by external dependencies',
};

/**
 * Changelog entry tracking changes to roadmap properties
 */
export interface ChangelogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Field that changed (e.g., "roadmap_lane", "roadmap_status") */
  field: string;
  /** Previous value (null for initial set) */
  from: string | null;
  /** New value */
  to: string;
  /** Optional explanation for the change */
  reason?: string;
}

/**
 * Roadmap-specific properties for Epic nodes
 *
 * These properties extend Epic nodes to support the Now/Next/Later
 * roadmap model per ADR-056.
 */
export interface EpicRoadmapProperties {
  /** Priority lane (now/next/later) */
  roadmap_lane: RoadmapLane;

  /** Execution status */
  roadmap_status: RoadmapStatus;

  /** Priority within lane (lower = higher priority) */
  priority?: number;

  /** Decision factors for Later items */
  decision_factors?: DecisionFactor[];

  /** Visibility control - false hides from public views */
  roadmap_visible: boolean;

  /** Change history */
  changelog: ChangelogEntry[];
}

/**
 * Full Epic node with roadmap properties
 */
export interface EpicWithRoadmap extends EpicRoadmapProperties {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Lane group for display purposes
 */
export interface LaneGroup {
  lane: RoadmapLane;
  label: string;
  epics: EpicWithRoadmap[];
}

/**
 * Roadmap response from API
 */
export interface RoadmapResponse {
  /** All epics matching query */
  epics: EpicWithRoadmap[];
  /** Epics grouped by lane */
  lanes: LaneGroup[];
  /** Summary statistics */
  summary: {
    total: number;
    byLane: Record<RoadmapLane, number>;
    byStatus: Record<RoadmapStatus, number>;
  };
}

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
  code: 'NOW_WITH_DECISION_FACTORS' | 'INVALID_LANE' | 'INVALID_STATUS';
}

/**
 * Validation warning - allows saving with caution
 */
export interface RoadmapValidationWarning {
  field: string;
  message: string;
  code: 'LATER_WITHOUT_FACTORS' | 'MANY_NOW_ITEMS';
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default roadmap properties for new Epics
 * New epics start in Later with planning decision factor
 */
export const DEFAULT_ROADMAP_PROPERTIES: EpicRoadmapProperties = {
  roadmap_lane: 'later',
  roadmap_status: 'not_started',
  decision_factors: ['planning'],
  roadmap_visible: true,
  changelog: [],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the display label for a lane
 */
export function getLaneLabel(lane: RoadmapLane): string {
  switch (lane) {
    case 'now':
      return 'Now';
    case 'next':
      return 'Next';
    case 'later':
      return 'Later';
  }
}

/**
 * Get the sort order for lanes (now=0, next=1, later=2)
 */
export function getLaneSortOrder(lane: RoadmapLane): number {
  switch (lane) {
    case 'now':
      return 0;
    case 'next':
      return 1;
    case 'later':
      return 2;
  }
}

/**
 * Check if a lane represents committed work
 */
export function isCommitted(lane: RoadmapLane): boolean {
  return lane === 'now' || lane === 'next';
}

/**
 * Create default roadmap properties for a new Epic
 */
export function createDefaultRoadmapProperties(): EpicRoadmapProperties {
  return { ...DEFAULT_ROADMAP_PROPERTIES, changelog: [] };
}

// =============================================================================
// Legacy Support (deprecated - for migration only)
// =============================================================================

/**
 * @deprecated Use RoadmapLane instead. Kept for migration compatibility.
 */
export type CommitmentStatus = 'uncommitted' | 'committed';

/**
 * Convert legacy commitment_status to roadmap_lane
 * @deprecated For migration use only
 */
export function commitmentStatusToLane(status: CommitmentStatus): RoadmapLane {
  return status === 'committed' ? 'next' : 'later';
}
