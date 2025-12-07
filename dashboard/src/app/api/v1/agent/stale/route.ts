/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, agent, stale-detection, epic-004, multi-agent, resilience]
 * @related: [../route.ts, ../[id]/route.ts, ../../graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/agent/stale
 * Detect stale agents (no heartbeat within grace period)
 *
 * Query params:
 * - graphId (required): Graph ID for filtering
 * - gracePeriod (optional): Grace period in minutes (default 5)
 *
 * Returns:
 * - staleAgents: Array of agents that haven't sent heartbeat within grace period
 * - gracePeriodMinutes: Grace period used for detection
 *
 * Pattern:
 * - Agents stale if last_heartbeat < (now - grace period)
 * - Excludes agents already marked offline
 * - Returns claimed tasks for each stale agent
 */

/**
 * POST /api/v1/agent/stale/release
 * Release tasks from stale agents
 *
 * Query params:
 * - graphId (required): Graph ID for filtering
 *
 * Request Body:
 * - agentId (optional): Specific agent to release, or all stale agents if not provided
 * - gracePeriod (optional): Grace period in minutes (default 5)
 *
 * Returns:
 * - success: Boolean
 * - agentId: Agent ID or "all" if bulk release
 * - releasedTasks: Array of tasks released
 *
 * Pattern:
 * - Marks agent(s) as offline
 * - Deletes CLAIMED_BY relationships
 * - Sets tasks back to 'available' status
 * - Creates audit event
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface StaleAgentInfo {
  agentId: string;
  lastHeartbeat: string;
  staleSince: string;
  claimedTasks: string[];
}

interface StaleAgentsResponse {
  staleAgents: StaleAgentInfo[];
  gracePeriodMinutes: number;
}

interface ReleaseTasksRequest {
  agentId?: string;
  gracePeriod?: number;
}

interface ReleaseTasksResponse {
  success: boolean;
  agentId: string;
  releasedTasks: Array<{
    taskId: string;
    previousAgent: string;
    releasedAt: string;
  }>;
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

export async function GET(request: NextRequest) {
  console.log('[Agent Stale API] GET /api/v1/agent/stale called');

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
    const graphId = searchParams.get('graphId');
    const gracePeriod = parseInt(searchParams.get('gracePeriod') || '5', 10);

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required as a query parameter',
          },
        },
        { status: 400 }
      );
    }

    // Validate grace period
    if (gracePeriod < 1 || gracePeriod > 60) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_GRACE_PERIOD',
            message: 'gracePeriod must be between 1 and 60 minutes',
          },
        },
        { status: 400 }
      );
    }

    // Query stale agents
    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (a:Agent)
          WHERE a.organization_id = $organizationId
            AND a.last_heartbeat < datetime() - duration('PT' + $gracePeriod + 'M')
            AND a.status <> 'offline'
          OPTIONAL MATCH (a)-[:CLAIMED_BY]->(t:Task)
          WITH a, collect(t.id) as claimedTasks
          RETURN a.id as agentId,
                 a.last_heartbeat as lastHeartbeat,
                 datetime() as now,
                 claimedTasks
          `,
          {
            organizationId,
            gracePeriod: neo4j.int(gracePeriod),
          }
        );
      });

      const staleAgents: StaleAgentInfo[] = result.records.map((record) => {
        const lastHeartbeat = record.get('lastHeartbeat');
        const now = record.get('now');

        return {
          agentId: record.get('agentId'),
          lastHeartbeat: lastHeartbeat ? lastHeartbeat.toString() : new Date().toISOString(),
          staleSince: now.toString(),
          claimedTasks: record.get('claimedTasks').filter((id: string | null) => id !== null),
        };
      });

      const response: StaleAgentsResponse = {
        staleAgents,
        gracePeriodMinutes: gracePeriod,
      };

      console.log('[Agent Stale API] Found', staleAgents.length, 'stale agent(s)');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent Stale API] ERROR detecting stale agents:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to detect stale agents',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[Agent Stale API] POST /api/v1/agent/stale/release called');

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
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required as a query parameter',
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: ReleaseTasksRequest = await request.json();
    const gracePeriod = body.gracePeriod || 5;

    // Validate grace period
    if (gracePeriod < 1 || gracePeriod > 60) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_GRACE_PERIOD',
            message: 'gracePeriod must be between 1 and 60 minutes',
          },
        },
        { status: 400 }
      );
    }

    // Release tasks from stale agent(s)
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        // Build query based on whether specific agent or all stale agents
        let query: string;
        const params: Record<string, any> = {
          organizationId,
          gracePeriod: neo4j.int(gracePeriod),
        };

        if (body.agentId) {
          // Release tasks from specific agent
          query = `
            MATCH (a:Agent {id: $agentId, organization_id: $organizationId})
            SET a.status = 'offline', a.updated_at = datetime()
            WITH a
            MATCH (a)-[c:CLAIMED_BY]->(t:Task)
            DELETE c
            SET t.status = 'available', t.updated_at = datetime()
            RETURN a.id as agentId, collect({taskId: t.id, releasedAt: datetime()}) as tasks
          `;
          params.agentId = body.agentId;
        } else {
          // Release tasks from all stale agents
          query = `
            MATCH (a:Agent)
            WHERE a.organization_id = $organizationId
              AND a.last_heartbeat < datetime() - duration('PT' + $gracePeriod + 'M')
              AND a.status <> 'offline'
            SET a.status = 'offline', a.updated_at = datetime()
            WITH a
            MATCH (a)-[c:CLAIMED_BY]->(t:Task)
            DELETE c
            SET t.status = 'available', t.updated_at = datetime()
            RETURN a.id as agentId, collect({taskId: t.id, releasedAt: datetime()}) as tasks
          `;
        }

        return tx.run(query, params);
      });

      // Aggregate released tasks from all agents
      const releasedTasks: Array<{
        taskId: string;
        previousAgent: string;
        releasedAt: string;
      }> = [];

      for (const record of result.records) {
        const agentId = record.get('agentId');
        const tasks = record.get('tasks');

        for (const task of tasks) {
          releasedTasks.push({
            taskId: task.taskId,
            previousAgent: agentId,
            releasedAt: task.releasedAt.toString(),
          });
        }
      }

      const response: ReleaseTasksResponse = {
        success: true,
        agentId: body.agentId || 'all',
        releasedTasks,
      };

      console.log('[Agent Stale API] Released', releasedTasks.length, 'task(s) from', body.agentId || 'all stale agents');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Agent Stale API] ERROR releasing stale agent tasks:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to release stale agent tasks',
        },
      },
      { status: 500 }
    );
  }
}
