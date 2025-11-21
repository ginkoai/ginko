/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-21
 * @tags: [event-linking, task-detection, graph-relationships, epic-001]
 * @related: [event-logger.ts, sprint-parser.ts, event-queue.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Event-Task Linker (EPIC-001 TASK-4)
 *
 * Extracts task mentions (TASK-XXX patterns) from event descriptions
 * to enable hot/cold task detection via RECENT_ACTIVITY relationships.
 *
 * Usage in graph sync:
 * 1. Extract task IDs from event description
 * 2. Create (Task)<-[:RECENT_ACTIVITY]-(Event) relationships
 * 3. Query recent activity to determine task "hotness"
 *
 * Enables momentum awareness:
 * - Hot tasks: Many recent events (actively being worked on)
 * - Cold tasks: No recent events (stale, needs attention)
 * - Priority surfacing: Show hot tasks first in sprint views
 */

/**
 * Extract task IDs from text
 *
 * Matches patterns like:
 * - "TASK-1"
 * - "TASK-123"
 * - "task-5" (case insensitive)
 * - "Completed TASK-4, started TASK-5"
 *
 * @param text - Event description or any text content
 * @returns Array of unique task IDs (normalized to uppercase)
 *
 * @example
 * extractTaskMentions("Completed TASK-4, started TASK-5")
 * // Returns: ["TASK-4", "TASK-5"]
 */
export function extractTaskMentions(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match TASK-XXX pattern (case insensitive)
  const taskPattern = /TASK-(\d+)/gi;
  const matches = text.matchAll(taskPattern);

  // Extract unique task IDs, normalize to uppercase
  const taskIds = new Set<string>();
  for (const match of matches) {
    const taskId = `TASK-${match[1]}`;
    taskIds.add(taskId);
  }

  return Array.from(taskIds);
}

/**
 * Check if text mentions any tasks
 *
 * @param text - Event description or any text content
 * @returns True if text contains at least one task mention
 */
export function hasTasksMentions(text: string): boolean {
  return extractTaskMentions(text).length > 0;
}

/**
 * Calculate task hotness score based on recent activity
 *
 * Hotness formula:
 * - Events in last 4h: Weight 3x
 * - Events in last 24h: Weight 2x
 * - Events in last 7d: Weight 1x
 *
 * @param events - Array of event timestamps (ISO format)
 * @param now - Current timestamp (for testing)
 * @returns Hotness score (0-100)
 *
 * @example
 * calculateHotness([
 *   "2025-11-21T10:00:00Z", // 2h ago
 *   "2025-11-21T08:00:00Z", // 4h ago
 *   "2025-11-20T10:00:00Z"  // 1d ago
 * ])
 * // Returns: ~85 (high hotness)
 */
export function calculateHotness(
  events: Array<{ timestamp: string }>,
  now: Date = new Date()
): number {
  if (!events || events.length === 0) {
    return 0;
  }

  const nowMs = now.getTime();
  const hour4Ms = 4 * 60 * 60 * 1000;
  const hour24Ms = 24 * 60 * 60 * 1000;
  const day7Ms = 7 * 24 * 60 * 60 * 1000;

  let score = 0;

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime();
    const ageMs = nowMs - eventTime;

    if (ageMs < 0) {
      // Future event (clock skew), ignore
      continue;
    }

    if (ageMs <= hour4Ms) {
      score += 30; // Very recent: 3x weight
    } else if (ageMs <= hour24Ms) {
      score += 20; // Recent: 2x weight
    } else if (ageMs <= day7Ms) {
      score += 10; // This week: 1x weight
    }
    // Events older than 7 days don't contribute
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Classify hotness level for UI display
 *
 * @param hotness - Hotness score (0-100)
 * @returns Level classification
 */
export function getHotnessLevel(hotness: number): 'cold' | 'warm' | 'hot' | 'blazing' {
  if (hotness === 0) return 'cold';
  if (hotness < 30) return 'warm';
  if (hotness < 70) return 'hot';
  return 'blazing';
}
