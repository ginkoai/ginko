/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, sprint-status, epic-015, sprint-0, graph-authoritative]
 * @related: [../../../task/[id]/status/route.ts, ../../../epic/[id]/status/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * PATCH /api/v1/sprint/:id/status
 * Update sprint status directly in graph (ADR-060: Graph-Authoritative State)
 *
 * Request Body:
 * - graphId: Graph ID for context (required)
 * - status: New status value (required)
 *
 * Valid Status Values:
 * - planned: Sprint not yet started
 * - active: Sprint in progress
 * - paused: Sprint temporarily on hold
 * - complete: Sprint finished
 *
 * Returns (200):
 * - success: true
 * - sprint: { id, status, status_updated_at, status_updated_by }
 * - previous_status: Previous status value
 *
 * Returns (400): Invalid status or missing required fields
 * Returns (401): Authentication required
 * Returns (404): Sprint not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';
import { emitStatusChangeEvent } from '../../../graph/status-events';

// Valid sprint status values
const VALID_STATUSES = ['planned', 'active', 'paused', 'complete'] as const;
type SprintStatus = typeof VALID_STATUSES[number];

interface UpdateStatusRequest {
  graphId: string;
  status: SprintStatus;
}

interface UpdateStatusResponse {
  success: boolean;
  sprint: {
    id: string;
    status: SprintStatus;
    status_updated_at: string;
    status_updated_by: string;
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
 */
function extractUserId(token: string): string {
  if (token.startsWith('gk_')) {
    return 'user_' + Buffer.from(token).toString('base64').substring(0, 12);
  }
  return 'user_' + Buffer.from(token).toString('base64').substring(0, 12);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Sprint Status API] PATCH /api/v1/sprint/:id/status called');

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

    // Get sprint ID from params
    const sprintId = params.id;
    if (!sprintId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_SPRINT_ID',
            message: 'Sprint ID is required in URL path',
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

    // Update sprint status in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (s:Sprint {id: $sprintId, graph_id: $graphId})
          WITH s, s.status as previousStatus
          SET s.status = $status,
              s.status_updated_at = datetime(),
              s.status_updated_by = $userId,
              s.updated_at = datetime()
          RETURN s.id as id,
                 s.status as status,
                 s.status_updated_at as status_updated_at,
                 s.status_updated_by as status_updated_by,
                 previousStatus
          `,
          {
            sprintId,
            graphId: body.graphId.trim(),
            status: body.status,
            userId,
          }
        );
      });

      // Check if sprint was found
      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'SPRINT_NOT_FOUND',
              message: `Sprint '${sprintId}' not found in graph '${body.graphId}'`,
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
        sprint: {
          id: record.get('id'),
          status: record.get('status'),
          status_updated_at: record.get('status_updated_at')?.toString() || new Date().toISOString(),
          status_updated_by: record.get('status_updated_by'),
        },
        previous_status: previousStatus,
      };

      // Emit status change event (non-blocking, won't fail the request)
      await emitStatusChangeEvent(session, {
        entity_type: 'sprint',
        entity_id: sprintId,
        graph_id: body.graphId.trim(),
        old_status: previousStatus,
        new_status: body.status,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });

      console.log('[Sprint Status API] Sprint status updated:', sprintId, previousStatus, '->', body.status);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Sprint Status API] ERROR updating sprint status:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update sprint status',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/sprint/:id/status
 * Get current sprint status from graph
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Sprint Status API] GET /api/v1/sprint/:id/status called');

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

    const sprintId = params.id;

    // Query sprint status
    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (s:Sprint {id: $sprintId, graph_id: $graphId})
          RETURN s.id as id,
                 s.status as status,
                 s.status_updated_at as status_updated_at,
                 s.status_updated_by as status_updated_by
          `,
          { sprintId, graphId }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: { code: 'SPRINT_NOT_FOUND', message: `Sprint '${sprintId}' not found` } },
          { status: 404 }
        );
      }

      const record = result.records[0];
      return NextResponse.json({
        id: record.get('id'),
        status: record.get('status') || 'planned',
        status_updated_at: record.get('status_updated_at')?.toString() || null,
        status_updated_by: record.get('status_updated_by') || null,
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Sprint Status API] ERROR getting sprint status:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get sprint status' } },
      { status: 500 }
    );
  }
}
