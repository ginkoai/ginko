/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-11
 * @tags: [api, graph, adjacencies, relationships, neo4j]
 * @related: [../_neo4j.ts, ../nodes/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../_neo4j';
import neo4j from 'neo4j-driver';

interface AdjacencyResponse {
  sourceNode: {
    id: string;
    label: string;
    properties: Record<string, any>;
  };
  adjacencies: Array<{
    node: {
      id: string;
      label: string;
      properties: Record<string, any>;
    };
    relationship: {
      type: string;
      direction: 'incoming' | 'outgoing';
      properties: Record<string, any>;
    };
  }>;
  total: number;
}

/**
 * GET /api/v1/graph/adjacencies/[nodeId]
 * Get adjacent nodes (1-hop relationships) for a given node
 *
 * Query params:
 * - graphId (required): The graph namespace
 * - direction (optional): 'incoming' | 'outgoing' | 'both' (default: 'both')
 * - types (optional): Comma-separated relationship types to filter
 * - depth (optional): Relationship depth (default: 1, max: 3)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  console.log('[Adjacencies API] GET /api/v1/graph/adjacencies/', nodeId);

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
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const direction = searchParams.get('direction') || 'both';
    const typesParam = searchParams.get('types');
    const depth = Math.min(parseInt(searchParams.get('depth') || '1', 10), 3);

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    const session = getSession();
    try {
      // First, get the source node
      const sourceResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n {id: $nodeId})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           RETURN n, labels(n) as nodeLabels`,
          { nodeId, graphId }
        );
      });

      if (sourceResult.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'NODE_NOT_FOUND',
              message: `Node with id '${nodeId}' not found in graph '${graphId}'`,
            },
          },
          { status: 404 }
        );
      }

      const sourceRecord = sourceResult.records[0];
      const sourceNodeData = sourceRecord.get('n');
      const sourceLabels = sourceRecord.get('nodeLabels') as string[];

      const sourceNode = {
        id: sourceNodeData.properties.id,
        label: sourceLabels[0] || 'Unknown',
        properties: { ...sourceNodeData.properties },
      };

      // Build relationship type filter
      const types = typesParam ? typesParam.split(',').map((t) => t.trim()) : [];
      const typeFilter = types.length > 0 ? `:${types.join('|')}` : '';

      // Build direction-specific query
      let relationshipPattern: string;
      if (direction === 'incoming') {
        relationshipPattern = `<-[r${typeFilter}]-`;
      } else if (direction === 'outgoing') {
        relationshipPattern = `-[r${typeFilter}]->`;
      } else {
        relationshipPattern = `-[r${typeFilter}]-`;
      }

      // Query for adjacent nodes
      const adjacencyResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (source {id: $nodeId})${relationshipPattern}(adjacent)
           WHERE (source.graph_id = $graphId OR source.graphId = $graphId)
             AND (adjacent.graph_id = $graphId OR adjacent.graphId = $graphId)
           RETURN adjacent, labels(adjacent) as adjLabels,
                  type(r) as relType, properties(r) as relProps,
                  startNode(r) = source as isOutgoing
           LIMIT 50`,
          { nodeId, graphId }
        );
      });

      const adjacencies = adjacencyResult.records.map((record) => {
        const adjNode = record.get('adjacent');
        const adjLabels = record.get('adjLabels') as string[];
        const relType = record.get('relType') as string;
        const relProps = record.get('relProps') as Record<string, any>;
        const isOutgoing = record.get('isOutgoing') as boolean;

        return {
          node: {
            id: adjNode.properties.id,
            label: adjLabels[0] || 'Unknown',
            properties: { ...adjNode.properties },
          },
          relationship: {
            type: relType,
            direction: (isOutgoing ? 'outgoing' : 'incoming') as 'incoming' | 'outgoing',
            properties: relProps || {},
          },
        };
      });

      const response: AdjacencyResponse = {
        sourceNode,
        adjacencies,
        total: adjacencies.length,
      };

      console.log('[Adjacencies API] Returning', adjacencies.length, 'adjacencies for node', nodeId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Adjacencies API] ERROR getting adjacencies:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get adjacencies',
        },
      },
      { status: 500 }
    );
  }
}
