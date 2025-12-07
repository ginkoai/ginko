/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [dead-letter-queue, dlq, retry, resilience, epic-004]
 * @related: [../route.ts, ../../route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/events/dlq/:id/retry
 *
 * Retry a failed event from the Dead Letter Queue
 *
 * Path Parameters:
 * - id: DLQ entry ID
 *
 * Body:
 * - graphId: Graph ID (required)
 * - maxRetries: Maximum retry attempts (optional, default 3)
 *
 * Returns:
 * - success: Whether retry succeeded
 * - entry: Updated DLQ entry
 * - error: Error message if failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '../../../graph/_neo4j';
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

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS = [
  60 * 1000,        // 1 minute
  5 * 60 * 1000,    // 5 minutes
  30 * 60 * 1000    // 30 minutes
];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const entryId = params.id;

    // Parse request body
    const body = await request.json();
    const { graphId, maxRetries = DEFAULT_MAX_RETRIES } = body;

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required field: graphId' },
        { status: 400 }
      );
    }

    // Fetch DLQ entry
    const fetchQuery = `
      MATCH (dlq:DeadLetterEntry {id: $entryId, graph_id: $graphId})
      RETURN dlq
    `;

    const fetchResult = await runQuery<any>(fetchQuery, { entryId, graphId });

    if (fetchResult.length === 0) {
      return NextResponse.json(
        { error: 'DLQ entry not found' },
        { status: 404 }
      );
    }

    const dlqProps = fetchResult[0].dlq.properties;

    // Check if max retries exceeded
    const retryCount = dlqProps.retry_count || 0;
    if (retryCount >= maxRetries) {
      // Mark as abandoned
      const abandonQuery = `
        MATCH (dlq:DeadLetterEntry {id: $entryId})
        SET dlq.status = 'abandoned',
            dlq.last_retry_at = datetime()
        RETURN dlq
      `;

      await runQuery<any>(abandonQuery, { entryId });

      return NextResponse.json({
        success: false,
        entry: {
          id: dlqProps.id,
          status: 'abandoned',
          retryCount
        },
        error: 'Max retry attempts exceeded'
      });
    }

    // Check retry delay
    if (dlqProps.last_retry_at) {
      const delayIndex = Math.min(retryCount, RETRY_DELAYS.length - 1);
      const requiredDelay = RETRY_DELAYS[delayIndex];
      const lastRetryTime = new Date(dlqProps.last_retry_at).getTime();
      const timeSinceLastRetry = Date.now() - lastRetryTime;

      if (timeSinceLastRetry < requiredDelay) {
        const remainingDelay = requiredDelay - timeSinceLastRetry;

        return NextResponse.json({
          success: false,
          entry: {
            id: dlqProps.id,
            status: dlqProps.status,
            retryCount
          },
          error: `Retry delay not met. Wait ${Math.ceil(remainingDelay / 1000)}s`
        });
      }
    }

    // Update status to retrying
    const updateQuery = `
      MATCH (dlq:DeadLetterEntry {id: $entryId})
      SET dlq.status = 'retrying',
          dlq.retry_count = $retryCount,
          dlq.last_retry_at = datetime()
      RETURN dlq
    `;

    await runQuery<any>(updateQuery, {
      entryId,
      retryCount: neo4j.int(retryCount + 1)
    });

    console.log(`[DLQ API] Retrying entry ${entryId} (attempt ${retryCount + 1}/${maxRetries})`);

    try {
      // Parse original event
      const originalEvent = JSON.parse(dlqProps.original_event);

      // Attempt to create event in graph
      const createEventQuery = `
        MERGE (e:Event {id: $id})
        SET e.user_id = $user_id,
            e.organization_id = $organization_id,
            e.project_id = $project_id,
            e.category = $category,
            e.description = $description,
            e.timestamp = datetime($timestamp),
            e.impact = $impact,
            e.files = $files,
            e.branch = $branch,
            e.tags = $tags,
            e.shared = $shared,
            e.commit_hash = $commit_hash,
            e.pressure = $pressure,
            e.blocked_by = $blocked_by,
            e.blocking_tasks = $blocking_tasks,
            e.blocker_severity = $blocker_severity,
            e.agent_id = $agent_id
        RETURN e
      `;

      await runQuery<any>(createEventQuery, {
        id: originalEvent.id,
        user_id: originalEvent.user_id,
        organization_id: originalEvent.organization_id,
        project_id: originalEvent.project_id,
        category: originalEvent.category,
        description: originalEvent.description,
        timestamp: originalEvent.timestamp,
        impact: originalEvent.impact || 'medium',
        files: originalEvent.files || [],
        branch: originalEvent.branch,
        tags: originalEvent.tags || [],
        shared: originalEvent.shared || false,
        commit_hash: originalEvent.commit_hash,
        pressure: originalEvent.pressure,
        blocked_by: originalEvent.blocked_by,
        blocking_tasks: originalEvent.blocking_tasks || [],
        blocker_severity: originalEvent.blocker_severity,
        agent_id: originalEvent.agent_id
      });

      // Success - mark as resolved
      const resolveQuery = `
        MATCH (dlq:DeadLetterEntry {id: $entryId})
        SET dlq.status = 'resolved'
        RETURN dlq
      `;

      const resolveResult = await runQuery<any>(resolveQuery, { entryId });

      const resolvedProps = resolveResult[0].dlq.properties;

      console.log(`[DLQ API] ✓ Entry ${entryId} successfully retried and resolved`);

      return NextResponse.json({
        success: true,
        entry: {
          id: resolvedProps.id,
          originalEvent: JSON.parse(resolvedProps.original_event),
          failureReason: resolvedProps.failure_reason,
          failedAt: new Date(resolvedProps.failed_at),
          retryCount: resolvedProps.retry_count || 0,
          lastRetryAt: resolvedProps.last_retry_at ? new Date(resolvedProps.last_retry_at) : undefined,
          status: resolvedProps.status,
          graphId: resolvedProps.graph_id
        }
      });
    } catch (retryError: any) {
      const errorMessage = retryError.message || String(retryError);
      console.error(`[DLQ API] Retry attempt failed for ${entryId}:`, errorMessage);

      // Determine new status
      const newRetryCount = retryCount + 1;
      const newStatus = newRetryCount >= maxRetries ? 'abandoned' : 'pending';

      // Update with failure info
      const failQuery = `
        MATCH (dlq:DeadLetterEntry {id: $entryId})
        SET dlq.status = $status,
            dlq.failure_reason = $failureReason
        RETURN dlq
      `;

      const failResult = await runQuery<any>(failQuery, {
        entryId,
        status: newStatus,
        failureReason: `${dlqProps.failure_reason}\nRetry ${newRetryCount} failed: ${errorMessage}`
      });

      const failedProps = failResult[0].dlq.properties;

      return NextResponse.json({
        success: false,
        entry: {
          id: failedProps.id,
          status: failedProps.status,
          retryCount: newRetryCount,
          failureReason: failedProps.failure_reason
        },
        error: errorMessage
      });
    }
  } catch (error: any) {
    console.error('[DLQ API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retry DLQ entry',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/events/dlq/:id
 *
 * Get a specific DLQ entry by ID
 *
 * Query Parameters:
 * - graphId: Graph ID (required)
 *
 * Returns:
 * - entry: DLQ entry details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const entryId = params.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Fetch DLQ entry
    const query = `
      MATCH (dlq:DeadLetterEntry {id: $entryId, graph_id: $graphId})
      RETURN dlq
    `;

    const result = await runQuery<any>(query, { entryId, graphId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'DLQ entry not found' },
        { status: 404 }
      );
    }

    const props = result[0].dlq.properties;

    const entry: DeadLetterEntry = {
      id: props.id,
      originalEvent: JSON.parse(props.original_event),
      failureReason: props.failure_reason,
      failedAt: new Date(props.failed_at),
      retryCount: props.retry_count || 0,
      lastRetryAt: props.last_retry_at ? new Date(props.last_retry_at) : undefined,
      status: props.status,
      graphId: props.graph_id
    };

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('[DLQ API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch DLQ entry',
        message: error.message
      },
      { status: 500 }
    );
  }
}
