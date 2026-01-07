/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, ids, ADR-058]
 * @related: [../check/route.ts, ../sync/route.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/epic/ids
 *
 * Get all Epic IDs in a graph
 * Used for finding next available ID during conflict resolution
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required)
 *
 * Returns:
 * - ids: string[] (array of epic IDs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';

export async function GET(request: NextRequest) {
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

    // Get all epic IDs
    const query = `
      MATCH (e:Epic {graphId: $graphId})
      RETURN e.id as id
      ORDER BY e.id
    `;

    const result = await runQuery(query, { graphId });
    const ids = result.map((r) => r.id as string);

    return NextResponse.json({ ids });

  } catch (error) {
    console.error('[Epic IDs] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
