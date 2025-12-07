/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [api, escalation, human-intervention, epic-004, multi-agent]
 * @related: [../route.ts, ../../agent/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/escalation/:id/acknowledge
 * Human acknowledges an escalation
 *
 * Request Body:
 * - acknowledgedBy: Email/ID of person acknowledging (required)
 *
 * Returns:
 * - escalationId: Escalation ID
 * - status: 'acknowledged'
 * - acknowledgedAt: Timestamp
 * - acknowledgedBy: Person who acknowledged
 */

/**
 * POST /api/v1/escalation/:id/resolve
 * Human resolves an escalation
 *
 * Request Body:
 * - resolvedBy: Email/ID of person resolving (required)
 * - resolution: Resolution details (required)
 *
 * Returns:
 * - escalationId: Escalation ID
 * - status: 'resolved'
 * - resolvedAt: Timestamp
 * - resolvedBy: Person who resolved
 * - resolution: Resolution details
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';

interface AcknowledgeRequest {
  acknowledgedBy: string;
}

interface AcknowledgeResponse {
  escalationId: string;
  status: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
}

interface ResolveRequest {
  resolvedBy: string;
  resolution: string;
}

interface ResolveResponse {
  escalationId: string;
  status: string;
  resolvedAt: string;
  resolvedBy: string;
  resolution: string;
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const escalationId = params.id;
  const { pathname } = new URL(request.url);

  console.log(`[Escalation API] POST /api/v1/escalation/${escalationId} called`);
  console.log(`[Escalation API] Pathname: ${pathname}`);

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

    // Determine action based on pathname
    if (pathname.endsWith('/acknowledge')) {
      return await handleAcknowledge(request, escalationId, organizationId);
    } else if (pathname.endsWith('/resolve')) {
      return await handleResolve(request, escalationId, organizationId);
    } else {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be /acknowledge or /resolve',
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Escalation API] ERROR processing escalation action:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process escalation action',
        },
      },
      { status: 500 }
    );
  }
}

async function handleAcknowledge(
  request: NextRequest,
  escalationId: string,
  organizationId: string
): Promise<NextResponse> {
  console.log(`[Escalation API] Acknowledging escalation: ${escalationId}`);

  // Parse request body
  const body: AcknowledgeRequest = await request.json();

  // Validate required fields
  if (!body.acknowledgedBy || typeof body.acknowledgedBy !== 'string' || body.acknowledgedBy.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_ACKNOWLEDGED_BY',
          message: 'acknowledgedBy is required and must be a non-empty string',
        },
      },
      { status: 400 }
    );
  }

  const session = getSession();
  try {
    const result = await session.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH (e:Escalation {id: $id, organization_id: $organizationId})
        WHERE e.status = 'open'
        SET e.status = 'acknowledged',
            e.acknowledged_at = datetime(),
            e.acknowledged_by = $acknowledgedBy
        RETURN e.id as id,
               e.status as status,
               e.acknowledged_at as acknowledgedAt,
               e.acknowledged_by as acknowledgedBy
        `,
        {
          id: escalationId,
          organizationId,
          acknowledgedBy: body.acknowledgedBy.trim(),
        }
      );
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'ESCALATION_NOT_FOUND',
            message: 'Escalation not found or already acknowledged/resolved',
          },
        },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const response: AcknowledgeResponse = {
      escalationId: record.get('id'),
      status: record.get('status'),
      acknowledgedAt: record.get('acknowledgedAt').toString(),
      acknowledgedBy: record.get('acknowledgedBy'),
    };

    console.log('[Escalation API] Escalation acknowledged successfully:', response.escalationId);
    return NextResponse.json(response);
  } finally {
    await session.close();
  }
}

async function handleResolve(
  request: NextRequest,
  escalationId: string,
  organizationId: string
): Promise<NextResponse> {
  console.log(`[Escalation API] Resolving escalation: ${escalationId}`);

  // Parse request body
  const body: ResolveRequest = await request.json();

  // Validate required fields
  if (!body.resolvedBy || typeof body.resolvedBy !== 'string' || body.resolvedBy.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_RESOLVED_BY',
          message: 'resolvedBy is required and must be a non-empty string',
        },
      },
      { status: 400 }
    );
  }

  if (!body.resolution || typeof body.resolution !== 'string' || body.resolution.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_RESOLUTION',
          message: 'resolution is required and must be a non-empty string',
        },
      },
      { status: 400 }
    );
  }

  const session = getSession();
  try {
    const result = await session.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH (e:Escalation {id: $id, organization_id: $organizationId})
        WHERE e.status IN ['open', 'acknowledged']
        SET e.status = 'resolved',
            e.resolved_at = datetime(),
            e.resolved_by = $resolvedBy,
            e.resolution = $resolution
        RETURN e.id as id,
               e.status as status,
               e.resolved_at as resolvedAt,
               e.resolved_by as resolvedBy,
               e.resolution as resolution
        `,
        {
          id: escalationId,
          organizationId,
          resolvedBy: body.resolvedBy.trim(),
          resolution: body.resolution.trim(),
        }
      );
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'ESCALATION_NOT_FOUND',
            message: 'Escalation not found or already resolved',
          },
        },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const response: ResolveResponse = {
      escalationId: record.get('id'),
      status: record.get('status'),
      resolvedAt: record.get('resolvedAt').toString(),
      resolvedBy: record.get('resolvedBy'),
      resolution: record.get('resolution'),
    };

    console.log('[Escalation API] Escalation resolved successfully:', response.escalationId);
    return NextResponse.json(response);
  } finally {
    await session.close();
  }
}
