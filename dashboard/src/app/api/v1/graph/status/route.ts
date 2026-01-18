/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, graph, status, neo4j, statistics, adhoc_260117_s01]
 * @related: [../_neo4j.ts, ../init/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../_neo4j';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';

interface GraphStatusResponse {
  namespace: string;
  graphId: string;
  visibility: 'private' | 'organization' | 'public';
  nodes: {
    total: number;
    byType: Record<string, number>;
    withEmbeddings: number;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
  };
  lastSync: string;
  health: string;
  stats?: {
    averageConnections: number;
    mostConnected: {
      id: string;
      connections: number;
    };
  };
}

/**
 * GET /api/v1/graph/status
 * Get graph statistics and health status
 */
export async function GET(request: NextRequest) {
  console.log('[Graph Status API] GET /api/v1/graph/status called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable',
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
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Get graphId from query params
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const debug = searchParams.get('debug') === 'true';

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'graphId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    console.log('[Graph Status API] Fetching status for graphId:', graphId);

    // Verify user has access to this graph (ADR-060: Data Isolation)
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      console.log(`[Graph Status API] Access denied for graphId: ${graphId}, error: ${access.error}`);
      return NextResponse.json(
        {
          error: {
            code: access.error === 'Graph not found' ? 'GRAPH_NOT_FOUND' : 'ACCESS_DENIED',
            message: access.error || 'You do not have access to this graph',
          },
        },
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }
    console.log(`[Graph Status API] Access granted for graphId: ${graphId}, role: ${access.role}`);

    // Get project node
    const projectQuery = `
      MATCH (p:Project {graphId: $graphId})
      RETURN p
    `;

    const projectResults = await runQuery(projectQuery, { graphId });

    if (projectResults.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Graph not found',
          },
        },
        { status: 404 }
      );
    }

    const project = projectResults[0].p.properties;

    // Query 1: Node counts by type
    // Note: Standard properties are graphId (Project/Epic) and graph_id (other nodes)
    // The graphId parameter MUST match exactly - we filter for non-empty property values
    const nodeStatsQuery = `
      MATCH (n)
      WHERE (n.graphId IS NOT NULL AND n.graphId = $graphId)
         OR (n.graph_id IS NOT NULL AND n.graph_id = $graphId)
      WITH labels(n)[0] as nodeType
      RETURN nodeType as type, count(*) as count
    `;

    // Query 2: Relationship counts by type
    const relStatsQuery = `
      MATCH (n)-[r]->()
      WHERE (n.graphId IS NOT NULL AND n.graphId = $graphId)
         OR (n.graph_id IS NOT NULL AND n.graph_id = $graphId)
      RETURN type(r) as type, count(r) as count
    `;

    interface NodeStatRow {
      type: string;
      count: number;
    }

    interface RelStatRow {
      type: string;
      count: number;
    }

    // Run queries with error handling for each
    let nodeStatsResult: NodeStatRow[] = [];
    let relStatsResult: RelStatRow[] = [];

    try {
      nodeStatsResult = await runQuery<NodeStatRow>(nodeStatsQuery, { graphId });
    } catch (nodeErr) {
      console.warn('[Graph Status API] Node stats query failed:', nodeErr);
    }

    try {
      relStatsResult = await runQuery<RelStatRow>(relStatsQuery, { graphId });
    } catch (relErr) {
      console.warn('[Graph Status API] Rel stats query failed:', relErr);
    }

    // Process query results
    const byType: Record<string, number> = {};
    let totalNodes = 0;
    const relByType: Record<string, number> = {};
    let totalRels = 0;

    // Process node stats
    nodeStatsResult.forEach((row) => {
      if (row.type) {
        const count = typeof row.count === 'number' ? row.count : Number(row.count);
        byType[row.type] = count;
        totalNodes += count;
      }
    });

    // Process relationship stats
    relStatsResult.forEach((row) => {
      if (row.type) {
        const count = typeof row.count === 'number' ? row.count : Number(row.count);
        relByType[row.type] = count;
        totalRels += count;
      }
    });

    // Simplified: Don't query embeddings and connections (rarely used, expensive)
    const withEmbeddings = 0;
    const averageConnections = 0;
    const mostConnected = { id: 'none', connections: 0 };

    // Debug info - only fetch if requested
    let debugInfo: Record<string, any> | undefined;
    if (debug) {
      try {
        // Get unique graphIds in database to detect data leakage
        const uniqueGraphIdsQuery = `
          MATCH (n)
          WHERE n.graphId IS NOT NULL OR n.graph_id IS NOT NULL
          WITH COALESCE(n.graphId, n.graph_id) as gid
          RETURN DISTINCT gid as graphId, count(*) as count
          ORDER BY count DESC
          LIMIT 10
        `;
        const uniqueGraphIds = await runQuery<{ graphId: string; count: number }>(uniqueGraphIdsQuery, {});

        // Get sample nodes for each type in this graphId
        const sampleNodesQuery = `
          MATCH (n)
          WHERE (n.graphId = $graphId OR n.graph_id = $graphId)
          WITH labels(n)[0] as nodeType, n.id as nodeId, n.title as title
          RETURN nodeType, collect({id: nodeId, title: title})[0..3] as samples
        `;
        const sampleNodes = await runQuery<{ nodeType: string; samples: any[] }>(sampleNodesQuery, { graphId });

        // Count nodes without any graphId
        const orphanCountQuery = `
          MATCH (n)
          WHERE n.graphId IS NULL AND n.graph_id IS NULL
          RETURN count(n) as orphanCount
        `;
        const orphanResult = await runQuery<{ orphanCount: number }>(orphanCountQuery, {});

        debugInfo = {
          uniqueGraphIds,
          sampleNodes,
          orphanCount: orphanResult[0]?.orphanCount || 0,
          requestedGraphId: graphId,
        };
      } catch (debugError) {
        console.error('[Graph Status API] Debug query error:', debugError);
        debugInfo = { error: 'Failed to fetch debug info' };
      }
    }

    // Convert Neo4j DateTime to ISO string
    const lastSyncValue = project.updatedAt || project.createdAt;
    const lastSyncStr = lastSyncValue?.toString
      ? lastSyncValue.toString()
      : new Date().toISOString();

    const response: GraphStatusResponse & { debug?: Record<string, any> } = {
      namespace: project.namespace || '',
      graphId: project.graphId,
      visibility: project.visibility || 'private',
      nodes: {
        total: totalNodes,
        byType,
        withEmbeddings,
      },
      relationships: {
        total: totalRels,
        byType: relByType,
      },
      lastSync: lastSyncStr,
      health: 'healthy',
      stats: {
        averageConnections,
        mostConnected,
      },
      ...(debugInfo && { debug: debugInfo }),
    };

    console.log('[Graph Status API] Returning status:', response);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Graph Status API] Error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
