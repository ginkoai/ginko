/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, escalation, human-intervention, epic-004, multi-agent]
 * @related: [./[id]/route.ts, ../agent/route.ts, ../task/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/escalation
 * Create a new escalation for human intervention
 *
 * Request Body:
 * - taskId: Task ID requiring escalation (required)
 * - agentId: Agent ID requesting escalation (required)
 * - reason: Reason for escalation (required)
 * - severity: Escalation severity (required: low|medium|high|critical)
 * - metadata: Additional context (optional)
 *
 * Returns:
 * - escalationId: Generated escalation ID
 * - taskId: Task ID
 * - agentId: Agent ID
 * - reason: Escalation reason
 * - severity: Severity level
 * - status: 'open'
 * - createdAt: Timestamp
 */

/**
 * GET /api/v1/escalation
 * List escalations with optional filtering
 *
 * Query params:
 * - graphId (required): Graph namespace ID
 * - status (optional): Filter by status (open|acknowledged|resolved)
 * - severity (optional): Filter by severity (low|medium|high|critical)
 * - taskId (optional): Filter by task ID
 * - agentId (optional): Filter by agent ID
 * - limit (optional): Max results (default 20, max 100)
 * - offset (optional): Pagination offset (default 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface CreateEscalationRequest {
  taskId: string;
  agentId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface CreateEscalationResponse {
  escalationId: string;
  taskId: string;
  agentId: string;
  reason: string;
  severity: string;
  status: string;
  organizationId: string;
  createdAt: string;
}

interface ListEscalationsResponse {
  escalations: Array<{
    id: string;
    taskId: string;
    agentId: string;
    reason: string;
    severity: string;
    status: string;
    organizationId: string;
    createdAt: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolution?: string;
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
 * Generate escalation ID
 * Format: escalation_{timestamp}_{random6}
 */
function generateEscalationId(): string {
  const timestamp = Date.now();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `escalation_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  console.log('[Escalation API] POST /api/v1/escalation called');

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
    const body: CreateEscalationRequest = await request.json();

    // Validate required fields
    if (!body.taskId || typeof body.taskId !== 'string' || body.taskId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_TASK_ID',
            message: 'taskId is required and must be a non-empty string',
          },
        },
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
        },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_REASON',
            message: 'reason is required and must be a non-empty string',
          },
        },
        { status: 400 }
      );
    }

    // Validate severity enum
    if (!['low', 'medium', 'high', 'critical'].includes(body.severity)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SEVERITY',
            message: 'severity must be one of: low, medium, high, critical',
          },
        },
        { status: 400 }
      );
    }

    const escalationId = generateEscalationId();

    // Create escalation in Neo4j
    const session = getSession();
    try {
      const result = await session.executeWrite(async (tx) => {
        return tx.run(
          `
          MATCH (t:Task {id: $taskId})
          MATCH (a:Agent {id: $agentId})
          CREATE (e:Escalation {
            id: $id,
            task_id: $taskId,
            agent_id: $agentId,
            reason: $reason,
            severity: $severity,
            status: 'open',
            organization_id: $organizationId,
            metadata: $metadata,
            created_at: datetime()
          })
          CREATE (t)-[:HAS_ESCALATION]->(e)
          CREATE (a)-[:CREATED_ESCALATION]->(e)
          RETURN e.id as id,
                 e.task_id as taskId,
                 e.agent_id as agentId,
                 e.reason as reason,
                 e.severity as severity,
                 e.status as status,
                 e.organization_id as organizationId,
                 e.created_at as createdAt
          `,
          {
            id: escalationId,
            taskId: body.taskId.trim(),
            agentId: body.agentId.trim(),
            reason: body.reason.trim(),
            severity: body.severity,
            organizationId,
            metadata: body.metadata || {},
          }
        );
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create escalation - task or agent not found');
      }

      const record = result.records[0];
      const response: CreateEscalationResponse = {
        escalationId: record.get('id'),
        taskId: record.get('taskId'),
        agentId: record.get('agentId'),
        reason: record.get('reason'),
        severity: record.get('severity'),
        status: record.get('status'),
        organizationId: record.get('organizationId'),
        createdAt: record.get('createdAt').toString(),
      };

      console.log('[Escalation API] Escalation created successfully:', response.escalationId);
      return NextResponse.json(response, { status: 201 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Escalation API] ERROR creating escalation:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create escalation',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Escalation API] GET /api/v1/escalation called');

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
    const severity = searchParams.get('severity');
    const taskId = searchParams.get('taskId');
    const agentId = searchParams.get('agentId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build WHERE clause
    const whereConditions = ['e.organization_id = $organizationId'];
    const params: Record<string, any> = {
      organizationId,
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };

    if (status) {
      if (!['open', 'acknowledged', 'resolved'].includes(status)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS',
              message: 'status must be one of: open, acknowledged, resolved',
            },
          },
          { status: 400 }
        );
      }
      whereConditions.push('e.status = $status');
      params.status = status;
    }

    if (severity) {
      if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_SEVERITY',
              message: 'severity must be one of: low, medium, high, critical',
            },
          },
          { status: 400 }
        );
      }
      whereConditions.push('e.severity = $severity');
      params.severity = severity;
    }

    if (taskId) {
      whereConditions.push('e.task_id = $taskId');
      params.taskId = taskId;
    }

    if (agentId) {
      whereConditions.push('e.agent_id = $agentId');
      params.agentId = agentId;
    }

    const whereClause = whereConditions.join(' AND ');

    const session = getSession();
    try {
      // Get total count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (e:Escalation) WHERE ${whereClause} RETURN count(e) as total`,
          params
        );
      });
      const total = countResult.records[0]?.get('total')?.toNumber() || 0;

      // Get escalations with pagination, ordered by severity then created_at
      const escalationsResult = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (e:Escalation)
          WHERE ${whereClause}
          RETURN e.id as id,
                 e.task_id as taskId,
                 e.agent_id as agentId,
                 e.reason as reason,
                 e.severity as severity,
                 e.status as status,
                 e.organization_id as organizationId,
                 e.created_at as createdAt,
                 e.acknowledged_at as acknowledgedAt,
                 e.acknowledged_by as acknowledgedBy,
                 e.resolved_at as resolvedAt,
                 e.resolved_by as resolvedBy,
                 e.resolution as resolution,
                 e.metadata as metadata
          ORDER BY
            CASE e.severity
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            e.created_at DESC
          SKIP $offset
          LIMIT $limit
          `,
          params
        );
      });

      const escalations = escalationsResult.records.map((record) => {
        const escalation: any = {
          id: record.get('id'),
          taskId: record.get('taskId'),
          agentId: record.get('agentId'),
          reason: record.get('reason'),
          severity: record.get('severity'),
          status: record.get('status'),
          organizationId: record.get('organizationId'),
          createdAt: record.get('createdAt').toString(),
        };

        // Add optional fields if present
        if (record.get('acknowledgedAt')) {
          escalation.acknowledgedAt = record.get('acknowledgedAt').toString();
        }
        if (record.get('acknowledgedBy')) {
          escalation.acknowledgedBy = record.get('acknowledgedBy');
        }
        if (record.get('resolvedAt')) {
          escalation.resolvedAt = record.get('resolvedAt').toString();
        }
        if (record.get('resolvedBy')) {
          escalation.resolvedBy = record.get('resolvedBy');
        }
        if (record.get('resolution')) {
          escalation.resolution = record.get('resolution');
        }
        if (record.get('metadata')) {
          escalation.metadata = record.get('metadata');
        }

        return escalation;
      });

      const response: ListEscalationsResponse = {
        escalations,
        total,
        limit,
        offset,
      };

      console.log('[Escalation API] Returning', escalations.length, 'escalations of', total, 'total');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Escalation API] ERROR listing escalations:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list escalations',
        },
      },
      { status: 500 }
    );
  }
}
