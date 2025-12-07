/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, checkpoint, multi-agent, epic-004, orchestrator]
 * @related: [../agent/route.ts, ../graph/_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/checkpoint
 * Create a checkpoint for agent work
 *
 * Request Body:
 * - graphId: Graph ID (required)
 * - taskId: Task ID (required)
 * - agentId: Agent ID (required)
 * - gitCommit: Git commit hash (required)
 * - filesModified: Array of modified file paths (required)
 * - eventsSince: Event ID cursor (required)
 * - message: Optional checkpoint message
 * - metadata: Optional additional metadata
 *
 * Returns:
 * - checkpoint: Checkpoint object with all fields
 */

/**
 * GET /api/v1/checkpoint
 * List checkpoints with optional filtering
 *
 * Query params:
 * - graphId (required): Graph ID
 * - taskId (optional): Filter by task ID
 * - agentId (optional): Filter by agent ID
 * - limit (optional): Max results (default 20, max 100)
 * - offset (optional): Pagination offset (default 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface CreateCheckpointRequest {
  graphId: string;
  taskId: string;
  agentId: string;
  gitCommit: string;
  filesModified: string[];
  eventsSince: string;
  message?: string;
  metadata?: Record<string, any>;
}

interface Checkpoint {
  id: string;
  taskId: string;
  agentId: string;
  timestamp: string;
  gitCommit: string;
  filesModified: string[];
  eventsSince: string;
  message?: string;
  metadata: Record<string, any>;
}

interface CreateCheckpointResponse {
  checkpoint: Checkpoint;
}

interface ListCheckpointsResponse {
  checkpoints: Checkpoint[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Extract organization_id from Bearer token
 * Format: 'org_' + first 8 chars of base64 encoded token
 */
function extractOrganizationId(token: string): string {
  if (!token || token.length < 8) {
    throw new Error('Invalid bearer token');
  }
  return 'org_' + Buffer.from(token).toString('base64').substring(0, 8);
}

/**
 * Generate checkpoint ID
 * Format: checkpoint_{timestamp}_{random6}
 */
function generateCheckpointId(): string {
  const timestamp = Date.now();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `checkpoint_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  console.log('[Checkpoint API] POST /api/v1/checkpoint called');

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
    const body: CreateCheckpointRequest = await request.json();

    // Validate required fields
    const requiredFields = [
      { name: 'graphId', value: body.graphId },
      { name: 'taskId', value: body.taskId },
      { name: 'agentId', value: body.agentId },
      { name: 'gitCommit', value: body.gitCommit },
      { name: 'eventsSince', value: body.eventsSince },
    ];

    for (const field of requiredFields) {
      if (!field.value || typeof field.value !== 'string' || field.value.trim().length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'MISSING_FIELD',
              message: `${field.name} is required and must be a non-empty string`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate filesModified is array
    if (!body.filesModified || !Array.isArray(body.filesModified)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FILES',
            message: 'filesModified is required and must be an array',
          },
        },
        { status: 400 }
      );
    }

    const checkpointId = generateCheckpointId();
    const timestamp = new Date().toISOString();

    // Create checkpoint in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          CREATE (c:Checkpoint {
            id: $id,
            graph_id: $graphId,
            task_id: $taskId,
            agent_id: $agentId,
            timestamp: datetime($timestamp),
            git_commit: $gitCommit,
            files_modified: $filesModified,
            events_since: $eventsSince,
            message: $message,
            metadata: $metadata,
            organization_id: $organizationId,
            created_at: datetime()
          })
          RETURN c.id as id,
                 c.task_id as taskId,
                 c.agent_id as agentId,
                 c.timestamp as timestamp,
                 c.git_commit as gitCommit,
                 c.files_modified as filesModified,
                 c.events_since as eventsSince,
                 c.message as message,
                 c.metadata as metadata
          `,
          {
            id: checkpointId,
            graphId: body.graphId.trim(),
            taskId: body.taskId.trim(),
            agentId: body.agentId.trim(),
            timestamp,
            gitCommit: body.gitCommit.trim(),
            filesModified: body.filesModified,
            eventsSince: body.eventsSince.trim(),
            message: body.message || null,
            metadata: body.metadata || {},
            organizationId,
          }
        );
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create checkpoint');
      }

      const record = result.records[0];
      const checkpoint: Checkpoint = {
        id: record.get('id'),
        taskId: record.get('taskId'),
        agentId: record.get('agentId'),
        timestamp: record.get('timestamp').toString(),
        gitCommit: record.get('gitCommit'),
        filesModified: record.get('filesModified'),
        eventsSince: record.get('eventsSince'),
        message: record.get('message'),
        metadata: record.get('metadata'),
      };

      const response: CreateCheckpointResponse = { checkpoint };

      console.log('[Checkpoint API] Checkpoint created successfully:', checkpoint.id);
      return NextResponse.json(response, { status: 201 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Checkpoint API] ERROR creating checkpoint:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create checkpoint',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Checkpoint API] GET /api/v1/checkpoint called');

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
    const taskId = searchParams.get('taskId');
    const agentId = searchParams.get('agentId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate required graphId
    if (!graphId || graphId.trim().length === 0) {
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

    // Build WHERE clause
    const whereConditions = [
      'c.organization_id = $organizationId',
      'c.graph_id = $graphId',
    ];
    const params: Record<string, any> = {
      organizationId,
      graphId,
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };

    if (taskId) {
      whereConditions.push('c.task_id = $taskId');
      params.taskId = taskId;
    }

    if (agentId) {
      whereConditions.push('c.agent_id = $agentId');
      params.agentId = agentId;
    }

    const whereClause = whereConditions.join(' AND ');

    const session = getSession();
    try {
      // Get total count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (c:Checkpoint) WHERE ${whereClause} RETURN count(c) as total`,
          params
        );
      });
      const total = countResult.records[0]?.get('total')?.toNumber() || 0;

      // Get checkpoints with pagination
      const checkpointsResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (c:Checkpoint)
          WHERE ${whereClause}
          RETURN c.id as id,
                 c.task_id as taskId,
                 c.agent_id as agentId,
                 c.timestamp as timestamp,
                 c.git_commit as gitCommit,
                 c.files_modified as filesModified,
                 c.events_since as eventsSince,
                 c.message as message,
                 c.metadata as metadata
          ORDER BY c.timestamp DESC
          SKIP $offset
          LIMIT $limit
          `,
          params
        );
      });

      const checkpoints: Checkpoint[] = checkpointsResult.records.map((record) => ({
        id: record.get('id'),
        taskId: record.get('taskId'),
        agentId: record.get('agentId'),
        timestamp: record.get('timestamp').toString(),
        gitCommit: record.get('gitCommit'),
        filesModified: record.get('filesModified'),
        eventsSince: record.get('eventsSince'),
        message: record.get('message'),
        metadata: record.get('metadata'),
      }));

      const response: ListCheckpointsResponse = {
        checkpoints,
        total,
        limit,
        offset,
      };

      console.log('[Checkpoint API] Returning', checkpoints.length, 'checkpoints of', total, 'total');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Checkpoint API] ERROR listing checkpoints:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list checkpoints',
        },
      },
      { status: 500 }
    );
  }
}
