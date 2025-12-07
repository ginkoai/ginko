/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, task-available, orchestration, epic-004, sprint-4]
 * @related: [../[id]/claim/route.ts, ../[id]/assign/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/available
 * Returns tasks ready for execution (all dependencies satisfied)
 *
 * Query Parameters:
 * - graphId (required): Graph to query
 * - sprintId (optional): Filter to specific sprint
 * - capabilities (optional): Comma-separated capabilities to filter by
 * - limit (optional, default 10): Max tasks to return
 *
 * A task is available if:
 * - Status is 'pending' or 'available'
 * - NOT already claimed or assigned
 * - ALL dependencies have status 'complete'
 *
 * Returns (200):
 * - tasks: Array of available tasks
 * - total: Count of available tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';

interface AvailableTask {
  id: string;
  title: string;
  description: string;
  effort: string;
  priority: number;
  requiredCapabilities: string[];
  sprintId: string;
}

interface AvailableTasksResponse {
  tasks: AvailableTask[];
  total: number;
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

export async function GET(request: NextRequest) {
  console.log('[Available Tasks API] GET /api/v1/task/available called');

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const sprintId = searchParams.get('sprintId');
    const capabilitiesParam = searchParams.get('capabilities');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId query parameter is required',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Parse optional parameters
    const capabilities = capabilitiesParam
      ? capabilitiesParam.split(',').map(c => c.trim()).filter(c => c.length > 0)
      : null;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;

    // Build Cypher query
    const session = getSession();
    try {
      // Query for available tasks:
      // 1. Task status is 'pending' or 'available'
      // 2. No CLAIMED_BY or ASSIGNED_TO relationships
      // 3. All DEPENDS_ON targets have status 'complete'
      // 4. Optionally filter by capabilities and sprint
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          // Match tasks in the graph with pending/available status
          MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(t:Task)
          WHERE t.status IN ['pending', 'available']
            AND g.organization_id = $organizationId

          // Exclude already claimed or assigned tasks
          AND NOT EXISTS { (t)<-[:CLAIMED_BY]-(:Agent) }
          AND NOT EXISTS { (t)<-[:ASSIGNED_TO]-(:Agent) }

          // Check all dependencies are complete
          AND NOT EXISTS {
            MATCH (t)-[:DEPENDS_ON]->(dep:Task)
            WHERE dep.status <> 'complete'
          }

          // Optional sprint filter
          ${sprintId ? 'AND t.sprint_id = $sprintId' : ''}

          // Optional capability filter - task must have ALL required capabilities
          ${capabilities && capabilities.length > 0
            ? 'AND ALL(cap IN $capabilities WHERE cap IN COALESCE(t.required_capabilities, []))'
            : ''}

          // Return task data
          RETURN t.id as id,
                 t.title as title,
                 COALESCE(t.description, '') as description,
                 COALESCE(t.effort, 'medium') as effort,
                 COALESCE(t.priority, 0) as priority,
                 COALESCE(t.required_capabilities, []) as requiredCapabilities,
                 COALESCE(t.sprint_id, '') as sprintId

          ORDER BY t.priority DESC, t.created_at ASC
          LIMIT $limit
          `,
          {
            graphId,
            organizationId,
            sprintId: sprintId || null,
            capabilities: capabilities || [],
            limit,
          }
        );
      });

      // Transform results
      const tasks: AvailableTask[] = result.records.map(record => ({
        id: record.get('id'),
        title: record.get('title'),
        description: record.get('description'),
        effort: record.get('effort'),
        priority: typeof record.get('priority') === 'object'
          ? record.get('priority').toNumber()
          : record.get('priority'),
        requiredCapabilities: record.get('requiredCapabilities'),
        sprintId: record.get('sprintId'),
      }));

      const response: AvailableTasksResponse = {
        tasks,
        total: tasks.length,
      };

      console.log(`[Available Tasks API] Found ${tasks.length} available tasks for graph ${graphId}`);
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Available Tasks API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch available tasks',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
