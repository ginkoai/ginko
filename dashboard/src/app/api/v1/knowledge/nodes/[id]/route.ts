/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, crud, nodes, task-021]
 * @related: [../route.ts, _cloud-graph-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/knowledge/nodes/[id] - Get node by ID
 * PUT /api/v1/knowledge/nodes/[id] - Update node
 * DELETE /api/v1/knowledge/nodes/[id] - Delete node
 *
 * TASK-021: Knowledge Node CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../../graph/_cloud-graph-client';

interface UpdateNodeRequest {
  graphId: string;
  data: {
    title?: string;
    content?: string;
    status?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * GET /api/v1/knowledge/nodes/[id]
 * Get a specific knowledge node by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const nodeId = params.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Create CloudGraphClient
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Get the node
    const node = await client.getNode(nodeId);

    if (!node) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Get node relationships
    const relationships = await client.getRelationships(nodeId);

    return NextResponse.json({
      node,
      relationships: relationships.map((rel: any) => ({
        type: rel.type,
        targetId: rel.targetId || rel.target?.id,
        properties: rel.properties || {},
      })),
    });

  } catch (error: any) {
    console.error('[Knowledge Node API] Get error:', error);

    if (error.message?.includes('does not have access')) {
      return NextResponse.json(
        { error: 'Unauthorized: No access to specified graph' },
        { status: 403 }
      );
    }

    if (error.message?.includes('Invalid bearer token')) {
      return NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to get knowledge node',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/knowledge/nodes/[id]
 * Update a knowledge node
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const nodeId = params.id;
    const body: UpdateNodeRequest = await request.json();

    if (!body.graphId) {
      return NextResponse.json(
        { error: 'Missing required field: graphId' },
        { status: 400 }
      );
    }

    if (!body.data || Object.keys(body.data).length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: data' },
        { status: 400 }
      );
    }

    // Create CloudGraphClient
    const client = await CloudGraphClient.fromBearerToken(token, body.graphId);

    // Check if node exists
    const existingNode = await client.getNode(nodeId);
    if (!existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Update the node
    await client.updateNode(nodeId, body.data);

    // Fetch updated node
    const updatedNode = await client.getNode(nodeId);

    return NextResponse.json({
      success: true,
      node: updatedNode,
    });

  } catch (error: any) {
    console.error('[Knowledge Node API] Update error:', error);

    if (error.message?.includes('does not have access')) {
      return NextResponse.json(
        { error: 'Unauthorized: No access to specified graph' },
        { status: 403 }
      );
    }

    if (error.message?.includes('Invalid bearer token')) {
      return NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update knowledge node',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/knowledge/nodes/[id]
 * Delete a knowledge node
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const nodeId = params.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Create CloudGraphClient
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Check if node exists
    const existingNode = await client.getNode(nodeId);
    if (!existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Delete the node (DETACH DELETE removes relationships too)
    await client.deleteNode(nodeId);

    return NextResponse.json({
      success: true,
      message: 'Node deleted successfully',
      deletedNodeId: nodeId,
    });

  } catch (error: any) {
    console.error('[Knowledge Node API] Delete error:', error);

    if (error.message?.includes('does not have access')) {
      return NextResponse.json(
        { error: 'Unauthorized: No access to specified graph' },
        { status: 403 }
      );
    }

    if (error.message?.includes('Invalid bearer token')) {
      return NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete knowledge node',
        message: error.message
      },
      { status: 500 }
    );
  }
}
