/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-29
 * @tags: [api, graph, nodes, knowledge, neo4j, sync, unsynced]
 * @related: [../route.ts, ../_neo4j.ts, ../[id]/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../_neo4j';
import neo4j from 'neo4j-driver';

interface NodeData {
  id: string;
  [key: string]: any;
}

interface SyncStatus {
  synced: boolean;
  syncedAt: string | null;
  editedAt: string;
  editedBy: string;
  contentHash: string;
  gitHash: string | null;
}

interface NodeWithSyncStatus {
  node: NodeData;
  syncStatus: SyncStatus;
  label: string;
}

interface UnsyncedNodesResponse {
  nodes: NodeWithSyncStatus[];
  count: number;
  graphId: string;
}

/**
 * GET /api/v1/graph/nodes/unsynced
 * List nodes pending sync (where synced = false)
 *
 * Query params:
 * - graphId (required): The graph namespace
 * - limit (optional): Max results (default 100)
 *
 * Response: { nodes: NodeWithSyncStatus[], count: number }
 */
export async function GET(request: NextRequest) {
  console.log('[Nodes API] GET /api/v1/graph/nodes/unsynced called');

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

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

    console.log('[Nodes API] Fetching unsynced nodes for graph:', graphId);

    const session = getSession();
    try {
      // Query nodes where synced = false or synced is null (not yet tracked)
      // Nodes are linked via (g:Graph)-[:CONTAINS]->(n) relationship
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
           WHERE (n.synced = false OR n.synced IS NULL)
             AND n.id IS NOT NULL
           WITH n, labels(n) as nodeLabels
           WHERE ANY(label IN nodeLabels WHERE label IN ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Charter'])
           RETURN n, nodeLabels
           ORDER BY n.editedAt DESC
           LIMIT $limit`,
          { graphId, limit: neo4j.int(limit) }
        );
      });

      const nodes: NodeWithSyncStatus[] = result.records.map((record) => {
        const node = record.get('n').properties;
        const nodeLabels = record.get('nodeLabels') as string[];

        // Build sync status
        const syncStatus: SyncStatus = {
          synced: node.synced || false,
          syncedAt: node.syncedAt ? node.syncedAt.toString() : null,
          editedAt: node.editedAt ? node.editedAt.toString() : node.updatedAt?.toString() || new Date().toISOString(),
          editedBy: node.editedBy || 'unknown',
          contentHash: node.contentHash || '',
          gitHash: node.gitHash || null,
        };

        return {
          node: {
            id: node.id,
            ...node,
          },
          syncStatus,
          label: nodeLabels[0] || 'Unknown',
        };
      });

      const response: UnsyncedNodesResponse = {
        nodes,
        count: nodes.length,
        graphId,
      };

      console.log('[Nodes API] Found', nodes.length, 'unsynced nodes');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR fetching unsynced nodes:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch unsynced nodes',
        },
      },
      { status: 500 }
    );
  }
}
