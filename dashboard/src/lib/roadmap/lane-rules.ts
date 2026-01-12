/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, lane-rules, drag-drop, ADR-056]
 * @related: [RoadmapCanvas.tsx, useRoadmapDnd.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

export interface LaneTransitionResult {
  allowed: boolean;
  reason?: string;
  promptForFactors?: boolean;
}

export interface EpicForValidation {
  id: string;
  decision_factors?: DecisionFactor[];
}

// =============================================================================
// Lane Transition Rules (ADR-056)
// =============================================================================
//
// | From   | To    | Allowed?      | Behavior                                    |
// |--------|-------|---------------|---------------------------------------------|
// | Later  | Next  | ✅ Yes        | Commits work (factors may remain)           |
// | Later  | Now   | ⚠️ Conditional | Only if decision_factors is empty           |
// | Next   | Now   | ⚠️ Conditional | Only if decision_factors is empty           |
// | Next   | Later | ✅ Yes        | Uncommits, prompts for decision factors     |
// | Now    | Next  | ✅ Yes        | Deprioritizes (stays committed)             |
// | Now    | Later | ✅ Yes        | Uncommits, prompts for decision factors     |
// | Any    | Done  | ✅ Yes        | Marks as complete                           |
// | Any    | Dropped| ✅ Yes       | Marks as cancelled                          |
//
// Key Rule: Work cannot enter "Now" until all decision factors are cleared.
// =============================================================================

/**
 * Check if an epic can be moved to a target lane
 */
export function canMoveTo(
  epic: EpicForValidation,
  fromLane: RoadmapLane,
  targetLane: RoadmapLane
): LaneTransitionResult {
  // Same lane - always allowed (reordering)
  if (fromLane === targetLane) {
    return { allowed: true };
  }

  const hasDecisionFactors = epic.decision_factors && epic.decision_factors.length > 0;

  // Moving TO "Now" lane - requires no decision factors
  if (targetLane === 'now') {
    if (hasDecisionFactors) {
      return {
        allowed: false,
        reason: `Clear all decision factors before moving to Now: ${epic.decision_factors!.join(', ')}`,
      };
    }
    return { allowed: true };
  }

  // Moving TO "Later" lane - prompt for decision factors if none exist
  if (targetLane === 'later' && !hasDecisionFactors) {
    return {
      allowed: true,
      promptForFactors: true,
    };
  }

  // All other transitions are allowed
  // - Later → Next (commits work)
  // - Next → Later (uncommits)
  // - Now → Next (deprioritizes)
  // - Now → Later (uncommits)
  // - Any → Done (completes)
  // - Any → Dropped (cancels)
  return { allowed: true };
}

/**
 * Get a user-friendly message for the lane transition
 */
export function getTransitionMessage(
  fromLane: RoadmapLane,
  targetLane: RoadmapLane
): string {
  const messages: Record<string, string> = {
    'later-next': 'Committing work to Next',
    'later-now': 'Moving to Now (ready for implementation)',
    'next-now': 'Moving to Now (ready for implementation)',
    'next-later': 'Moving back to Later (uncommitting)',
    'now-next': 'Deprioritizing to Next',
    'now-later': 'Moving back to Later (uncommitting)',
    'now-done': 'Marking as complete',
    'next-done': 'Marking as complete',
    'later-done': 'Marking as complete',
    'now-dropped': 'Dropping work',
    'next-dropped': 'Dropping work',
    'later-dropped': 'Dropping work',
  };

  return messages[`${fromLane}-${targetLane}`] || `Moving to ${targetLane}`;
}

/**
 * Get the lane order (for determining drag direction)
 */
export function getLaneOrder(lane: RoadmapLane): number {
  const order: Record<RoadmapLane, number> = {
    now: 0,
    next: 1,
    later: 2,
    done: 3,
    dropped: 4,
  };
  return order[lane];
}

/**
 * Check if moving "up" in priority (toward Now)
 */
export function isMovingUp(fromLane: RoadmapLane, targetLane: RoadmapLane): boolean {
  return getLaneOrder(targetLane) < getLaneOrder(fromLane);
}

/**
 * Get visual feedback class for drop target
 */
export function getDropTargetClass(
  isOver: boolean,
  canDrop: boolean
): string {
  if (!isOver) return '';
  return canDrop
    ? 'ring-2 ring-primary bg-primary/5'
    : 'ring-2 ring-destructive bg-destructive/5';
}
