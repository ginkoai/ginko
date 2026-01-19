/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, epic-status, epic-015, sprint-0, graph-authoritative]
 * @related: [../../../task/[id]/status/route.ts, ../../../sprint/[id]/status/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * PATCH /api/v1/epic/:id/status
 * Update epic status directly in graph (ADR-060: Graph-Authoritative State)
 *
 * Request Body:
 * - graphId: Graph ID for context (required)
 * - status: New status value (required)
 *
 * Valid Status Values:
 * - proposed: Epic under consideration
 * - active: Epic in progress
 * - paused: Epic temporarily on hold
 * - complete: Epic finished
 *
 * Returns (200):
 * - success: true
 * - epic: { id, status, status_updated_at, status_updated_by }
 * - previous_status: Previous status value
 *
 * Returns (400): Invalid status or missing required fields
 * Returns (401): Authentication required
 * Returns (404): Epic not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';
import { emitStatusChangeEvent } from '../../../graph/status-events';

// Valid epic status values
const VALID_STATUSES = ['proposed', 'active', 'paused', 'complete'] as const;
type EpicStatus = typeof VALID_STATUSES[number];

interface UpdateStatusRequest {
  graphId: string;
  status: EpicStatus;
}

interface UpdateStatusResponse {
  success: boolean;
  epic: {
    id: string;
    status: EpicStatus;
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
  console.log('[Epic Status API] PATCH /api/v1/epic/:id/status called');

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

    // Get epic ID from params
    const epicId = params.id;
    if (!epicId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_EPIC_ID',
            message: 'Epic ID is required in URL path',
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

    // Update epic status in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (e:Epic {id: $epicId, graph_id: $graphId})
          WITH e, e.status as previousStatus
          SET e.status = $status,
              e.status_updated_at = datetime(),
              e.status_updated_by = $userId,
              e.updated_at = datetime()
          RETURN e.id as id,
                 e.status as status,
                 e.status_updated_at as status_updated_at,
                 e.status_updated_by as status_updated_by,
                 previousStatus
          `,
          {
            epicId,
            graphId: body.graphId.trim(),
            status: body.status,
            userId,
          }
        );
      });

      // Check if epic was found
      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'EPIC_NOT_FOUND',
              message: `Epic '${epicId}' not found in graph '${body.graphId}'`,
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
        epic: {
          id: record.get('id'),
          status: record.get('status'),
          status_updated_at: record.get('status_updated_at')?.toString() || new Date().toISOString(),
          status_updated_by: record.get('status_updated_by'),
        },
        previous_status: previousStatus,
      };

      // Emit status change event (non-blocking, won't fail the request)
      await emitStatusChangeEvent(session, {
        entity_type: 'epic',
        entity_id: epicId,
        graph_id: body.graphId.trim(),
        old_status: previousStatus,
        new_status: body.status,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });

      console.log('[Epic Status API] Epic status updated:', epicId, previousStatus, '->', body.status);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Epic Status API] ERROR updating epic status:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update epic status',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/epic/:id/status
 * Get current epic status from graph
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Epic Status API] GET /api/v1/epic/:id/status called');

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

    const epicId = params.id;

    // Query epic status
    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (e:Epic {id: $epicId, graph_id: $graphId})
          RETURN e.id as id,
                 e.status as status,
                 e.status_updated_at as status_updated_at,
                 e.status_updated_by as status_updated_by
          `,
          { epicId, graphId }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: { code: 'EPIC_NOT_FOUND', message: `Epic '${epicId}' not found` } },
          { status: 404 }
        );
      }

      const record = result.records[0];
      return NextResponse.json({
        id: record.get('id'),
        status: record.get('status') || 'proposed',
        status_updated_at: record.get('status_updated_at')?.toString() || null,
        status_updated_by: record.get('status_updated_by') || null,
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Epic Status API] ERROR getting epic status:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get epic status' } },
      { status: 500 }
    );
  }
}
