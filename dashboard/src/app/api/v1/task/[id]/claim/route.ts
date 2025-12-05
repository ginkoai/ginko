/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, task-claiming, atomic, epic-004, multi-agent]
 * @related: [../../agent/route.ts, ../activity/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/task/:id/claim
 * Atomically claim a task for an agent
 *
 * Request Body:
 * - agentId: ID of the agent claiming the task (required)
 *
 * Atomic guarantee:
 * - Uses WHERE NOT EXISTS to prevent race conditions
 * - First claim succeeds with 200
 * - Concurrent claims return 409 Conflict
 * - Updates both task.status='in_progress' and agent.status='busy'
 *
 * Returns (200):
 * - task: {id, status, claimedAt}
 * - agent: {id, name, status}
 *
 * Returns (409):
 * - error: {code: 'TASK_ALREADY_CLAIMED', message: '...'}
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';

interface ClaimTaskRequest {
  agentId: string;
}

interface ClaimTaskResponse {
  task: {
    id: string;
    status: string;
    claimedAt: string;
  };
  agent: {
    id: string;
    name: string;
    status: string;
  };
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
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
  console.log('[Task Claim API] POST /api/v1/task/:id/claim called');

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
        } as ErrorResponse,
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
        } as ErrorResponse,
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
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Parse request body
    const body: ClaimTaskRequest = await request.json();

    // Validate required fields
    if (!body.agentId || typeof body.agentId !== 'string' || body.agentId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_AGENT_ID',
            message: 'agentId is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Atomic task claiming with race condition prevention
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          // Match task with status 'available' and agent
          MATCH (t:Task {id: $taskId, status: 'available'})
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})

          // Prevent race condition: only proceed if no CLAIMED_BY relationship exists
          WHERE NOT EXISTS((t)<-[:CLAIMED_BY]-(:Agent))

          // Create claim relationship and update statuses
          CREATE (t)<-[:CLAIMED_BY {claimed_at: datetime()}]-(a)
          SET t.status = 'in_progress',
              a.status = 'busy',
              t.updated_at = datetime(),
              a.updated_at = datetime()

          // Return task and agent data
          RETURN t.id as taskId,
                 t.status as taskStatus,
                 a.id as agentId,
                 a.name as agentName,
                 a.status as agentStatus,
                 datetime() as claimedAt
          `,
          {
            taskId,
            agentId: body.agentId.trim(),
            organizationId,
          }
        );
      });

      // Check if claim succeeded
      if (result.records.length === 0) {
        // Task either doesn't exist, not available, already claimed, or agent not found
        // Query to determine specific reason
        const diagnosisResult = await session.executeRead(async (tx) => {
          return tx.run(
            `
            OPTIONAL MATCH (t:Task {id: $taskId})
            OPTIONAL MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
            OPTIONAL MATCH (t)<-[:CLAIMED_BY]-(existingAgent:Agent)
            RETURN t.id as taskExists,
                   t.status as taskStatus,
                   a.id as agentExists,
                   existingAgent.id as claimedByAgent
            `,
            {
              taskId,
              agentId: body.agentId.trim(),
              organizationId,
            }
          );
        });

        const diagnosis = diagnosisResult.records[0];

        if (!diagnosis.get('taskExists')) {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_NOT_FOUND',
                message: 'Task not found',
              },
            } as ErrorResponse,
            { status: 404 }
          );
        }

        if (!diagnosis.get('agentExists')) {
          return NextResponse.json(
            {
              error: {
                code: 'AGENT_NOT_FOUND',
                message: 'Agent not found or access denied',
              },
            } as ErrorResponse,
            { status: 404 }
          );
        }

        if (diagnosis.get('claimedByAgent')) {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_ALREADY_CLAIMED',
                message: `Task is already claimed by agent ${diagnosis.get('claimedByAgent')}`,
              },
            } as ErrorResponse,
            { status: 409 }
          );
        }

        if (diagnosis.get('taskStatus') !== 'available') {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_NOT_AVAILABLE',
                message: `Task status is '${diagnosis.get('taskStatus')}', must be 'available' to claim`,
              },
            } as ErrorResponse,
            { status: 409 }
          );
        }

        // Fallback error
        return NextResponse.json(
          {
            error: {
              code: 'CLAIM_FAILED',
              message: 'Failed to claim task. Task may have been claimed concurrently.',
            },
          } as ErrorResponse,
          { status: 409 }
        );
      }

      // Claim succeeded
      const record = result.records[0];
      const response: ClaimTaskResponse = {
        task: {
          id: record.get('taskId'),
          status: record.get('taskStatus'),
          claimedAt: record.get('claimedAt').toString(),
        },
        agent: {
          id: record.get('agentId'),
          name: record.get('agentName'),
          status: record.get('agentStatus'),
        },
      };

      console.log('[Task Claim API] Task claimed successfully:', taskId, 'by agent:', body.agentId);
      return NextResponse.json(response, { status: 200 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Claim API] ERROR claiming task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to claim task',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
