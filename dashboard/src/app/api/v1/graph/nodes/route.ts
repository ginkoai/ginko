/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-13
 * @tags: [api, graph, nodes, knowledge, neo4j]
 * @related: [../_neo4j.ts, ../events/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../_neo4j';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';
import neo4j from 'neo4j-driver';

interface NodeData {
  id: string;
  [key: string]: any;
}

interface CreateNodeRequest {
  graphId: string;
  label: string;
  data: NodeData;
}

interface CreateNodeResponse {
  nodeId: string;
  label: string;
  graphId: string;
  created: boolean;
}

interface ListNodesResponse {
  nodes: Array<{
    id: string;
    label: string;
    properties: Record<string, any>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

/**
 * GET /api/v1/graph/nodes
 * List and filter nodes from the knowledge graph
 *
 * Query params:
 * - graphId (required): The graph namespace
 * - labels (optional): Comma-separated node labels to filter (e.g., "ADR,PRD")
 * - limit (optional): Max results (default 20, max 100)
 * - offset (optional): Pagination offset (default 0)
 * - [any other param]: Filter by property (e.g., user_id=alice@example.com)
 */
export async function GET(request: NextRequest) {
  console.log('[Nodes API] GET /api/v1/graph/nodes called');

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
    const labelsParam = searchParams.get('labels');
    // Allow higher limits for tree building (5000 nodes)
    // Default to 20 for normal listing, max 5000 for bulk operations
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 5000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    // Verify user has access to this graph (ADR-060: Data Isolation)
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      console.log(`[Nodes API] Access denied for graphId: ${graphId}, error: ${access.error}`);
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
    console.log(`[Nodes API] Access granted for graphId: ${graphId}, role: ${access.role}`);

    // Build property filters from remaining query params
    const reservedParams = ['graphId', 'labels', 'limit', 'offset'];
    const propertyFilters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!reservedParams.includes(key)) {
        propertyFilters[key] = value;
      }
    });

    // Build Cypher query
    const labels = labelsParam ? labelsParam.split(',').map(l => l.trim()) : [];
    const labelClause = labels.length > 0 ? `:${labels.join('|')}` : '';

    // Build WHERE clause for property filters
    // Note: Some nodes use graphId (camelCase), others use graph_id (snake_case)
    const whereConditions = ['(n.graph_id = $graphId OR n.graphId = $graphId)'];
    const params: Record<string, any> = { graphId, limit: neo4j.int(limit), offset: neo4j.int(offset) };

    Object.entries(propertyFilters).forEach(([key, value], index) => {
      const paramName = `prop_${index}`;
      whereConditions.push(`n.${key} = $${paramName}`);
      params[paramName] = value;
    });

    const whereClause = whereConditions.join(' AND ');

    const session = getSession();
    try {
      // Get total count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n${labelClause}) WHERE ${whereClause} RETURN count(n) as total`,
          params
        );
      });
      const total = countResult.records[0]?.get('total')?.toNumber() || 0;

      // Get nodes with pagination
      // Note: Sort by createdAt (camelCase) OR created_at (snake_case) for compatibility
      const nodesResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n${labelClause}) WHERE ${whereClause}
           RETURN n, labels(n) as nodeLabels
           ORDER BY COALESCE(n.createdAt, n.created_at) DESC
           SKIP $offset LIMIT $limit`,
          params
        );
      });

      const nodes = nodesResult.records.map((record) => {
        const node = record.get('n');
        const nodeLabels = record.get('nodeLabels') as string[];
        return {
          id: node.properties.id,
          label: nodeLabels[0] || 'Unknown',
          properties: { ...node.properties },
        };
      });

      const response: ListNodesResponse = {
        nodes,
        total,
        limit,
        offset,
      };

      console.log('[Nodes API] Returning', nodes.length, 'nodes of', total, 'total');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Nodes API] ERROR listing nodes:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list nodes',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/graph/nodes
 * Create a node in the knowledge graph
 */
export async function POST(request: NextRequest) {
  console.log('[Nodes API] POST /api/v1/graph/nodes called');

  try {
    // Verify Neo4j connection
    console.log('[Nodes API] Verifying Neo4j connection...');
    const isConnected = await verifyConnection();
    console.log('[Nodes API] Neo4j connection status:', isConnected);

    if (!isConnected) {
      console.error('[Nodes API] Neo4j connection failed - returning 503');
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

    const token = authHeader.substring(7);
    // TODO: Verify token with Supabase in production

    // Parse request body
    const body = (await request.json()) as CreateNodeRequest;
    console.log('[Nodes API] Request body:', {
      graphId: body.graphId,
      label: body.label,
      dataKeys: Object.keys(body.data || {})
    });

    // Validate required fields
    if (!body.graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required',
          },
        },
        { status: 400 }
      );
    }

    // Verify user has write access to this graph (ADR-060: Data Isolation)
    const access = await verifyGraphAccessFromRequest(request, body.graphId, 'write');
    if (!access.hasAccess) {
      console.log(`[Nodes API] Write access denied for graphId: ${body.graphId}, error: ${access.error}`);
      return NextResponse.json(
        {
          error: {
            code: access.error === 'Graph not found' ? 'GRAPH_NOT_FOUND' : 'ACCESS_DENIED',
            message: access.error || 'You do not have write access to this graph',
          },
        },
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }
    console.log(`[Nodes API] Write access granted for graphId: ${body.graphId}, role: ${access.role}`);

    if (!body.label) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_LABEL',
            message: 'label is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.data || !body.data.id) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_NODE_ID',
            message: 'data.id is required',
          },
        },
        { status: 400 }
      );
    }

    // Create node in Neo4j
    console.log('[Nodes API] Creating Neo4j session...');
    const session = getSession();
    console.log('[Nodes API] Session created, creating node...');

    try {
      let created = false;

      await session.executeWrite(async (tx) => {
        // Check if node already exists
        const existingNode = await tx.run(
          `MATCH (n:${body.label} {id: $id, graph_id: $graphId})
           RETURN n.id as id`,
          { id: body.data.id, graphId: body.graphId }
        );

        if (existingNode.records.length > 0) {
          console.log('[Nodes API] Node already exists:', body.data.id);
          created = false;
          return;
        }

        // Create the node with all properties + sync tracking
        const now = new Date().toISOString();
        const properties = {
          ...body.data,
          graph_id: body.graphId,
          created_at: now,
          // Sync tracking fields (ADR-054)
          synced: false,
          syncedAt: null,
          editedAt: now,
          editedBy: 'dashboard', // TODO: Extract from Bearer token
          contentHash: body.data.content ?
            require('crypto').createHash('sha256').update(body.data.content).digest('hex') : '',
          gitHash: null
        };

        const propsList = Object.keys(properties)
          .filter(key => properties[key] !== null) // Exclude null values
          .map(key => `${key}: $${key}`)
          .join(', ');

        const result = await tx.run(
          `CREATE (n:${body.label} {${propsList}})
           RETURN n.id as id`,
          properties
        );

        console.log('[Nodes API] Node creation query completed, records:', result.records.length);

        if (result.records.length > 0) {
          created = true;
          console.log('[Nodes API] Node created successfully:', body.data.id);
        } else {
          console.warn('[Nodes API] Node creation returned no records');
        }
      });

      // Success response
      const response: CreateNodeResponse = {
        nodeId: body.data.id,
        label: body.label,
        graphId: body.graphId,
        created,
      };

      console.log('[Nodes API] Returning success response:', response);
      return NextResponse.json(response, { status: created ? 201 : 200 });
    } finally {
      console.log('[Nodes API] Closing Neo4j session');
      await session.close();
      console.log('[Nodes API] Session closed');
    }
  } catch (error) {
    console.error('[Nodes API] ERROR creating node:', error);
    console.error('[Nodes API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create node',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/graph/nodes
 * Delete a node from the knowledge graph by ID
 *
 * Query params:
 * - graphId (required): The graph namespace
 * - id (required): The node ID to delete
 */
export async function DELETE(request: NextRequest) {
  console.log('[Nodes API] DELETE /api/v1/graph/nodes called');

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
    const nodeId = searchParams.get('id');

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

    if (!nodeId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_NODE_ID',
            message: 'id query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    const session = getSession();
    try {
      // Delete node and its relationships
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `MATCH (n {id: $id})
           WHERE n.graph_id = $graphId OR n.graphId = $graphId
           DETACH DELETE n
           RETURN count(n) as deleted`,
          { id: nodeId, graphId }
        );
      });

      const deletedCount = result.records[0]?.get('deleted')?.toNumber() || 0;

      if (deletedCount === 0) {
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

      console.log('[Nodes API] Deleted node:', nodeId);
      return NextResponse.json({
        deleted: true,
        nodeId,
        graphId,
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
