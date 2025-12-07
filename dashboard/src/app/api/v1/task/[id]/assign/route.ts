/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, task-assignment, orchestrator, epic-004, sprint-4, multi-agent]
 * @related: [../claim/route.ts, ../release/route.ts, ../../available/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/task/:id/assign
 * Assign a task to a specific agent (orchestrator/supervisor initiated)
 *
 * Request Body:
 * - graphId: Graph ID for context (required)
 * - agentId: ID of agent to assign task to (required)
 * - orchestratorId: ID of orchestrator making the assignment (required)
 * - priority: Optional priority override (number)
 *
 * Assignment vs Claiming:
 * - Assignment: Orchestrator assigns TO an agent (push model)
 * - Claiming: Agent claims FOR themselves (pull model)
 * - Both create ownership, but different initiators
 *
 * Returns (200):
 * - success: true
 * - taskId: Task ID
 * - agentId: Agent assigned to
 * - assignedBy: Orchestrator ID
 * - assignedAt: Timestamp
 * - status: 'assigned'
 *
 * Returns (409):
 * - error: {code: 'TASK_ALREADY_ASSIGNED' | 'TASK_ALREADY_CLAIMED', message: '...'}
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';

interface AssignTaskRequest {
  graphId: string;
  agentId: string;
  orchestratorId: string;
  priority?: number;
}

interface AssignTaskResponse {
  success: boolean;
  taskId: string;
  agentId: string;
  assignedBy: string;
  assignedAt: string;
  status: 'assigned' | 'already_assigned' | 'not_found' | 'not_available';
  eventId?: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Extract organization_id from Bearer token
 */
function extractOrganizationId(token: string): string {
  if (!token || token.length < 8) {
    throw new Error('Invalid bearer token');
  }
  return 'org_' + Buffer.from(token).toString('base64').substring(0, 8);
}

/**
 * Generate event ID for assignment notification
 */
function generateEventId(taskId: string, agentId: string): string {
  const timestamp = Date.now();
  return `evt_assign_${taskId}_${agentId}_${timestamp}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Task Assign API] POST /api/v1/task/:id/assign called');

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
    const body: AssignTaskRequest = await request.json();

    // Validate required fields
    if (!body.graphId || typeof body.graphId !== 'string' || body.graphId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

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

    if (!body.orchestratorId || typeof body.orchestratorId !== 'string' || body.orchestratorId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_ORCHESTRATOR_ID',
            message: 'orchestratorId is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Atomic task assignment with race condition prevention
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          // Match task with status 'available' or 'pending', and the agent
          MATCH (t:Task {id: $taskId})
          WHERE t.status IN ['available', 'pending']
          MATCH (a:Agent {id: $agentId, organization_id: $organizationId})

          // Prevent race condition: ensure no existing CLAIMED_BY or ASSIGNED_TO
          WHERE NOT EXISTS((t)<-[:CLAIMED_BY]-(:Agent))
            AND NOT EXISTS((t)<-[:ASSIGNED_TO]-(:Agent))

          // Create assignment relationship and update status
          CREATE (t)<-[:ASSIGNED_TO {
            assigned_by: $orchestratorId,
            assigned_at: datetime(),
            priority: $priority
          }]-(a)
          SET t.status = 'assigned',
              t.updated_at = datetime()

          // Return task and agent data
          RETURN t.id as taskId,
                 t.status as taskStatus,
                 a.id as agentId,
                 a.name as agentName,
                 $orchestratorId as orchestratorId,
                 datetime() as assignedAt
          `,
          {
            taskId,
            agentId: body.agentId.trim(),
            orchestratorId: body.orchestratorId.trim(),
            organizationId,
            priority: body.priority ?? null,
          }
        );
      });

      // Check if assignment succeeded
      if (result.records.length === 0) {
        // Task either doesn't exist, not available, already assigned/claimed, or agent not found
        // Query to determine specific reason
        const diagnosisResult = await session.executeRead(async (tx) => {
          return tx.run(
            `
            OPTIONAL MATCH (t:Task {id: $taskId})
            OPTIONAL MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
            OPTIONAL MATCH (t)<-[:CLAIMED_BY]-(claimedByAgent:Agent)
            OPTIONAL MATCH (t)<-[:ASSIGNED_TO]-(assignedToAgent:Agent)
            RETURN t.id as taskExists,
                   t.status as taskStatus,
                   a.id as agentExists,
                   claimedByAgent.id as claimedByAgent,
                   assignedToAgent.id as assignedToAgent
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

        if (diagnosis.get('assignedToAgent')) {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_ALREADY_ASSIGNED',
                message: `Task is already assigned to agent ${diagnosis.get('assignedToAgent')}`,
              },
            } as ErrorResponse,
            { status: 409 }
          );
        }

        const taskStatus = diagnosis.get('taskStatus');
        if (taskStatus && !['available', 'pending'].includes(taskStatus)) {
          return NextResponse.json(
            {
              error: {
                code: 'TASK_NOT_AVAILABLE',
                message: `Task status is '${taskStatus}', must be 'available' or 'pending' to assign`,
              },
            } as ErrorResponse,
            { status: 409 }
          );
        }

        // Fallback error
        return NextResponse.json(
          {
            error: {
              code: 'ASSIGNMENT_FAILED',
              message: 'Failed to assign task. Task may have been assigned or claimed concurrently.',
            },
          } as ErrorResponse,
          { status: 409 }
        );
      }

      // Assignment succeeded - create event notification
      const record = result.records[0];
      const eventId = generateEventId(taskId, body.agentId.trim());

      try {
        await session.executeWrite(async (tx) => {
          await tx.run(
            `
            // Create assignment event for agent notification
            CREATE (e:Event {
              id: $eventId,
              user_id: $agentId,
              organization_id: $organizationId,
              project_id: $graphId,
              graph_id: $graphId,
              timestamp: datetime(),
              category: 'assignment',
              description: $description,
              files: [],
              impact: 'high',
              pressure: 0,
              branch: 'main',
              tags: ['task-assignment', 'orchestrator'],
              shared: true,
              task_id: $taskId,
              orchestrator_id: $orchestratorId
            })

            // Link event to task
            WITH e
            MATCH (t:Task {id: $taskId})
            CREATE (t)-[:HAS_EVENT]->(e)

            RETURN e.id as eventId
            `,
            {
              eventId,
              agentId: body.agentId.trim(),
              organizationId,
              graphId: body.graphId.trim(),
              taskId,
              orchestratorId: body.orchestratorId.trim(),
              description: `Task ${taskId} assigned by orchestrator ${body.orchestratorId}`,
            }
          );
        });

        console.log('[Task Assign API] Assignment event created:', eventId);
      } catch (eventError) {
        // Don't fail assignment if event creation fails
        console.warn('[Task Assign API] Failed to create assignment event:', eventError);
      }

      // Return success response
      const response: AssignTaskResponse = {
        success: true,
        taskId: record.get('taskId'),
        agentId: record.get('agentId'),
        assignedBy: record.get('orchestratorId'),
        assignedAt: record.get('assignedAt').toString(),
        status: 'assigned',
        eventId,
      };

      console.log('[Task Assign API] Task assigned successfully:', taskId, 'to agent:', body.agentId, 'by:', body.orchestratorId);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Assign API] ERROR assigning task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign task',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
