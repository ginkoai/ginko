/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, task, release, epic-004, multi-agent]
 * @related: [../claim/route.ts, ../../../agent/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/task/:id/release
 * Release a claimed task back to available status
 *
 * Request Body:
 * - agentId: ID of agent releasing the task (required)
 *
 * Returns:
 * - success: Boolean
 * - taskId: Task ID
 * - status: New task status ('available')
 * - agentId: Agent that released the task
 * - releasedAt: Timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';

interface ReleaseTaskRequest {
  agentId: string;
}

interface ReleaseTaskResponse {
  success: boolean;
  taskId: string;
  status: string;
  agentId: string;
  releasedAt: string;
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
  console.log('[Task Release API] POST /api/v1/task/:id/release called');

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

    // Get task ID from params
    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_TASK_ID',
            message: 'Task ID is required in URL path',
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: ReleaseTaskRequest = await request.json();

    // Validate required fields
    if (!body.agentId || typeof body.agentId !== 'string' || body.agentId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_AGENT_ID',
            message: 'agentId is required and must be a non-empty string',
          },
        },
        { status: 400 }
      );
    }

    const agentId = body.agentId.trim();

    // Release task in Neo4j
    // Only the claiming agent can release the task
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (t:Task {id: $taskId})
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
          MATCH (t)<-[r:CLAIMED_BY]-(a)
          DELETE r
          SET t.status = 'available',
              t.updated_at = datetime(),
              a.status = CASE
                WHEN a.status = 'busy' THEN 'active'
                ELSE a.status
              END,
              a.updated_at = datetime()
          RETURN t.id as taskId,
                 t.status as status,
                 a.id as agentId,
                 datetime() as releasedAt
          `,
          {
            taskId,
            agentId,
            organizationId,
          }
        );
      });

      if (result.records.length === 0) {
        // Check if task exists
        const taskCheck = await session.executeRead(async (tx) => {
          return tx.run(
            `
            MATCH (t:Task {id: $taskId})
            OPTIONAL MATCH (t)<-[:CLAIMED_BY]-(claimingAgent:Agent)
            RETURN t.id as taskId,
                   claimingAgent.id as claimingAgentId
            `,
            { taskId }
          );
        });

        if (taskCheck.records.length === 0) {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_NOT_FOUND',
                message: 'Task not found',
              },
            },
            { status: 404 }
          );
        }

        const claimingAgentId = taskCheck.records[0].get('claimingAgentId');
        if (claimingAgentId && claimingAgentId !== agentId) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message: 'Only the claiming agent can release this task',
              },
            },
            { status: 403 }
          );
        }

        // Agent or task not found for this organization
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Task is not claimed by this agent or agent not found',
            },
          },
          { status: 404 }
        );
      }

      const record = result.records[0];
      const response: ReleaseTaskResponse = {
        success: true,
        taskId: record.get('taskId'),
        status: record.get('status'),
        agentId: record.get('agentId'),
        releasedAt: record.get('releasedAt').toString(),
      };

      console.log('[Task Release API] Task released successfully:', response.taskId);
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Release API] ERROR releasing task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to release task',
        },
      },
      { status: 500 }
    );
  }
}
