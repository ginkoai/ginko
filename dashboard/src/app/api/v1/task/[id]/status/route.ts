/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, task-status, epic-015, sprint-0, graph-authoritative]
 * @related: [../assign/route.ts, ../../../sprint/[id]/status/route.ts, ../../../epic/[id]/status/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * PATCH /api/v1/task/:id/status
 * Update task status directly in graph (ADR-060: Graph-Authoritative State)
 *
 * Request Body:
 * - graphId: Graph ID for context (required)
 * - status: New status value (required)
 * - reason: Required for 'blocked' status
 *
 * Valid Status Values:
 * - not_started: Task pending
 * - in_progress: Task actively being worked on
 * - blocked: Task blocked (requires reason)
 * - complete: Task finished
 *
 * Returns (200):
 * - success: true
 * - task: { id, status, status_updated_at, status_updated_by }
 * - previous_status: Previous status value
 *
 * Returns (400): Invalid status or missing required fields
 * Returns (401): Authentication required
 * Returns (404): Task not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';
import { emitStatusChangeEvent } from '../../../graph/status-events';
import { updateUserActivity } from '../../../graph/user-activity';

// Valid task status values
const VALID_STATUSES = ['not_started', 'in_progress', 'blocked', 'complete'] as const;
type TaskStatus = typeof VALID_STATUSES[number];

interface UpdateStatusRequest {
  graphId: string;
  status: TaskStatus;
  reason?: string;
}

interface UpdateStatusResponse {
  success: boolean;
  task: {
    id: string;
    status: TaskStatus;
    status_updated_at: string;
    status_updated_by: string;
    blocked_reason?: string;
  };
  previous_status: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Extract user ID from Bearer token
 * In production, this would decode the JWT or look up the API key
 */
function extractUserId(token: string): string {
  // For gk_ API keys, hash to get consistent user ID
  if (token.startsWith('gk_')) {
    return 'user_' + Buffer.from(token).toString('base64').substring(0, 12);
  }
  // For OAuth tokens, the user ID would be extracted from JWT
  return 'user_' + Buffer.from(token).toString('base64').substring(0, 12);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Task Status API] PATCH /api/v1/task/:id/status called');

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

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        } as ErrorResponse,
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = extractUserId(token);

    // Get task ID from params
    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_TASK_ID',
            message: 'Task ID is required in URL path',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateStatusRequest = await request.json();

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

    // Validate status
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate reason is required for blocked status
    if (body.status === 'blocked' && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_BLOCKED_REASON',
            message: 'reason is required when setting status to blocked',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Update task status in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (t:Task {id: $taskId, graph_id: $graphId})
          WITH t, t.status as previousStatus
          SET t.status = $status,
              t.status_updated_at = datetime(),
              t.status_updated_by = $userId,
              t.blocked_reason = CASE WHEN $status = 'blocked' THEN $reason ELSE null END,
              t.updated_at = datetime()
          RETURN t.id as id,
                 t.status as status,
                 t.status_updated_at as status_updated_at,
                 t.status_updated_by as status_updated_by,
                 t.blocked_reason as blocked_reason,
                 previousStatus
          `,
          {
            taskId,
            graphId: body.graphId.trim(),
            status: body.status,
            userId,
            reason: body.reason?.trim() || null,
          }
        );
      });

      // Check if task was found
      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'TASK_NOT_FOUND',
              message: `Task '${taskId}' not found in graph '${body.graphId}'`,
            },
          } as ErrorResponse,
          { status: 404 }
        );
      }

      const record = result.records[0];
      const previousStatus = record.get('previousStatus') || 'unknown';

      // Build response
      const response: UpdateStatusResponse = {
        success: true,
        task: {
          id: record.get('id'),
          status: record.get('status'),
          status_updated_at: record.get('status_updated_at')?.toString() || new Date().toISOString(),
          status_updated_by: record.get('status_updated_by'),
        },
        previous_status: previousStatus,
      };

      // Include blocked_reason if present
      const blockedReason = record.get('blocked_reason');
      if (blockedReason) {
        response.task.blocked_reason = blockedReason;
      }

      // Emit status change event (non-blocking, won't fail the request)
      await emitStatusChangeEvent(session, {
        entity_type: 'task',
        entity_id: taskId,
        graph_id: body.graphId.trim(),
        old_status: previousStatus,
        new_status: body.status,
        changed_by: userId,
        changed_at: new Date().toISOString(),
        reason: body.reason?.trim(),
      });

      // EPIC-016 Sprint 3 Task 3: Update user's last activity timestamp
      // Maps status to activity type: in_progress->task_start, complete->task_complete, blocked->task_block
      const { statusToActivityType } = await import('../../../graph/user-activity');
      const activityType = statusToActivityType(body.status);
      if (activityType) {
        await updateUserActivity(session, body.graphId.trim(), userId, activityType);
      }

      console.log('[Task Status API] Task status updated:', taskId, previousStatus, '->', body.status);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Status API] ERROR updating task status:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update task status',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/task/:id/status
 * Get current task status from graph
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Task Status API] GET /api/v1/task/:id/status called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    // Get graphId from query params
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    const taskId = params.id;

    // Query task status
    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (t:Task {id: $taskId, graph_id: $graphId})
          RETURN t.id as id,
                 t.status as status,
                 t.status_updated_at as status_updated_at,
                 t.status_updated_by as status_updated_by,
                 t.blocked_reason as blocked_reason
          `,
          { taskId, graphId }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: { code: 'TASK_NOT_FOUND', message: `Task '${taskId}' not found` } },
          { status: 404 }
        );
      }

      const record = result.records[0];
      return NextResponse.json({
        id: record.get('id'),
        status: record.get('status') || 'not_started',
        status_updated_at: record.get('status_updated_at')?.toString() || null,
        status_updated_by: record.get('status_updated_by') || null,
        blocked_reason: record.get('blocked_reason') || null,
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Status API] ERROR getting task status:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get task status' } },
      { status: 500 }
    );
  }
}
