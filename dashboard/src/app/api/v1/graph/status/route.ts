/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-17
 * @tags: [api, graph, status, neo4j, statistics]
 * @related: [../_neo4j.ts, ../init/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../_neo4j';

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

    // OPTIMIZED: Single consolidated query for all statistics
    // Combines 5 separate queries into 1, reducing round trips by 80%
    const consolidatedStatsQuery = `
      // Collect all nodes once for graph
      MATCH (n)
      WHERE n.graphId = $graphId OR n.projectId = $graphId
      WITH collect(n) as allNodes

      // Node stats by type
      UNWIND allNodes as node
      WITH allNodes, labels(node)[0] as nodeType, count(*) as typeCount
      WITH allNodes, collect({type: nodeType, count: typeCount}) as nodeStats

      // Relationship stats
      UNWIND allNodes as n
      OPTIONAL MATCH (n)-[r]->()
      WITH allNodes, nodeStats, type(r) as relType, count(r) as relCount
      WHERE relType IS NOT NULL
      WITH allNodes, nodeStats, collect({type: relType, count: relCount}) as relStats

      // Embeddings count
      UNWIND allNodes as n
      WITH allNodes, nodeStats, relStats,
           sum(CASE WHEN n.embedding IS NOT NULL THEN 1 ELSE 0 END) as embeddingsCount

      // Connection stats (avg and most connected)
      UNWIND allNodes as n
      OPTIONAL MATCH (n)-[r]-()
      WITH allNodes, nodeStats, relStats, embeddingsCount, n, count(r) as connections
      WITH allNodes, nodeStats, relStats, embeddingsCount,
           avg(connections) as avgConnections,
           collect({id: n.id, connections: connections}) as connectionList

      // Find most connected from list
      UNWIND connectionList as conn
      WITH allNodes, nodeStats, relStats, embeddingsCount, avgConnections, conn
      ORDER BY conn.connections DESC
      LIMIT 1

      RETURN nodeStats, relStats, embeddingsCount, avgConnections,
             conn.id as mostConnectedId, conn.connections as mostConnectedCount
    `;

    interface ConsolidatedStats {
      nodeStats: { type: string; count: number }[];
      relStats: { type: string; count: number }[];
      embeddingsCount: number;
      avgConnections: number;
      mostConnectedId: string;
      mostConnectedCount: number;
    }

    const statsResult = await runQuery<ConsolidatedStats>(consolidatedStatsQuery, { graphId });

    // Process consolidated results
    const byType: Record<string, number> = {};
    let totalNodes = 0;
    const relByType: Record<string, number> = {};
    let totalRels = 0;
    let withEmbeddings = 0;
    let averageConnections = 0;
    let mostConnected = { id: 'none', connections: 0 };

    if (statsResult.length > 0) {
      const stats = statsResult[0];

      // Node stats
      if (Array.isArray(stats.nodeStats)) {
        stats.nodeStats.forEach((stat: { type: string; count: number }) => {
          const count = typeof stat.count === 'number' ? stat.count : Number(stat.count);
          byType[stat.type] = count;
          totalNodes += count;
        });
      }

      // Relationship stats
      if (Array.isArray(stats.relStats)) {
        stats.relStats.forEach((stat: { type: string; count: number }) => {
          const count = typeof stat.count === 'number' ? stat.count : Number(stat.count);
          relByType[stat.type] = count;
          totalRels += count;
        });
      }

      // Embeddings
      withEmbeddings = typeof stats.embeddingsCount === 'number'
        ? stats.embeddingsCount
        : Number(stats.embeddingsCount || 0);

      // Average connections
      averageConnections = typeof stats.avgConnections === 'number'
        ? stats.avgConnections
        : Number(stats.avgConnections || 0);

      // Most connected
      if (stats.mostConnectedId) {
        mostConnected = {
          id: stats.mostConnectedId,
          connections: typeof stats.mostConnectedCount === 'number'
            ? stats.mostConnectedCount
            : Number(stats.mostConnectedCount || 0)
        };
      }
    }

    // Convert Neo4j DateTime to ISO string
    const lastSyncValue = project.updatedAt || project.createdAt;
    const lastSyncStr = lastSyncValue?.toString
      ? lastSyncValue.toString()
      : new Date().toISOString();

    const response: GraphStatusResponse = {
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
