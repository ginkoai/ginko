/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, task-verification, quality-exception, epic-004, multi-agent]
 * @related: [../verify/route.ts, ../claim/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/task/:id/override
 * Allow human users to override failed verification and mark task complete
 *
 * Request Body:
 * - reason: Explanation for override (required)
 * - graphId: Graph ID for logging (required)
 *
 * Authorization:
 * - Only human users (User nodes, not Agent nodes) can override
 * - Requires valid Bearer token
 *
 * Returns (200):
 * - taskId: Task ID
 * - overridden: true
 * - overriddenBy: User ID
 * - reason: Override reason
 * - timestamp: Override timestamp
 *
 * Returns (403):
 * - error: {code: 'FORBIDDEN', message: 'Only human users can override verification'}
 *
 * Returns (400):
 * - error: {code: 'MISSING_REASON', message: 'Override reason is required'}
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../../graph/_neo4j';

interface OverrideRequest {
  reason: string;
  graphId: string;
}

interface OverrideResult {
  taskId: string;
  overridden: boolean;
  overriddenBy: string;
  reason: string;
  timestamp: string;
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

/**
 * Extract user ID from Bearer token
 * For MVP, we'll derive user ID from the token itself
 * In production, this would validate against a user database
 * Format: Extract email or user identifier from token
 */
function extractUserId(token: string): string {
  if (!token || token.length < 16) {
    throw new Error('Invalid bearer token');
  }
  // For MVP: Use a portion of the token as user ID
  // In production: Decode JWT and extract user ID
  return 'user_' + Buffer.from(token).toString('base64').substring(0, 12);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Task Override API] POST /api/v1/task/:id/override called');

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
    const userId = extractUserId(token);

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
    const body: OverrideRequest = await request.json();

    // Validate required fields
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_REASON',
            message: 'Override reason is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    if (!body.graphId || typeof body.graphId !== 'string' || body.graphId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'Graph ID is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Check authorization: Only human users can override
    const session = getSession();
    try {
      // First, verify this is a User node, not an Agent node
      const authResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          // Check if userId corresponds to a User node (not Agent)
          OPTIONAL MATCH (u:User {id: $userId})
          OPTIONAL MATCH (a:Agent {id: $userId, organization_id: $organizationId})
          RETURN u.id as isUser, a.id as isAgent
          `,
          {
            userId,
            organizationId,
          }
        );
      });

      const authRecord = authResult.records[0];
      const isUser = authRecord.get('isUser') !== null;
      const isAgent = authRecord.get('isAgent') !== null;

      // If this is an agent, deny access
      if (isAgent || !isUser) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Only human users can override verification. Agents cannot override quality checks.',
            },
          } as ErrorResponse,
          { status: 403 }
        );
      }

      // Perform the override: mark task complete and log the override
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          // Match task and user
          MATCH (t:Task {id: $taskId})
          MATCH (u:User {id: $userId})

          // Create override record
          CREATE (o:QualityOverride {
            id: 'override_' + toString(timestamp()),
            task_id: $taskId,
            user_id: $userId,
            reason: $reason,
            timestamp: datetime(),
            graph_id: $graphId
          })

          // Create relationships
          CREATE (t)-[:OVERRIDDEN_BY]->(o)
          CREATE (u)-[:PERFORMED_OVERRIDE]->(o)

          // Update task status to complete
          SET t.status = 'complete',
              t.completed_at = datetime(),
              t.updated_at = datetime(),
              t.quality_override = true

          // Return result
          RETURN t.id as taskId,
                 o.id as overrideId,
                 o.reason as reason,
                 o.timestamp as timestamp,
                 u.id as userId
          `,
          {
            taskId,
            userId,
            reason: body.reason.trim(),
            graphId: body.graphId.trim(),
          }
        );
      });

      // Check if override succeeded
      if (result.records.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'TASK_NOT_FOUND',
              message: 'Task not found or access denied',
            },
          } as ErrorResponse,
          { status: 404 }
        );
      }

      // Override succeeded
      const record = result.records[0];
      const response: OverrideResult = {
        taskId: record.get('taskId'),
        overridden: true,
        overriddenBy: record.get('userId'),
        reason: record.get('reason'),
        timestamp: record.get('timestamp').toString(),
      };

      console.log('[Task Override API] Quality override successful:', taskId, 'by user:', userId);
      return NextResponse.json(response, { status: 200 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Override API] ERROR overriding task:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to override task verification',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
