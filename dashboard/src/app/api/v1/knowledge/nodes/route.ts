/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, crud, nodes, adr, prd, context-module, task-021]
 * @related: [_cloud-graph-client.ts, search/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/knowledge/nodes - Create knowledge node
 * GET /api/v1/knowledge/nodes - List/filter knowledge nodes
 *
 * TASK-021: Knowledge Node CRUD Operations
 *
 * Supported Node Types:
 * - ADR: Architecture Decision Records
 * - PRD: Product Requirements Documents
 * - ContextModule: Patterns, gotchas, insights
 * - Session: Development session logs
 * - CodeFile: Source file metadata
 *
 * Supported Relationships:
 * - IMPLEMENTS: Node implements another node (e.g., ADR implements PRD)
 * - REFERENCES: Node references another node
 * - TAGGED_WITH: Node tagged with tag
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';
import neo4j from 'neo4j-driver';

// Supported knowledge node types
const VALID_NODE_TYPES = ['ADR', 'PRD', 'ContextModule', 'Session', 'CodeFile'] as const;
type NodeType = typeof VALID_NODE_TYPES[number];

// Supported relationship types
const VALID_RELATIONSHIP_TYPES = ['IMPLEMENTS', 'REFERENCES', 'TAGGED_WITH'] as const;
type RelationshipType = typeof VALID_RELATIONSHIP_TYPES[number];

interface CreateNodeRequest {
  type: NodeType;
  graphId: string;
  data: {
    title?: string;
    content: string;
    status?: string;
    tags?: string[];
    [key: string]: any;
  };
  relationships?: Array<{
    type: RelationshipType;
    targetId: string;
  }>;
}

interface ListNodesRequest {
  graphId: string;
  type?: NodeType;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * POST /api/v1/knowledge/nodes
 * Create a new knowledge node
 */
export async function POST(request: NextRequest) {
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
    const body: CreateNodeRequest = await request.json();

    // Validate required fields
    if (!body.type || !VALID_NODE_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: 'Invalid node type',
          validTypes: VALID_NODE_TYPES
        },
        { status: 400 }
      );
    }

    if (!body.graphId) {
      return NextResponse.json(
        { error: 'Missing required field: graphId' },
        { status: 400 }
      );
    }

    if (!body.data || !body.data.content) {
      return NextResponse.json(
        { error: 'Missing required field: data.content' },
        { status: 400 }
      );
    }

    // Validate relationships if provided
    if (body.relationships) {
      for (const rel of body.relationships) {
        if (!VALID_RELATIONSHIP_TYPES.includes(rel.type)) {
          return NextResponse.json(
            {
              error: `Invalid relationship type: ${rel.type}`,
              validTypes: VALID_RELATIONSHIP_TYPES
            },
            { status: 400 }
          );
        }
        if (!rel.targetId) {
          return NextResponse.json(
            { error: 'Missing targetId in relationship' },
            { status: 400 }
          );
        }
      }
    }

    // Create CloudGraphClient
    const client = await CloudGraphClient.fromBearerToken(token, body.graphId);

    // Set default status if not provided
    const nodeData = {
      ...body.data,
      status: body.data.status || 'active',
      projectId: body.graphId, // Store graphId as projectId for compatibility
    };

    // Create the node
    const nodeId = await client.createNode(body.type, nodeData);

    // Create relationships if provided
    if (body.relationships && body.relationships.length > 0) {
      for (const rel of body.relationships) {
        await client.createRelationship(nodeId, rel.targetId, {
          type: rel.type,
          properties: {}
        });
      }
    }

    // Fetch the created node with its relationships
    const createdNode = await client.getNode(nodeId);

    return NextResponse.json({
      success: true,
      node: {
        id: nodeId,
        type: body.type,
        ...createdNode,
      },
      relationships: body.relationships || [],
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Knowledge Nodes API] Create error:', error);

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
        error: 'Failed to create knowledge node',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/knowledge/nodes
 * List and filter knowledge nodes
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');
    const type = searchParams.get('type') as NodeType | null;
    const status = searchParams.get('status');
    const tags = searchParams.get('tags')?.split(',');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Validate type if provided
    if (type && !VALID_NODE_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid node type: ${type}`,
          validTypes: VALID_NODE_TYPES
        },
        { status: 400 }
      );
    }

    // Create CloudGraphClient
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Build query filters
    const filters: any = {
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    };

    if (type) {
      filters.labels = [type];
    }

    if (status) {
      filters.properties = { status };
    }

    // Query nodes
    const result = await client.queryNodes(filters);

    // Filter by tags if provided (post-query filtering)
    let nodes = result.nodes;
    if (tags && tags.length > 0) {
      nodes = nodes.filter((node: any) => {
        const nodeTags = node.tags || [];
        return tags.some(tag => nodeTags.includes(tag));
      });
    }

    return NextResponse.json({
      nodes,
      totalCount: nodes.length,
      filters: {
        graphId,
        type: type || 'all',
        status: status || 'all',
        tags: tags || [],
        limit,
        offset,
      },
      executionTime: result.executionTime,
    });

  } catch (error: any) {
    console.error('[Knowledge Nodes API] List error:', error);

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
        error: 'Failed to list knowledge nodes',
        message: error.message
      },
      { status: 500 }
    );
  }
}
