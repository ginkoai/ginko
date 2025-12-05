/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, agent, registration, epic-004, multi-agent]
 * @related: [./[id]/route.ts, ../graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/agent
 * Register a new agent in the multi-agent collaboration system
 *
 * Request Body:
 * - name: Agent name (required)
 * - capabilities: Array of capabilities (required)
 * - status: Agent status (optional, defaults to 'active')
 * - metadata: Additional metadata (optional)
 *
 * Returns:
 * - agentId: Generated agent ID
 * - name: Agent name
 * - capabilities: Agent capabilities
 * - status: Agent status
 * - organizationId: Organization ID from token
 * - createdAt: Timestamp
 */

/**
 * GET /api/v1/agent
 * List agents with optional filtering
 *
 * Query params:
 * - status (optional): Filter by status (active|idle|busy|offline)
 * - capability (optional): Filter by capability
 * - limit (optional): Max results (default 20, max 100)
 * - offset (optional): Pagination offset (default 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface CreateAgentRequest {
  name: string;
  capabilities: string[];
  status?: 'active' | 'idle' | 'busy' | 'offline';
  metadata?: Record<string, any>;
}

interface CreateAgentResponse {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  createdAt: string;
}

interface ListAgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    capabilities: string[];
    status: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

/**
 * Extract organization_id from Bearer token
 * MVP: Use simple extraction pattern similar to CloudGraphClient
 * Format: 'org_' + first 8 chars of base64 encoded token
 */
function extractOrganizationId(token: string): string {
  if (!token || token.length < 8) {
    throw new Error('Invalid bearer token');
  }
  return 'org_' + Buffer.from(token).toString('base64').substring(0, 8);
}

/**
 * Generate agent ID
 * Format: agent_{timestamp}_{random6}
 */
function generateAgentId(): string {
  const timestamp = Date.now();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `agent_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  console.log('[Agent API] POST /api/v1/agent called');

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

    const token = authHeader.substring(7);
    const organizationId = extractOrganizationId(token);

    // Parse request body
    const body: CreateAgentRequest = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_NAME',
            message: 'name is required and must be a non-empty string',
          },
        },
        { status: 400 }
      );
    }

    if (!body.capabilities || !Array.isArray(body.capabilities) || body.capabilities.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_CAPABILITIES',
            message: 'capabilities is required and must be a non-empty array',
          },
        },
        { status: 400 }
      );
    }

    const agentId = generateAgentId();
    const status = body.status || 'active';

    // Validate status enum
    if (!['active', 'idle', 'busy', 'offline'].includes(status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATUS',
            message: 'status must be one of: active, idle, busy, offline',
          },
        },
        { status: 400 }
      );
    }

    // Create agent in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          CREATE (a:Agent {
            id: $id,
            name: $name,
            capabilities: $capabilities,
            status: $status,
            organization_id: $organizationId,
            metadata: $metadata,
            created_at: datetime(),
            updated_at: datetime()
          })
          RETURN a.id as id,
                 a.name as name,
                 a.capabilities as capabilities,
                 a.status as status,
                 a.organization_id as organizationId,
                 a.created_at as createdAt
          `,
          {
            id: agentId,
            name: body.name.trim(),
            capabilities: body.capabilities,
            status,
            organizationId,
            metadata: body.metadata || {},
          }
        );
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create agent');
      }

      const record = result.records[0];
      const response: CreateAgentResponse = {
        agentId: record.get('id'),
        name: record.get('name'),
        capabilities: record.get('capabilities'),
        status: record.get('status'),
        organizationId: record.get('organizationId'),
        createdAt: record.get('createdAt').toString(),
      };

      console.log('[Agent API] Agent created successfully:', response.agentId);
      return NextResponse.json(response, { status: 201 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent API] ERROR creating agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create agent',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Agent API] GET /api/v1/agent called');

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

    const token = authHeader.substring(7);
    const organizationId = extractOrganizationId(token);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const capability = searchParams.get('capability');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build WHERE clause
    const whereConditions = ['a.organization_id = $organizationId'];
    const params: Record<string, any> = {
      organizationId,
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };

    if (status) {
      if (!['active', 'idle', 'busy', 'offline'].includes(status)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS',
              message: 'status must be one of: active, idle, busy, offline',
            },
          },
          { status: 400 }
        );
      }
      whereConditions.push('a.status = $status');
      params.status = status;
    }

    if (capability) {
      whereConditions.push('$capability IN a.capabilities');
      params.capability = capability;
    }

    const whereClause = whereConditions.join(' AND ');

    const session = getSession();
    try {
      // Get total count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (a:Agent) WHERE ${whereClause} RETURN count(a) as total`,
          params
        );
      });
      const total = countResult.records[0]?.get('total')?.toNumber() || 0;

      // Get agents with pagination
      const agentsResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (a:Agent)
          WHERE ${whereClause}
          RETURN a.id as id,
                 a.name as name,
                 a.capabilities as capabilities,
                 a.status as status,
                 a.organization_id as organizationId,
                 a.created_at as createdAt,
                 a.updated_at as updatedAt,
                 a.metadata as metadata
          ORDER BY a.created_at DESC
          SKIP $offset
          LIMIT $limit
          `,
          params
        );
      });

      const agents = agentsResult.records.map((record) => ({
        id: record.get('id'),
        name: record.get('name'),
        capabilities: record.get('capabilities'),
        status: record.get('status'),
        organizationId: record.get('organizationId'),
        createdAt: record.get('createdAt').toString(),
        updatedAt: record.get('updatedAt').toString(),
        metadata: record.get('metadata'),
      }));

      const response: ListAgentsResponse = {
        agents,
        total,
        limit,
        offset,
      };

      console.log('[Agent API] Returning', agents.length, 'agents of', total, 'total');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent API] ERROR listing agents:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list agents',
        },
      },
      { status: 500 }
    );
  }
}
