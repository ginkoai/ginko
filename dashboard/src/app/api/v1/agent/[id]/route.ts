/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, agent, update, delete, epic-004, multi-agent]
 * @related: [../route.ts, ../../graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * PATCH /api/v1/agent/:id
 * Update agent status and/or capabilities
 *
 * Request Body:
 * - status: Agent status (optional)
 * - capabilities: Array of capabilities (optional)
 * - metadata: Additional metadata (optional)
 *
 * Returns:
 * - agentId: Agent ID
 * - name: Agent name
 * - capabilities: Updated capabilities
 * - status: Updated status
 * - organizationId: Organization ID
 * - updatedAt: Timestamp
 */

/**
 * DELETE /api/v1/agent/:id
 * Deregister an agent
 *
 * Returns:
 * - success: Boolean
 * - agentId: Deregistered agent ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';

interface UpdateAgentRequest {
  status?: 'active' | 'idle' | 'busy' | 'offline';
  capabilities?: string[];
  metadata?: Record<string, any>;
}

interface UpdateAgentResponse {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  updatedAt: string;
}

interface DeleteAgentResponse {
  success: boolean;
  agentId: string;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Agent API] PATCH /api/v1/agent/:id called');

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

    // Get agent ID from params
    const agentId = params.id;
    if (!agentId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_AGENT_ID',
            message: 'Agent ID is required in URL path',
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateAgentRequest = await request.json();

    // Validate at least one field to update
    if (!body.status && !body.capabilities && !body.metadata) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_UPDATE_FIELDS',
            message: 'At least one field must be provided: status, capabilities, or metadata',
          },
        },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (body.status && !['active', 'idle', 'busy', 'offline'].includes(body.status)) {
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

    // Validate capabilities array if provided
    if (body.capabilities !== undefined) {
      if (!Array.isArray(body.capabilities) || body.capabilities.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_CAPABILITIES',
              message: 'capabilities must be a non-empty array',
            },
          },
          { status: 400 }
        );
      }
    }

    // Build update SET clause dynamically
    const updateFields: string[] = ['a.updated_at = datetime()'];
    const queryParams: Record<string, any> = {
      agentId,
      organizationId,
    };

    if (body.status) {
      updateFields.push('a.status = $status');
      queryParams.status = body.status;
    }

    if (body.capabilities) {
      updateFields.push('a.capabilities = $capabilities');
      queryParams.capabilities = body.capabilities;
    }

    if (body.metadata) {
      updateFields.push('a.metadata = $metadata');
      queryParams.metadata = body.metadata;
    }

    const setClause = updateFields.join(', ');

    // Update agent in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
          SET ${setClause}
          RETURN a.id as id,
                 a.name as name,
                 a.capabilities as capabilities,
                 a.status as status,
                 a.organization_id as organizationId,
                 a.updated_at as updatedAt
          `,
          queryParams
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'AGENT_NOT_FOUND',
              message: 'Agent not found or access denied',
            },
          },
          { status: 404 }
        );
      }

      const record = result.records[0];
      const response: UpdateAgentResponse = {
        agentId: record.get('id'),
        name: record.get('name'),
        capabilities: record.get('capabilities'),
        status: record.get('status'),
        organizationId: record.get('organizationId'),
        updatedAt: record.get('updatedAt').toString(),
      };

      console.log('[Agent API] Agent updated successfully:', response.agentId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent API] ERROR updating agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update agent',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Agent API] DELETE /api/v1/agent/:id called');

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

    // Get agent ID from params
    const agentId = params.id;
    if (!agentId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_AGENT_ID',
            message: 'Agent ID is required in URL path',
          },
        },
        { status: 400 }
      );
    }

    // Delete agent in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
          DETACH DELETE a
          RETURN $agentId as id
          `,
          {
            agentId,
            organizationId,
          }
        );
      });

      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'AGENT_NOT_FOUND',
              message: 'Agent not found or access denied',
            },
          },
          { status: 404 }
        );
      }

      const response: DeleteAgentResponse = {
        success: true,
        agentId,
      };

      console.log('[Agent API] Agent deleted successfully:', agentId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent API] ERROR deleting agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete agent',
        },
      },
      { status: 500 }
    );
  }
}
