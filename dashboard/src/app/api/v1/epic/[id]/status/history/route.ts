/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, epic-status, history, epic-015, sprint-0, graph-authoritative]
 * @related: [../route.ts, ../../../../graph/status-events.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/epic/:id/status/history
 * Get status change history for an epic (EPIC-015 Sprint 0 Task 5)
 *
 * Query Parameters:
 * - graphId: Graph ID for context (required)
 * - limit: Max events to return (default: 50, max: 100)
 *
 * Returns (200):
 * - history: Array of status change events
 *
 * Returns (400): Missing graphId
 * Returns (404): Epic not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../../graph/_neo4j';
import { getStatusHistory } from '../../../../graph/status-events';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Epic Status History API] GET /api/v1/epic/:id/status/history called');

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
    const limitParam = searchParams.get('limit');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    const epicId = params.id;
    const limit = Math.min(parseInt(limitParam || '50', 10) || 50, 100);

    // Query status history
    const session = getSession();
    try {
      // First verify epic exists
      const epicCheck = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (e:Epic {id: $epicId, graph_id: $graphId}) RETURN e.id as id`,
          { epicId, graphId }
        );
      });

      if (epicCheck.records.length === 0) {
        return NextResponse.json(
          { error: { code: 'EPIC_NOT_FOUND', message: `Epic '${epicId}' not found` } },
          { status: 404 }
        );
      }

      // Get status history
      const history = await getStatusHistory(session, 'epic', epicId, graphId, limit);

      return NextResponse.json({
        epic_id: epicId,
        history,
        count: history.length,
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Epic Status History API] ERROR:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get status history' } },
      { status: 500 }
    );
  }
}
