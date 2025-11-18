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

    // Get node statistics
    const nodeStatsQuery = `
      MATCH (n)
      WHERE n.graphId = $graphId OR n.projectId = $graphId
      RETURN labels(n)[0] as type, count(n) as count
    `;

    const nodeStats = await runQuery<{ type: string; count: number }>(nodeStatsQuery, { graphId });

    const byType: Record<string, number> = {};
    let totalNodes = 0;

    nodeStats.forEach(stat => {
      const count = typeof stat.count === 'number' ? stat.count : Number(stat.count);
      byType[stat.type] = count;
      totalNodes += count;
    });

    // Get relationship statistics
    const relStatsQuery = `
      MATCH (n)-[r]->(m)
      WHERE n.graphId = $graphId OR n.projectId = $graphId
      RETURN type(r) as type, count(r) as count
    `;

    const relStats = await runQuery<{ type: string; count: number }>(relStatsQuery, { graphId });

    const relByType: Record<string, number> = {};
    let totalRels = 0;

    relStats.forEach(stat => {
      const count = typeof stat.count === 'number' ? stat.count : Number(stat.count);
      relByType[stat.type] = count;
      totalRels += count;
    });

    // Calculate embeddings count (nodes with embedding property)
    const embeddingsQuery = `
      MATCH (n)
      WHERE (n.graphId = $graphId OR n.projectId = $graphId) AND n.embedding IS NOT NULL
      RETURN count(n) as count
    `;

    const embeddingsResult = await runQuery<{ count: number }>(embeddingsQuery, { graphId });
    const withEmbeddings = embeddingsResult.length > 0
      ? (typeof embeddingsResult[0].count === 'number' ? embeddingsResult[0].count : Number(embeddingsResult[0].count))
      : 0;

    // Calculate average connections
    const avgConnectionsQuery = `
      MATCH (n)
      WHERE n.graphId = $graphId OR n.projectId = $graphId
      OPTIONAL MATCH (n)-[r]-()
      WITH n, count(r) as connections
      RETURN avg(connections) as avgConnections
    `;

    const avgResult = await runQuery<{ avgConnections: number }>(avgConnectionsQuery, { graphId });
    const averageConnections = avgResult.length > 0 && avgResult[0].avgConnections
      ? Number(avgResult[0].avgConnections)
      : 0;

    // Find most connected node
    const mostConnectedQuery = `
      MATCH (n)
      WHERE n.graphId = $graphId OR n.projectId = $graphId
      OPTIONAL MATCH (n)-[r]-()
      WITH n, count(r) as connections
      ORDER BY connections DESC
      LIMIT 1
      RETURN n.id as id, connections
    `;

    const mostConnectedResult = await runQuery<{ id: string; connections: number }>(mostConnectedQuery, { graphId });
    const mostConnected = mostConnectedResult.length > 0
      ? {
          id: mostConnectedResult[0].id || 'unknown',
          connections: typeof mostConnectedResult[0].connections === 'number'
            ? mostConnectedResult[0].connections
            : Number(mostConnectedResult[0].connections || 0)
        }
      : { id: 'none', connections: 0 };

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
