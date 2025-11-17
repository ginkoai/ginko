/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [events, adr-043, session-cursor, context-loading]
 * @related: [_cloud-graph-client.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events
 *
 * Read events backward from cursor position (ADR-043 Phase 3)
 *
 * Query Parameters:
 * - cursorId: Session cursor ID
 * - limit: Number of events to read (default: 50)
 * - categories: Filter by event categories (comma-separated)
 * - branch: Filter by git branch
 *
 * Returns:
 * - events: Array of events in reverse chronological order
 * - cursor: Session cursor information
 * - totalCount: Number of events returned
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface Event {
  id: string;
  user_id: string;
  project_id: string;
  organization_id: string;
  timestamp: Date;
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

export async function GET(request: NextRequest) {
  // DEBUG: Log environment variables
  console.log('[Events API] NEO4J_URI:', process.env.NEO4J_URI);
  console.log('[Events API] NEO4J_USER:', process.env.NEO4J_USER);
  console.log('[Events API] NEO4J_PASSWORD:', process.env.NEO4J_PASSWORD ? '***' : undefined);

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
    const cursorId = searchParams.get('cursorId'); // This is actually an event ID (cursor position)
    const limit = searchParams.get('limit') || '50';
    const categories = searchParams.get('categories');
    const branch = searchParams.get('branch');

    if (!cursorId) {
      return NextResponse.json(
        { error: 'Missing required parameter: cursorId (event ID)' },
        { status: 400 }
      );
    }

    const eventLimit = parseInt(limit, 10);
    if (isNaN(eventLimit) || eventLimit < 1 || eventLimit > 200) {
      return NextResponse.json(
        { error: 'Invalid limit (must be 1-200)' },
        { status: 400 }
      );
    }

    // Read events backward from cursor position (event ID)
    const result = await runQuery<any>(
      `
      MATCH (current:Event {id: $eventId})

      // Read backwards via NEXT relationships
      MATCH path = (e:Event)-[:NEXT*0..${eventLimit}]->(current)
      WHERE e.organization_id = current.organization_id
        AND e.project_id = current.project_id

      WITH DISTINCT e
      ORDER BY e.timestamp DESC
      LIMIT $limit

      RETURN e
      `,
      {
        eventId: cursorId, // cursorId is actually the event ID
        limit: neo4j.int(eventLimit),
      }
    );

    let events: Event[] = result.map((r: any) => ({
      ...r.e.properties,
      timestamp: new Date(r.e.properties.timestamp),
    }));

    // Apply additional filters if provided
    if (categories) {
      const categoryList = categories.split(',').map(c => c.trim());
      events = events.filter(e => categoryList.includes(e.category));
    }

    if (branch) {
      events = events.filter(e => e.branch === branch);
    }

    // Get cursor info (if cursor ID matches event ID)
    const cursorResult = await runQuery<any>(
      `MATCH (cursor:SessionCursor {current_event_id: $eventId}) RETURN cursor LIMIT 1`,
      { eventId: cursorId }
    );

    const cursor = cursorResult.length > 0 ? cursorResult[0].cursor.properties : null;

    return NextResponse.json({
      events,
      cursor,
      totalCount: events.length,
      appliedFilters: {
        categories: categories || null,
        branch: branch || null,
      },
    });
  } catch (error: any) {
    console.error('[Events Read API] Error:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Cursor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to read events',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
// Force rebuild: New Neo4j Aura instance (b475ee2d) - Sun Nov 17 14:40:00 EST 2025
