/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [events, stream, long-poll, adr-051, realtime, multi-agent]
 * @related: [../route.ts, ../../graph/events/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events/stream
 *
 * Event streaming endpoint with long-polling support (EPIC-004 Sprint 2 TASK-2)
 *
 * Query Parameters:
 * - since: Event ID to read from (exclusive) - returns events after this ID
 * - timeout: Long-poll timeout in seconds (default: 30, max: 60)
 * - limit: Maximum events to return (default: 50, max: 200)
 * - graphId: Required - the graph to query
 * - categories: Filter by event categories (comma-separated)
 * - agent_id: Filter by agent ID (for agent-specific streams)
 *
 * Returns:
 * - events: Array of events in chronological order
 * - hasMore: Whether more events are available
 * - lastEventId: ID of the last event returned (for next poll)
 *
 * Long-Polling Behavior:
 * - If events exist since the cursor, return immediately
 * - If no events, hold connection up to `timeout` seconds
 * - Returns empty array on timeout (not an error)
 * - Client should immediately re-poll after response
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface StreamEvent {
  id: string;
  user_id: string;
  agent_id?: string;
  project_id: string;
  organization_id?: string;
  timestamp: string;
  category: string;
  description: string;
  files: string[];
  impact: string;
  pressure?: number;
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
}

interface StreamResponse {
  events: StreamEvent[];
  hasMore: boolean;
  lastEventId: string | null;
  pollDurationMs: number;
}

// Poll interval for checking new events during long-poll (in ms)
const POLL_INTERVAL_MS = 500;

/**
 * Query events from Neo4j since a specific event ID
 */
async function queryEventsSince(
  graphId: string,
  sinceEventId: string | null,
  limit: number,
  categories: string[] | null,
  agentId: string | null
): Promise<StreamEvent[]> {
  // Build WHERE clauses
  const whereConditions: string[] = ['e.graph_id = $graphId'];
  const params: Record<string, any> = {
    graphId,
    limit: neo4j.int(limit + 1), // Fetch one extra to detect hasMore
  };

  if (sinceEventId) {
    // Get timestamp of the since event, then fetch events after it
    whereConditions.push(`
      e.timestamp > (
        CASE
          WHEN EXISTS((SELECT 1 FROM Event WHERE id = $sinceEventId))
          THEN (MATCH (ref:Event {id: $sinceEventId}) RETURN ref.timestamp)[0]
          ELSE datetime('1970-01-01T00:00:00Z')
        END
      )
    `);
    params.sinceEventId = sinceEventId;
  }

  if (categories && categories.length > 0) {
    whereConditions.push('e.category IN $categories');
    params.categories = categories;
  }

  if (agentId) {
    whereConditions.push('e.agent_id = $agentId');
    params.agentId = agentId;
  }

  // For sinceEventId, we need a different query approach
  let cypher: string;
  if (sinceEventId) {
    cypher = `
      MATCH (ref:Event {id: $sinceEventId})
      MATCH (e:Event)
      WHERE e.graph_id = $graphId
        AND e.timestamp > ref.timestamp
        ${categories && categories.length > 0 ? 'AND e.category IN $categories' : ''}
        ${agentId ? 'AND e.agent_id = $agentId' : ''}
      RETURN e
      ORDER BY e.timestamp ASC
      LIMIT $limit
    `;
  } else {
    // No cursor - return most recent events
    cypher = `
      MATCH (e:Event)
      WHERE e.graph_id = $graphId
        ${categories && categories.length > 0 ? 'AND e.category IN $categories' : ''}
        ${agentId ? 'AND e.agent_id = $agentId' : ''}
      RETURN e
      ORDER BY e.timestamp DESC
      LIMIT $limit
    `;
  }

  const results = await runQuery<{ e: { properties: any } }>(cypher, params);

  const events = results.map((r) => {
    const props = r.e.properties;
    return {
      id: props.id,
      user_id: props.user_id,
      agent_id: props.agent_id || null,
      project_id: props.project_id,
      organization_id: props.organization_id || null,
      timestamp: props.timestamp?.toString() || new Date().toISOString(),
      category: props.category,
      description: props.description,
      files: props.files || [],
      impact: props.impact,
      pressure: props.pressure,
      branch: props.branch,
      tags: props.tags || [],
      shared: props.shared ?? false,
      commit_hash: props.commit_hash || null,
    };
  });

  // If no sinceEventId, we fetched DESC, so reverse to ASC
  if (!sinceEventId) {
    events.reverse();
  }

  return events;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable',
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
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');
    const sinceEventId = searchParams.get('since');
    const timeoutStr = searchParams.get('timeout') || '30';
    const limitStr = searchParams.get('limit') || '50';
    const categoriesStr = searchParams.get('categories');
    const agentId = searchParams.get('agent_id');

    // Validate graphId
    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate timeout
    const timeout = Math.min(Math.max(parseInt(timeoutStr, 10) || 30, 1), 60);
    const timeoutMs = timeout * 1000;

    // Parse and validate limit
    const limit = Math.min(Math.max(parseInt(limitStr, 10) || 50, 1), 200);

    // Parse categories
    const categories = categoriesStr
      ? categoriesStr.split(',').map((c) => c.trim()).filter(Boolean)
      : null;

    // Long-polling loop
    let events: StreamEvent[] = [];
    let pollCount = 0;
    const maxPolls = Math.ceil(timeoutMs / POLL_INTERVAL_MS);

    while (pollCount < maxPolls) {
      // Check for abort signal (client disconnected)
      if (request.signal?.aborted) {
        console.log('[Events Stream] Client disconnected, aborting poll');
        break;
      }

      // Query for events
      events = await queryEventsSince(graphId, sinceEventId, limit, categories, agentId);

      // If we have events, return immediately
      if (events.length > 0) {
        break;
      }

      // No events yet - wait and try again
      pollCount++;
      if (pollCount < maxPolls) {
        await sleep(POLL_INTERVAL_MS);
      }
    }

    // Determine if there are more events
    const hasMore = events.length > limit;
    if (hasMore) {
      events = events.slice(0, limit);
    }

    // Get last event ID for next poll
    const lastEventId = events.length > 0 ? events[events.length - 1].id : sinceEventId;

    const response: StreamResponse = {
      events,
      hasMore,
      lastEventId,
      pollDurationMs: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Events Stream] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to stream events',
        },
      },
      { status: 500 }
    );
  }
}
