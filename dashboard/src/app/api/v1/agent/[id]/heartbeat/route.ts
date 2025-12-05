/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, agent, heartbeat, epic-004, multi-agent]
 * @related: [../../route.ts, ../route.ts, ../../graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/agent/:id/heartbeat
 * Update agent heartbeat timestamp
 *
 * Heartbeat mechanism for agent liveness tracking:
 * - Agents send heartbeat every 30 seconds when active
 * - Updates last_heartbeat timestamp in Neo4j
 * - Stale agents (no heartbeat for 5 min) marked offline
 * - Offline agents excluded from task assignment
 *
 * Request Body:
 * - None required (heartbeat updates timestamp only)
 *
 * Returns:
 * - success: Boolean
 * - agentId: Agent ID
 * - lastHeartbeat: Updated timestamp
 * - status: Current agent status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';

interface HeartbeatResponse {
  success: boolean;
  agentId: string;
  lastHeartbeat: string;
  status: string;
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Agent API] POST /api/v1/agent/:id/heartbeat called');

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

    // Update heartbeat in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
          SET a.last_heartbeat = datetime(),
              a.updated_at = datetime()
          RETURN a.id as id,
                 a.last_heartbeat as lastHeartbeat,
                 a.status as status
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

      const record = result.records[0];
      const response: HeartbeatResponse = {
        success: true,
        agentId: record.get('id'),
        lastHeartbeat: record.get('lastHeartbeat').toString(),
        status: record.get('status'),
      };

      console.log('[Agent API] Heartbeat updated for agent:', response.agentId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent API] ERROR updating heartbeat:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update heartbeat',
        },
      },
      { status: 500 }
    );
  }
}
