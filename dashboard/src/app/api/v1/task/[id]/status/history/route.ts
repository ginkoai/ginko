/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, task-status, history, epic-015, sprint-0, graph-authoritative]
 * @related: [../route.ts, ../../../../graph/status-events.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/:id/status/history
 * Get status change history for a task (EPIC-015 Sprint 0 Task 5)
 *
 * Query Parameters:
 * - graphId: Graph ID for context (required)
 * - limit: Max events to return (default: 50, max: 100)
 *
 * Returns (200):
 * - history: Array of status change events
 *
 * Returns (400): Missing graphId
 * Returns (404): Task not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../../graph/_neo4j';
import { getStatusHistory } from '../../../../graph/status-events';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Task Status History API] GET /api/v1/task/:id/status/history called');

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

    const taskId = params.id;
    const limit = Math.min(parseInt(limitParam || '50', 10) || 50, 100);

    // Query status history
    const session = getSession();
    try {
      // First verify task exists
      const taskCheck = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (t:Task {id: $taskId, graph_id: $graphId}) RETURN t.id as id`,
          { taskId, graphId }
        );
      });

      if (taskCheck.records.length === 0) {
        return NextResponse.json(
          { error: { code: 'TASK_NOT_FOUND', message: `Task '${taskId}' not found` } },
          { status: 404 }
        );
      }

      // Get status history
      const history = await getStatusHistory(session, 'task', taskId, graphId, limit);

      return NextResponse.json({
        task_id: taskId,
        history,
        count: history.length,
      });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Status History API] ERROR:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get status history' } },
      { status: 500 }
    );
  }
}
