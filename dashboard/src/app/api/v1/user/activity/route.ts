/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-21
 * @tags: [api, user, activity, epic-016, sprint-3]
 * @related: [../../team/status/route.ts, ../../task/[id]/status/route.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/user/activity
 * Record user activity in the graph (EPIC-016 Sprint 3)
 *
 * Called on:
 * - Session start (ginko start)
 * - Task status changes (automatically via task status API)
 *
 * Request Body:
 * - graphId: Graph ID for context (required)
 * - activityType: Type of activity (required)
 * - email: User email (optional, derived from token if not provided)
 *
 * Returns (200):
 * - success: true
 * - lastActivityAt: ISO timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';
import { getSession, verifyConnection } from '../../graph/_neo4j';

type ActivityType = 'session_start' | 'task_start' | 'task_complete' | 'task_block' | 'event_logged';

interface ActivityRequest {
  graphId: string;
  activityType: ActivityType;
  email?: string;
  taskId?: string;
}

interface ActivityResponse {
  success: boolean;
  lastActivityAt: string;
  activityType: ActivityType;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('[User Activity API] POST /api/v1/user/activity called');

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

    // Parse request body
    const body: ActivityRequest = await request.json();

    // Validate graphId
    if (!body.graphId || typeof body.graphId !== 'string' || body.graphId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate activityType
    const validTypes: ActivityType[] = ['session_start', 'task_start', 'task_complete', 'task_block', 'event_logged'];
    if (!body.activityType || !validTypes.includes(body.activityType)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ACTIVITY_TYPE',
            message: `activityType must be one of: ${validTypes.join(', ')}`,
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Verify access to the graph
    const access = await verifyGraphAccessFromRequest(request, body.graphId, 'write');
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

    const now = new Date().toISOString();
    const session = getSession();

    try {
      // Update user's last activity timestamp
      // Creates or updates a UserActivity node linked to the graph
      await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (g:Graph {graphId: $graphId})
          MERGE (ua:UserActivity {graphId: $graphId, userId: $userId})
          ON CREATE SET
            ua.createdAt = datetime(),
            ua.lastActivityAt = datetime(),
            ua.lastActivityType = $activityType,
            ua.sessionCount = 1
          ON MATCH SET
            ua.lastActivityAt = datetime(),
            ua.lastActivityType = $activityType,
            ua.sessionCount = COALESCE(ua.sessionCount, 0) + CASE WHEN $activityType = 'session_start' THEN 1 ELSE 0 END

          // Link to graph if not already linked
          MERGE (g)-[:HAS_USER_ACTIVITY]->(ua)

          RETURN ua.lastActivityAt as lastActivityAt
          `,
          {
            graphId: body.graphId.trim(),
            userId: access.userId,
            activityType: body.activityType,
          }
        );
      });

      const response: ActivityResponse = {
        success: true,
        lastActivityAt: now,
        activityType: body.activityType,
      };

      console.log('[User Activity API] Activity recorded:', access.userId, body.activityType);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[User Activity API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to record activity',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/user/activity
 * Get user's last activity timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    // Verify access
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: { code: 'ACCESS_DENIED', message: access.error } },
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }

    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (ua:UserActivity {graphId: $graphId, userId: $userId})
          RETURN ua.lastActivityAt as lastActivityAt,
                 ua.lastActivityType as lastActivityType,
                 ua.sessionCount as sessionCount
          `,
          { graphId, userId: access.userId }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json({
          lastActivityAt: null,
          lastActivityType: null,
          sessionCount: 0,
        });
      }

      const record = result.records[0];
      return NextResponse.json({
        lastActivityAt: record.get('lastActivityAt')?.toString() || null,
        lastActivityType: record.get('lastActivityType') || null,
        sessionCount: toNumber(record.get('sessionCount')),
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[User Activity API] ERROR getting activity:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity' } },
      { status: 500 }
    );
  }
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  if (typeof value === 'object' && 'low' in value) {
    return (value as { low: number }).low;
  }
  return parseInt(String(value), 10) || 0;
}
