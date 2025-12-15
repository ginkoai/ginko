/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-15
 * @tags: [api, graph, nodes, knowledge, neo4j, sync, git]
 * @related: [../../route.ts, ../../../_neo4j.ts, ../route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../_neo4j';

interface MarkSyncedRequest {
  gitHash: string;
  syncedAt?: string;
}

interface MarkSyncedResponse {
  success: boolean;
  nodeId: string;
  synced: boolean;
  syncedAt: string;
  gitHash: string;
}

/**
 * POST /api/v1/graph/nodes/:id/sync
 * Mark node as synced (called by CLI after git commit)
 *
 * Sets synced=true, syncedAt=now(), gitHash=provided
 *
 * Body: { gitHash: string, syncedAt?: string }
 * Query params: graphId (required)
 * Response: { success: boolean, nodeId, synced, syncedAt, gitHash }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Nodes API] POST /api/v1/graph/nodes/:id/sync called');

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

    // Parse request body
    const body = (await request.json()) as MarkSyncedRequest;
    const nodeId = params.id;

    if (!body.gitHash) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GIT_HASH',
            message: 'gitHash is required in request body',
          },
        },
        { status: 400 }
      );
    }

    console.log('[Nodes API] Marking node as synced:', { nodeId, graphId, gitHash: body.gitHash });

    const syncedAt = body.syncedAt || new Date().toISOString();

    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        // Update node with sync status
        const updateResult = await tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           SET n.synced = true,
               n.syncedAt = datetime($syncedAt),
               n.gitHash = $gitHash,
               n.updatedAt = datetime()
           RETURN n.id as id, n.synced as synced, n.syncedAt as syncedAt, n.gitHash as gitHash`,
          {
            id: nodeId,
            graphId,
            syncedAt,
            gitHash: body.gitHash,
          }
        );

        return updateResult.records[0];
      });

      if (!result) {
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

      const response: MarkSyncedResponse = {
        success: true,
        nodeId: result.get('id'),
        synced: result.get('synced'),
        syncedAt: result.get('syncedAt').toString(),
        gitHash: result.get('gitHash'),
      };

      console.log('[Nodes API] Node marked as synced:', nodeId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR marking node as synced:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to mark node as synced',
        },
      },
      { status: 500 }
    );
  }
}
