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
import { syncToGit, isSyncableType, type SyncableNode } from '@/lib/github';

interface NodeData {
  id: string;
  [key: string]: any;
}

interface PatchNodeRequest {
  [key: string]: any;  // Partial update
  baselineHash?: string;  // Hash when editing started (for conflict detection)
  conflictStrategy?: 'skip' | 'use-incoming' | 'force';  // How to handle conflicts
}

interface ConflictInfo {
  type: 'content-modified-externally';
  currentHash: string;
  incomingHash: string;
  baselineHash: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
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
 * Extract user email from Supabase JWT token
 * JWT format: header.payload.signature (base64url encoded)
 */
function extractUserId(authHeader: string): string {
  try {
    const token = authHeader.substring(7); // Remove 'Bearer '
    const parts = token.split('.');
    if (parts.length !== 3) {
      return 'unknown';
    }
    // Decode the payload (second part) - base64url to JSON
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    // Supabase JWT contains email in the payload
    return payload.email || payload.sub || 'unknown';
  } catch (error) {
    console.error('[Nodes API] Failed to extract user from token:', error);
    return 'unknown';
  }
}

/**
 * Get project settings for git sync
 * Returns null if project not found or doesn't have git sync configured
 */
async function getProjectGitSettings(graphId: string): Promise<{ repoUrl: string; token: string } | null> {
  // Try to find project by graphId in Neo4j
  const session = getSession();
  try {
    const result = await session.executeRead(async (tx) => {
      // Query project node that matches this graphId
      return tx.run(
        `MATCH (p:Project)
         WHERE p.graphId = $graphId OR p.id = $graphId OR p.projectId = $graphId
         RETURN p.github_repo_url as repoUrl`,
        { graphId }
      );
    });

    if (result.records.length === 0) {
      return null;
    }

    const repoUrl = result.records[0].get('repoUrl');
    if (!repoUrl) {
      return null;
    }

    // Use environment variable for GitHub token
    // Projects can override via project-level token in settings (future enhancement)
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('[Git Sync] GITHUB_TOKEN not configured');
      return null;
    }

    return { repoUrl, token };
  } finally {
    await session.close();
  }
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

    // Extract conflict handling parameters
    const baselineHash = body.baselineHash;
    const conflictStrategy = body.conflictStrategy;

    // Compute content hash if content is being updated
    let contentHash: string | undefined;
    if (body.content) {
      contentHash = computeContentHash(body.content);
    }

    const session = getSession();
    try {
      // Update node with sync tracking
      // Support both direct properties { assignee: "..." } and wrapped { properties: { assignee: "..." } }
      const updateProps: Record<string, any> = body.properties
        ? { ...body.properties }
        : { ...body };

      // Remove conflict handling fields from properties
      delete updateProps.baselineHash;
      delete updateProps.conflictStrategy;

      // Remove system-managed fields that shouldn't be client-editable
      // These are either query params or auto-managed by the API
      const systemFields = [
        'graphId', 'graph_id', 'id',           // Identity fields
        'editedAt', 'editedBy', 'updatedAt', 'createdAt',  // Timestamp fields (managed by API)
        'syncedAt', 'synced', 'contentHash', 'gitHash',    // Sync tracking fields
      ];
      systemFields.forEach(field => delete updateProps[field]);

      // Filter out non-primitive values (Neo4j DateTime objects get serialized as complex Maps)
      // Neo4j can only store primitives (string, number, boolean, null) or arrays of primitives
      const isPrimitive = (value: unknown): boolean => {
        if (value === null || value === undefined) return true;
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') return true;
        if (Array.isArray(value)) {
          // Arrays of primitives are OK
          return value.every(item => {
            const itemType = typeof item;
            return item === null || itemType === 'string' || itemType === 'number' || itemType === 'boolean';
          });
        }
        return false;
      };

      // Remove any non-primitive properties
      Object.keys(updateProps).forEach(key => {
        if (!isPrimitive(updateProps[key])) {
          delete updateProps[key];
        }
      });

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
        const nodeLabels = checkResult.records[0].get('nodeLabels') as string[];

        // Conflict detection: Check if node was modified since editing started
        if (baselineHash && currentNode.contentHash && body.content) {
          const currentHash = currentNode.contentHash;

          // Conflict exists if:
          // 1. Current hash differs from baseline (someone else changed it)
          // 2. AND incoming hash differs from current (we're not saving the same content)
          if (currentHash !== baselineHash && contentHash !== currentHash) {
            // Strategy: 'force' allows overwrite, 'skip' keeps current, otherwise return conflict
            if (conflictStrategy === 'force') {
              console.log('[Nodes API] Conflict detected but force strategy applied');
              // Continue with save
            } else if (conflictStrategy === 'skip') {
              console.log('[Nodes API] Conflict detected, skip strategy - keeping current');
              // Return marker indicating skip
              return {
                type: 'skip' as const,
                currentNode,
                nodeLabels,
                currentHash,
              };
            } else {
              // No strategy provided - return marker indicating conflict
              console.log('[Nodes API] Conflict detected, returning 409');
              return {
                type: 'conflict' as const,
                currentHash,
                incomingHash: contentHash || '',
                baselineHash,
                lastModifiedBy: currentNode.editedBy || 'unknown',
                lastModifiedAt: currentNode.editedAt?.toString() || '',
              };
            }
          }
        }

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

      // Handle conflict markers returned from transaction
      if (result && typeof result === 'object' && 'type' in result) {
        if (result.type === 'skip') {
          // Skip strategy - return current node without changes
          const skipResult = result as { currentNode: any; nodeLabels: string[]; currentHash: string };
          const skipResponse: PatchNodeResponse = {
            node: {
              id: skipResult.currentNode.id,
              label: skipResult.nodeLabels[0] || 'Unknown',
              properties: { ...skipResult.currentNode },
            },
            syncStatus: {
              synced: skipResult.currentNode.synced || false,
              syncedAt: skipResult.currentNode.syncedAt ? skipResult.currentNode.syncedAt.toString() : null,
              editedAt: skipResult.currentNode.editedAt?.toString() || '',
              editedBy: skipResult.currentNode.editedBy || '',
              contentHash: skipResult.currentHash,
              gitHash: skipResult.currentNode.gitHash || null,
            },
          };
          return NextResponse.json(skipResponse);
        } else if (result.type === 'conflict') {
          // Conflict detected - return 409
          const conflictResult = result as ConflictInfo & { type: string };
          const conflictInfo: ConflictInfo = {
            type: 'content-modified-externally',
            currentHash: conflictResult.currentHash,
            incomingHash: conflictResult.incomingHash,
            baselineHash: conflictResult.baselineHash,
            lastModifiedBy: conflictResult.lastModifiedBy,
            lastModifiedAt: conflictResult.lastModifiedAt,
          };
          return NextResponse.json(
            {
              error: {
                code: 'CONTENT_CONFLICT',
                message: 'Node was modified by another user since you started editing',
                conflict: conflictInfo,
              },
            },
            { status: 409 }
          );
        }
      }

      const updatedNode = result.get('n').properties;
      const nodeLabels = result.get('nodeLabels') as string[];
      const nodeType = nodeLabels[0] || 'Unknown';

      // Build initial sync status
      const syncStatus: SyncStatus = {
        synced: updatedNode.synced || false,
        syncedAt: updatedNode.syncedAt ? updatedNode.syncedAt.toString() : null,
        editedAt: updatedNode.editedAt.toString(),
        editedBy: updatedNode.editedBy || userId,
        contentHash: updatedNode.contentHash || '',
        gitHash: updatedNode.gitHash || null,
      };

      // Attempt git sync for syncable node types (graceful degradation)
      if (isSyncableType(nodeType)) {
        try {
          const gitSettings = await getProjectGitSettings(graphId);
          if (gitSettings) {
            const syncableNode: SyncableNode = {
              id: updatedNode.id,
              type: nodeType as SyncableNode['type'],
              title: updatedNode.title || updatedNode.name || updatedNode.id,
              content: updatedNode.content,
              status: updatedNode.status,
              tags: updatedNode.tags,
              slug: updatedNode.slug,
            };

            const syncResult = await syncToGit(
              syncableNode,
              gitSettings.repoUrl,
              gitSettings.token,
              {
                author: {
                  name: 'Chris Norton',
                  email: 'chris@watchhill.ai',
                },
              }
            );

            if (syncResult.success) {
              // Update sync status to reflect successful sync
              syncStatus.synced = true;
              syncStatus.gitHash = syncResult.commitSha || null;
              syncStatus.syncedAt = new Date().toISOString();

              // Update the node in Neo4j with sync info
              const syncSession = getSession();
              try {
                await syncSession.executeWrite(async (tx) => {
                  return tx.run(
                    `MATCH (n {id: $id})
                     WHERE n.graph_id = $graphId OR n.graphId = $graphId
                     SET n.synced = true,
                         n.syncedAt = datetime($syncedAt),
                         n.gitHash = $gitHash`,
                    {
                      id: nodeId,
                      graphId,
                      syncedAt: syncStatus.syncedAt,
                      gitHash: syncStatus.gitHash,
                    }
                  );
                });
              } finally {
                await syncSession.close();
              }

              console.log('[Git Sync] Node synced successfully:', nodeId, syncResult.commitSha);
            } else {
              console.warn('[Git Sync] Sync failed (non-blocking):', syncResult.error);
            }
          } else {
            console.log('[Git Sync] Skipped - project not configured for git sync');
          }
        } catch (error) {
          // Git sync failure should NOT fail the save request
          console.warn('[Git Sync] Error (non-blocking):', error);
        }
      }

      const response: PatchNodeResponse = {
        node: {
          id: updatedNode.id,
          label: nodeType,
          properties: { ...updatedNode },
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
 * PUT /api/v1/graph/nodes/:id
 * Full update of an existing node (alias to PATCH for API compatibility)
 *
 * Per REST semantics, PUT typically replaces the entire resource,
 * but we treat it as a partial update like PATCH for convenience.
 *
 * Body: { title?, content?, status?, tags?, ... } or { properties: { ... } }
 * Query params: graphId (required)
 * Response: { node: Node, syncStatus: SyncStatus }
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Delegate to PATCH handler
  return PATCH(request, context);
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

      // Build sync status for edit session (includes baselineHash for conflict detection)
      const syncStatus: SyncStatus = {
        synced: node.synced || false,
        syncedAt: node.syncedAt ? node.syncedAt.toString() : null,
        editedAt: node.editedAt ? node.editedAt.toString() : '',
        editedBy: node.editedBy || '',
        contentHash: node.contentHash || '',
        gitHash: node.gitHash || null,
      };

      const response = {
        node: {
          id: node.id,
          label: nodeLabels[0] || 'Unknown',
          properties: { ...node },
        },
        // Include syncStatus so clients can track baseline for conflict detection
        syncStatus,
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

/**
 * DELETE /api/v1/graph/nodes/:id
 * Delete a node by ID (with DETACH to remove relationships)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Nodes API] DELETE /api/v1/graph/nodes/:id called');

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
    console.log('[Nodes API] Deleting node:', { nodeId, graphId });

    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        // First check if node exists - try both by property and by CONTAINS relationship
        // Some orphan nodes only have CONTAINS relationship, not graphId property
        const checkResult = await tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId
              OR n.graphId = $graphId
              OR EXISTS { MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n) }
           RETURN n`,
          { id: nodeId, graphId }
        );

        if (checkResult.records.length === 0) {
          return { deleted: false, notFound: true };
        }

        // Delete node and all its relationships - use same pattern
        await tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId
              OR n.graphId = $graphId
              OR EXISTS { MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n) }
           DETACH DELETE n`,
          { id: nodeId, graphId }
        );

        return { deleted: true, notFound: false };
      });

      if (result.notFound) {
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

      console.log('[Nodes API] Node deleted successfully:', nodeId);
      return NextResponse.json({
        message: 'Node deleted successfully',
        nodeId
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR deleting node:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete node',
        },
      },
      { status: 500 }
    );
  }
}
