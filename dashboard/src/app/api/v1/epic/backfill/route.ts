/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, backfill, ADR-058, data-integrity]
 * @related: [../sync/route.ts, ../check/route.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/epic/backfill
 *
 * Backfill createdBy field for existing epics (ADR-058)
 * Sets createdBy to graph owner for epics created before tracking was added
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required)
 * - defaultOwner: Email to set as createdBy (defaults to graph owner)
 *
 * Returns:
 * - updated: number of epics updated
 * - epics: list of updated epic IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token for authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const defaultOwner = searchParams.get('defaultOwner') || 'chris@watchhill.ai';

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Backfill createdBy for epics without it
    const backfillQuery = `
      MATCH (e:Epic {graphId: $graphId})
      WHERE e.createdBy IS NULL OR e.createdBy = 'unknown'
      SET e.createdBy = $defaultOwner,
          e.backfilledAt = datetime()
      RETURN e.id as id, e.title as title
    `;

    const result = await runQuery(backfillQuery, {
      graphId,
      defaultOwner,
    });

    const updatedEpics = result.map((r) => ({
      id: r.id,
      title: r.title,
    }));

    return NextResponse.json({
      success: true,
      updated: updatedEpics.length,
      epics: updatedEpics,
      defaultOwner,
    });

  } catch (error) {
    console.error('[Epic Backfill] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
