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
import { runQuery, verifyConnection, getSession } from '../_neo4j';

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

        // Create the node with all properties
        const properties = {
          ...body.data,
          graph_id: body.graphId,
          created_at: new Date().toISOString()
        };

        const propsList = Object.keys(properties)
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
