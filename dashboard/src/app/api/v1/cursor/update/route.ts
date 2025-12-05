/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, cursor, realtime, epic-004, multi-agent]
 * @related: [../../agent/route.ts, ../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 *
 * POST /api/v1/cursor/update
 * Update cursor position for real-time multi-agent coordination
 *
 * Request Body:
 * - userId: User email/ID
 * - projectId: Project identifier
 * - branch: Git branch name
 * - lastEventId: Most recent event ID (optional)
 * - currentTask: Currently claimed task ID (optional)
 * - status: 'active' | 'idle' | 'busy'
 * - timestamp: ISO timestamp
 * - action: Type of action that triggered update (optional)
 *
 * Returns:
 * - success: Boolean
 * - cursor: Updated cursor state
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';

interface CursorUpdateRequest {
  userId: string;
  projectId: string;
  branch: string;
  lastEventId?: string;
  currentTask?: string;
  status: 'active' | 'idle' | 'busy';
  timestamp: string;
  action?: 'session_start' | 'event_logged' | 'task_claimed' | 'task_completed' | 'handoff';
}

interface CursorUpdateResponse {
  success: boolean;
  cursor: {
    userId: string;
    projectId: string;
    lastEventId?: string;
    updatedAt: string;
  };
}

/**
 * Extract organization_id from Bearer token
 * Format: 'org_' + first 8 chars of base64 encoded token
 */
function extractOrganizationId(token: string): string {
  if (!token || token.length < 8) {
    throw new Error('Invalid bearer token');
  }
  return 'org_' + Buffer.from(token).toString('base64').substring(0, 8);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Cursor API] POST /api/v1/cursor/update called');

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
        },
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const organizationId = extractOrganizationId(token);

    // Parse request body
    const body: CursorUpdateRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.projectId || !body.status) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'userId, projectId, and status are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate status enum
    if (!['active', 'idle', 'busy'].includes(body.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: 'status must be one of: active, idle, busy',
          },
        },
        { status: 400 }
      );
    }

    // Upsert cursor in Neo4j
    // Pattern: MERGE on (userId, projectId, branch) - unique cursor per user per project per branch
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MERGE (c:Cursor {
            user_id: $userId,
            project_id: $projectId,
            branch: $branch,
            organization_id: $organizationId
          })
          SET c.last_event_id = $lastEventId,
              c.current_task = $currentTask,
              c.status = $status,
              c.last_action = $action,
              c.updated_at = datetime($timestamp)
          RETURN c.user_id as userId,
                 c.project_id as projectId,
                 c.branch as branch,
                 c.last_event_id as lastEventId,
                 c.status as status,
                 c.updated_at as updatedAt
          `,
          {
            userId: body.userId,
            projectId: body.projectId,
            branch: body.branch || 'main',
            organizationId,
            lastEventId: body.lastEventId || null,
            currentTask: body.currentTask || null,
            status: body.status,
            action: body.action || null,
            timestamp: body.timestamp || new Date().toISOString(),
          }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'CURSOR_UPDATE_FAILED',
              message: 'Failed to update cursor',
            },
          },
          { status: 500 }
        );
      }

      const record = result.records[0];
      const response: CursorUpdateResponse = {
        success: true,
        cursor: {
          userId: record.get('userId'),
          projectId: record.get('projectId'),
          lastEventId: record.get('lastEventId'),
          updatedAt: record.get('updatedAt')?.toString() || new Date().toISOString(),
        },
      };

      const latency = Date.now() - startTime;
      console.log(`[Cursor API] Updated in ${latency}ms: ${body.userId}@${body.projectId}/${body.branch}`);

      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Cursor API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update cursor',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/cursor/update?userId=X&projectId=Y
 * Get current cursor position for a user
 */
export async function GET(request: NextRequest) {
  console.log('[Cursor API] GET /api/v1/cursor/update called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable.',
          },
        },
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required.',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const organizationId = extractOrganizationId(token);

    // Get query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const branch = searchParams.get('branch') || 'main';

    if (!userId || !projectId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_PARAMS',
            message: 'userId and projectId query parameters are required',
          },
        },
        { status: 400 }
      );
    }

    // Query cursor from Neo4j
    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (c:Cursor {
            user_id: $userId,
            project_id: $projectId,
            branch: $branch,
            organization_id: $organizationId
          })
          RETURN c.user_id as userId,
                 c.project_id as projectId,
                 c.branch as branch,
                 c.last_event_id as lastEventId,
                 c.current_task as currentTask,
                 c.status as status,
                 c.last_action as lastAction,
                 c.updated_at as updatedAt
          `,
          {
            userId,
            projectId,
            branch,
            organizationId,
          }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'CURSOR_NOT_FOUND',
              message: 'No cursor found for this user/project/branch',
            },
          },
          { status: 404 }
        );
      }

      const record = result.records[0];
      return NextResponse.json({
        cursor: {
          userId: record.get('userId'),
          projectId: record.get('projectId'),
          branch: record.get('branch'),
          lastEventId: record.get('lastEventId'),
          currentTask: record.get('currentTask'),
          status: record.get('status'),
          lastAction: record.get('lastAction'),
          updatedAt: record.get('updatedAt')?.toString(),
        },
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Cursor API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get cursor',
        },
      },
      { status: 500 }
    );
  }
}
