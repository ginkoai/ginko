/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-21
 * @tags: [api, team, status, epic-016, sprint-3]
 * @related: [../../sprint/active/route.ts, ../../../lib/graph/access.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/team/status
 * Fetch team-wide work status including member progress and unassigned work
 *
 * Query Parameters:
 * - graphId: Graph ID for context (required)
 *
 * Returns (200):
 * - members: Array of team member work status
 * - unassigned: Array of sprints with unassigned tasks
 * - summary: Aggregate statistics
 *
 * Authentication:
 * - Bearer token required in Authorization header
 * - User must have access to the specified graph
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';
import { getSession, verifyConnection } from '../../graph/_neo4j';

interface MemberStatus {
  email: string;
  name?: string;
  activeSprint: {
    id: string;
    title: string;
    epic: { id: string; title: string };
  } | null;
  progress: {
    complete: number;
    total: number;
    inProgress: number;
  };
  lastActivity: string | null;
}

interface UnassignedSprint {
  sprintId: string;
  sprintTitle: string;
  epicTitle: string;
  taskCount: number;
}

interface TeamStatusResponse {
  members: MemberStatus[];
  unassigned: UnassignedSprint[];
  summary: {
    totalMembers: number;
    activeMembers: number; // activity in last 24h
    totalUnassigned: number;
  };
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function GET(request: NextRequest) {
  console.log('[Team Status API] GET /api/v1/team/status called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable. Please try again later.',
          },
        } as ErrorResponse,
        { status: 503 }
      );
    }

    // Get graphId from query params
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId query parameter is required',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Verify access to the graph
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: {
            code: 'ACCESS_DENIED',
            message: access.error || 'Access denied to this graph',
          },
        } as ErrorResponse,
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }

    const session = getSession();
    try {
      // Query 1: Get all unique assignees with their progress
      // Uses owner field (primary) and assignee field (fallback) for task assignment
      const membersResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          // Find all tasks with assignees in this graph
          // Graph -[CONTAINS]-> Sprint -[CONTAINS]-> Task
          MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)-[:CONTAINS]->(t:Task)
          WHERE (t.owner IS NOT NULL AND t.owner <> '') OR (t.assignee IS NOT NULL AND t.assignee <> '')

          // Get the epic for context
          OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)

          // Use assignee field (preferred) or owner field
          // Owner field may contain "Name (email)" format or just email
          WITH t, s, e,
               COALESCE(
                 CASE WHEN t.assignee IS NOT NULL AND t.assignee <> '' THEN t.assignee ELSE null END,
                 t.owner
               ) as email

          // Group by assignee and sprint to calculate progress
          WITH email,
               s.id as sprintId,
               COALESCE(s.name, s.title, s.id) as sprintTitle,
               e.id as epicId,
               COALESCE(e.name, e.title, e.id) as epicTitle,
               t.status as taskStatus,
               COALESCE(t.updatedAt, t.updated_at) as lastUpdate

          // Aggregate per assignee per sprint
          WITH email,
               sprintId,
               sprintTitle,
               epicId,
               epicTitle,
               count(*) as totalTasks,
               sum(CASE WHEN taskStatus IN ['complete', 'completed', 'done'] THEN 1 ELSE 0 END) as completeTasks,
               sum(CASE WHEN taskStatus IN ['in_progress', 'active', 'started'] THEN 1 ELSE 0 END) as inProgressTasks,
               max(lastUpdate) as lastActivity

          // Find the most active sprint per user (most recent activity or most tasks)
          WITH email,
               sprintId,
               sprintTitle,
               epicId,
               epicTitle,
               totalTasks,
               completeTasks,
               inProgressTasks,
               lastActivity
          ORDER BY email, lastActivity DESC, totalTasks DESC

          // Take the top sprint per user
          WITH email, collect({
            sprintId: sprintId,
            sprintTitle: sprintTitle,
            epicId: epicId,
            epicTitle: epicTitle,
            totalTasks: totalTasks,
            completeTasks: completeTasks,
            inProgressTasks: inProgressTasks,
            lastActivity: lastActivity
          })[0] as topSprint,
          sum(totalTasks) as allTasks,
          sum(completeTasks) as allComplete,
          sum(inProgressTasks) as allInProgress,
          max(lastActivity) as userLastActivity

          RETURN email,
                 topSprint,
                 allTasks as totalTasks,
                 allComplete as completeTasks,
                 allInProgress as inProgressTasks,
                 userLastActivity as lastActivity
          ORDER BY userLastActivity DESC
          `,
          { graphId }
        );
      });

      // Query 1b: Get user activity from UserActivity nodes (session starts, etc.)
      const userActivityResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (ua:UserActivity {graphId: $graphId})
          RETURN ua.userId as userId,
                 ua.lastActivityAt as lastActivityAt,
                 ua.lastActivityType as lastActivityType
          `,
          { graphId }
        );
      });

      // Build a map of user activity for merging
      const userActivityMap = new Map<string, { lastActivityAt: string; lastActivityType: string }>();
      for (const record of userActivityResult.records) {
        const userId = record.get('userId') as string;
        const lastActivityAt = record.get('lastActivityAt');
        const lastActivityType = record.get('lastActivityType') as string;
        if (userId && lastActivityAt) {
          userActivityMap.set(userId, {
            lastActivityAt: formatDateTime(lastActivityAt) || '',
            lastActivityType: lastActivityType || 'unknown',
          });
        }
      }

      // Query 2: Get unassigned tasks grouped by sprint
      const unassignedResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          // Find all tasks without assignees
          // Graph -[CONTAINS]-> Sprint -[CONTAINS]-> Task
          MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)-[:CONTAINS]->(t:Task)
          WHERE (t.owner IS NULL OR t.owner = '')
            AND (t.assignee IS NULL OR t.assignee = '')
            AND NOT t.status IN ['complete', 'completed', 'done']

          // Get epic info
          OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)

          // Group by sprint
          WITH s.id as sprintId,
               COALESCE(s.name, s.title, 'Untitled Sprint') as sprintTitle,
               COALESCE(e.name, e.title, 'No Epic') as epicTitle,
               count(t) as taskCount
          WHERE taskCount > 0

          RETURN sprintId, sprintTitle, epicTitle, taskCount
          ORDER BY taskCount DESC
          `,
          { graphId }
        );
      });

      // Process member results and merge with UserActivity data
      const members: MemberStatus[] = membersResult.records.map((record) => {
        const email = record.get('email') as string;
        const topSprint = record.get('topSprint') as {
          sprintId: string | null;
          sprintTitle: string | null;
          epicId: string | null;
          epicTitle: string | null;
        } | null;
        const totalTasks = toNumber(record.get('totalTasks'));
        const completeTasks = toNumber(record.get('completeTasks'));
        const inProgressTasks = toNumber(record.get('inProgressTasks'));
        const taskLastActivity = record.get('lastActivity');

        // Get UserActivity timestamp if available
        const userActivity = userActivityMap.get(email);

        // Use the most recent activity timestamp
        const taskActivityStr = taskLastActivity ? formatDateTime(taskLastActivity) : null;
        const userActivityStr = userActivity?.lastActivityAt || null;

        let lastActivity: string | null = null;
        if (taskActivityStr && userActivityStr) {
          // Compare and use the most recent
          lastActivity = new Date(taskActivityStr) > new Date(userActivityStr)
            ? taskActivityStr
            : userActivityStr;
        } else {
          lastActivity = taskActivityStr || userActivityStr;
        }

        return {
          email,
          activeSprint:
            topSprint && topSprint.sprintId
              ? {
                  id: topSprint.sprintId,
                  title: topSprint.sprintTitle || 'Untitled Sprint',
                  epic: {
                    id: topSprint.epicId || 'unknown',
                    title: topSprint.epicTitle || 'Unknown Epic',
                  },
                }
              : null,
          progress: {
            complete: completeTasks,
            total: totalTasks,
            inProgress: inProgressTasks,
          },
          lastActivity,
        };
      });

      // Process unassigned results
      const unassigned: UnassignedSprint[] = unassignedResult.records
        .filter((record) => record.get('sprintId') !== null)
        .map((record) => ({
          sprintId: record.get('sprintId') as string,
          sprintTitle: record.get('sprintTitle') as string,
          epicTitle: record.get('epicTitle') as string,
          taskCount: toNumber(record.get('taskCount')),
        }));

      // Calculate summary
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeMembers = members.filter((m) => {
        if (!m.lastActivity) return false;
        const activityDate = new Date(m.lastActivity);
        return activityDate > oneDayAgo;
      }).length;

      const totalUnassigned = unassigned.reduce((sum, s) => sum + s.taskCount, 0);

      const response: TeamStatusResponse = {
        members,
        unassigned,
        summary: {
          totalMembers: members.length,
          activeMembers,
          totalUnassigned,
        },
      };

      console.log(
        '[Team Status API] Returning status:',
        members.length,
        'members,',
        unassigned.length,
        'sprints with unassigned work'
      );

      return NextResponse.json(response, { status: 200 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Team Status API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch team status',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * Convert Neo4j integer to JavaScript number
 */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  // Handle Neo4j Integer objects with low/high
  if (typeof value === 'object' && 'low' in value) {
    return (value as { low: number }).low;
  }
  return parseInt(String(value), 10) || 0;
}

/**
 * Format Neo4j DateTime to ISO string
 */
function formatDateTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'toString' in value) {
    return (value as { toString: () => string }).toString();
  }
  return null;
}
