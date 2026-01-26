/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [api, user-activity, epic-016, sprint-3, task-3]
 * @related: [../task/[id]/status/route.ts, ../user/activity/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * User Activity Tracking Helper (EPIC-016 Sprint 3 Task 3)
 *
 * Updates user's lastActivityAt timestamp in the graph when:
 * - Task status changes (start, complete, block)
 * - Session starts (ginko start)
 *
 * Creates/updates UserActivity nodes for team visibility.
 */

import { Session } from 'neo4j-driver';

export type ActivityType = 'session_start' | 'task_start' | 'task_complete' | 'task_block' | 'event_logged';

/**
 * Map task status to activity type
 * Returns null for statuses that don't represent user activity
 */
export function statusToActivityType(status: string): ActivityType | null {
  switch (status) {
    case 'in_progress':
      return 'task_start';
    case 'complete':
      return 'task_complete';
    case 'blocked':
      return 'task_block';
    case 'not_started':
      // Resetting a task is not tracked as activity
      return null;
    default:
      return null;
  }
}

/**
 * Update user's last activity timestamp in the graph
 *
 * Creates or updates a UserActivity node for the user in the specified graph.
 * This enables team visibility features showing when each user was last active.
 *
 * @param session - Neo4j session (caller manages lifecycle)
 * @param graphId - Graph namespace identifier
 * @param userId - User ID performing the activity
 * @param activityType - Type of activity being recorded
 * @returns true if successful, false on failure (non-blocking)
 */
export async function updateUserActivity(
  session: Session,
  graphId: string,
  userId: string,
  activityType: ActivityType
): Promise<boolean> {
  try {
    await session.executeWrite(async (tx) => {
      return tx.run(
        `
        // Find or create UserActivity for this user in this graph
        MERGE (ua:UserActivity {graphId: $graphId, userId: $userId})
        ON CREATE SET
          ua.createdAt = datetime(),
          ua.lastActivityAt = datetime(),
          ua.lastActivityType = $activityType,
          ua.sessionCount = CASE WHEN $activityType = 'session_start' THEN 1 ELSE 0 END
        ON MATCH SET
          ua.lastActivityAt = datetime(),
          ua.lastActivityType = $activityType,
          ua.sessionCount = COALESCE(ua.sessionCount, 0) + CASE WHEN $activityType = 'session_start' THEN 1 ELSE 0 END

        // Ensure link to graph exists
        WITH ua
        MATCH (g:Graph {graphId: $graphId})
        MERGE (g)-[:HAS_USER_ACTIVITY]->(ua)

        RETURN ua.lastActivityAt as lastActivityAt
        `,
        {
          graphId,
          userId,
          activityType,
        }
      );
    });

    console.log('[User Activity] Updated:', userId, activityType, 'in', graphId);
    return true;

  } catch (error) {
    // Don't fail the parent operation if activity tracking fails
    console.warn('[User Activity] Failed to update activity:', error);
    return false;
  }
}
