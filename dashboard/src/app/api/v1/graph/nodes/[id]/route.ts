/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-15
 * @tags: [api, graph, nodes, knowledge, neo4j, patch, update, sync]
 * @related: [../route.ts, ../_neo4j.ts, unsynced/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, crypto]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../_neo4j';
import crypto from 'crypto';

interface NodeData {
  id: string;
  [key: string]: any;
}

interface PatchNodeRequest {
  [key: string]: any;  // Partial update
}

interface SyncStatus {
  synced: boolean;
  syncedAt: string | null;
  editedAt: string;
  editedBy: string;
  contentHash: string;
  gitHash: string | null;
}

interface PatchNodeResponse {
  node: NodeData;
  syncStatus: SyncStatus;
}

/**
 * Compute SHA-256 hash of content for sync tracking
 */
function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract user ID from Bearer token
 * TODO: Replace with Supabase auth verification
 */
function extractUserId(authHeader: string): string {
  const token = authHeader.substring(7); // Remove 'Bearer '
  return 'user_' + Buffer.from(token).toString('base64').substring(0, 8);
}

/**
 * PATCH /api/v1/graph/nodes/:id
 * Update existing node (partial update)
 *
 * Sets synced=false, editedAt=now(), editedBy=userId
 * Computes new contentHash (SHA-256 of content)
 *
 * Body: { title?, content?, status?, tags?, ... }
 * Query params: graphId (required)
 * Response: { node: Node, syncStatus: SyncStatus }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Nodes API] PATCH /api/v1/graph/nodes/:id called');

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

    const userId = extractUserId(authHeader);

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
    const body = (await request.json()) as PatchNodeRequest;
    const nodeId = params.id;

    console.log('[Nodes API] Updating node:', { nodeId, graphId, updateKeys: Object.keys(body) });

    // Compute content hash if content is being updated
    let contentHash: string | undefined;
    if (body.content) {
      contentHash = computeContentHash(body.content);
    }

    const session = getSession();
    try {
      // Update node with sync tracking
      const updateProps: Record<string, any> = { ...body };
      const now = new Date().toISOString();

      const result = await session.executeWrite(async (tx) => {
        // First check if node exists and get current state
        const checkResult = await tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           RETURN n, labels(n) as nodeLabels`,
          { id: nodeId, graphId }
        );

        if (checkResult.records.length === 0) {
          return null;
        }

        const currentNode = checkResult.records[0].get('n').properties;

        // Build SET clause dynamically
        const setStatements: string[] = [];
        const setParams: Record<string, any> = {
          id: nodeId,
          graphId,
          userId,
          editedAt: now,
          synced: false,
        };

        Object.entries(updateProps).forEach(([key, value]) => {
          setStatements.push(`n.${key} = $${key}`);
          setParams[key] = value;
        });

        // Add sync tracking fields
        setStatements.push('n.synced = $synced');
        setStatements.push('n.editedAt = datetime($editedAt)');
        setStatements.push('n.editedBy = $userId');

        // Update contentHash if content changed
        if (contentHash) {
          setStatements.push('n.contentHash = $contentHash');
          setParams.contentHash = contentHash;
        } else if (currentNode.contentHash) {
          // Keep existing contentHash if we're not updating content
          setParams.contentHash = currentNode.contentHash;
        }

        const setClauses = setStatements.join(', ');

        // Execute update
        const updateResult = await tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           SET ${setClauses}, n.updatedAt = datetime()
           RETURN n, labels(n) as nodeLabels`,
          setParams
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

      const updatedNode = result.get('n').properties;
      const nodeLabels = result.get('nodeLabels') as string[];

      // Build response
      const syncStatus: SyncStatus = {
        synced: updatedNode.synced || false,
        syncedAt: updatedNode.syncedAt ? updatedNode.syncedAt.toString() : null,
        editedAt: updatedNode.editedAt.toString(),
        editedBy: updatedNode.editedBy || userId,
        contentHash: updatedNode.contentHash || '',
        gitHash: updatedNode.gitHash || null,
      };

      const response: PatchNodeResponse = {
        node: {
          id: updatedNode.id,
          label: nodeLabels[0] || 'Unknown',
          ...updatedNode,
        },
        syncStatus,
      };

      console.log('[Nodes API] Node updated successfully:', nodeId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR updating node:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update node',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/graph/nodes/:id
 * Get a specific node by ID
 *
 * Query params: graphId (required)
 * Response: { node: Node }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Nodes API] GET /api/v1/graph/nodes/:id called');

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

    const nodeId = params.id;
    console.log('[Nodes API] Fetching node:', { nodeId, graphId });

    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           RETURN n, labels(n) as nodeLabels`,
          { id: nodeId, graphId }
        );
      });

      if (result.records.length === 0) {
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

      const node = result.records[0].get('n').properties;
      const nodeLabels = result.records[0].get('nodeLabels') as string[];

      const response = {
        node: {
          id: node.id,
          label: nodeLabels[0] || 'Unknown',
          ...node,
        },
      };

      console.log('[Nodes API] Node fetched successfully:', nodeId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR fetching node:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch node',
        },
      },
      { status: 500 }
    );
  }
}
