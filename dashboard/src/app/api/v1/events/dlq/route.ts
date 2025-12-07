/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [dead-letter-queue, dlq, resilience, event-retry, epic-004]
 * @related: [../route.ts, _neo4j.ts, dlq/[id]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events/dlq
 *
 * List failed events in the Dead Letter Queue
 *
 * Query Parameters:
 * - graphId: Graph ID (required)
 * - status: Filter by status (pending|retrying|resolved|abandoned)
 * - limit: Number of entries to return (default: 50, max: 200)
 *
 * Returns:
 * - entries: Array of DLQ entries
 * - totalCount: Total number of entries matching filter
 * - stats: DLQ statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '../../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface DeadLetterEntry {
  id: string;
  originalEvent: any;
  failureReason: string;
  failedAt: Date;
  retryCount: number;
  lastRetryAt?: Date;
  status: 'pending' | 'retrying' | 'resolved' | 'abandoned';
  graphId: string;
}

export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');
    const status = searchParams.get('status') as 'pending' | 'retrying' | 'resolved' | 'abandoned' | null;
    const limit = searchParams.get('limit') || '50';

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    const entryLimit = parseInt(limit, 10);
    if (isNaN(entryLimit) || entryLimit < 1 || entryLimit > 200) {
      return NextResponse.json(
        { error: 'Invalid limit (must be 1-200)' },
        { status: 400 }
      );
    }

    // Build Cypher query for DLQ entries
    const statusFilter = status ? 'AND dlq.status = $status' : '';

    const query = `
      MATCH (dlq:DeadLetterEntry)
      WHERE dlq.graph_id = $graphId
        ${statusFilter}
      RETURN dlq
      ORDER BY dlq.failed_at ASC
      LIMIT $limit
    `;

    const params: any = {
      graphId,
      limit: neo4j.int(entryLimit)
    };

    if (status) {
      params.status = status;
    }

    const result = await runQuery<any>(query, params);

    const entries: DeadLetterEntry[] = result.map((r: any) => {
      const props = r.dlq.properties;
      return {
        id: props.id,
        originalEvent: JSON.parse(props.original_event),
        failureReason: props.failure_reason,
        failedAt: new Date(props.failed_at),
        retryCount: props.retry_count || 0,
        lastRetryAt: props.last_retry_at ? new Date(props.last_retry_at) : undefined,
        status: props.status,
        graphId: props.graph_id
      };
    });

    // Get statistics
    const statsQuery = `
      MATCH (dlq:DeadLetterEntry)
      WHERE dlq.graph_id = $graphId
      RETURN
        dlq.status as status,
        count(dlq) as count
    `;

    const statsResult = await runQuery<any>(statsQuery, { graphId });

    const stats = {
      pending: 0,
      retrying: 0,
      resolved: 0,
      abandoned: 0,
      total: 0
    };

    for (const row of statsResult) {
      const status = row.status as keyof typeof stats;
      const count = row.count.toNumber ? row.count.toNumber() : row.count;
      stats[status] = count;
      stats.total += count;
    }

    return NextResponse.json({
      entries,
      totalCount: entries.length,
      stats,
      appliedFilters: {
        status: status || null
      }
    });
  } catch (error: any) {
    console.error('[DLQ API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch DLQ entries',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/events/dlq
 *
 * Add a new entry to the Dead Letter Queue
 *
 * Body:
 * - graphId: Graph ID
 * - originalEvent: The event that failed to sync
 * - failureReason: Description of the failure
 *
 * Returns:
 * - entry: Created DLQ entry
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { graphId, originalEvent, failureReason } = body;

    if (!graphId || !originalEvent || !failureReason) {
      return NextResponse.json(
        { error: 'Missing required fields: graphId, originalEvent, failureReason' },
        { status: 400 }
      );
    }

    // Generate DLQ entry ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const entryId = `dlq_${timestamp}_${random}`;

    // Create DLQ entry node
    const query = `
      CREATE (dlq:DeadLetterEntry {
        id: $id,
        graph_id: $graphId,
        original_event: $originalEvent,
        failure_reason: $failureReason,
        failed_at: datetime(),
        retry_count: 0,
        status: 'pending'
      })
      RETURN dlq
    `;

    const result = await runQuery<any>(query, {
      id: entryId,
      graphId,
      originalEvent: JSON.stringify(originalEvent),
      failureReason
    });

    if (result.length === 0) {
      throw new Error('Failed to create DLQ entry');
    }

    const props = result[0].dlq.properties;

    const entry: DeadLetterEntry = {
      id: props.id,
      originalEvent: JSON.parse(props.original_event),
      failureReason: props.failure_reason,
      failedAt: new Date(props.failed_at),
      retryCount: props.retry_count || 0,
      status: props.status,
      graphId: props.graph_id
    };

    console.log(`[DLQ API] Created entry ${entryId} for event ${originalEvent.id}`);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: any) {
    console.error('[DLQ API] Error creating entry:', error);

    return NextResponse.json(
      {
        error: 'Failed to create DLQ entry',
        message: error.message
      },
      { status: 500 }
    );
  }
}
