/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [events, adr-043, team-collaboration, context-loading]
 * @related: [_cloud-graph-client.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events/team
 *
 * Load team high-signal events (ADR-043 Phase 3)
 *
 * Query Parameters:
 * - projectId: Project ID for multi-tenant filtering
 * - excludeUserId: User ID to exclude (current user)
 * - limit: Number of events to load (default: 20)
 * - days: Load events from last N days (default: 7)
 * - categories: Filter by categories (default: decision,achievement,git)
 *
 * Returns:
 * - events: Array of high-signal team events (excludes current user)
 * - totalCount: Number of events returned
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '../../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface TeamEvent {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: Date;
  category: string;
  description: string;
  files: string[];
  impact: string;
  branch?: string;
  tags?: string[];
  shared: boolean;
  commit_hash?: string;
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
    const projectId = searchParams.get('projectId');
    const excludeUserId = searchParams.get('excludeUserId');
    const limit = searchParams.get('limit') || '20';
    const days = searchParams.get('days') || '7';
    const categories = searchParams.get('categories') || 'decision,achievement,git';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    if (!excludeUserId) {
      return NextResponse.json(
        { error: 'Missing required parameter: excludeUserId' },
        { status: 400 }
      );
    }

    const eventLimit = parseInt(limit, 10);
    if (isNaN(eventLimit) || eventLimit < 1 || eventLimit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit (must be 1-100)' },
        { status: 400 }
      );
    }

    const daysBack = parseInt(days, 10);
    if (isNaN(daysBack) || daysBack < 1 || daysBack > 90) {
      return NextResponse.json(
        { error: 'Invalid days (must be 1-90)' },
        { status: 400 }
      );
    }

    // Parse categories filter
    const categoryList = categories.split(',').map(c => c.trim());

    // Calculate timestamp threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysBack);

    // Query team high-signal events
    const result = await runQuery<any>(
      `
      MATCH (e:Event)
      WHERE e.project_id = $projectId
        AND e.user_id <> $excludeUserId
        AND e.shared = true
        AND e.category IN $categories
        AND e.timestamp >= datetime($threshold)

      RETURN e
      ORDER BY e.timestamp DESC, e.impact DESC
      LIMIT $limit
      `,
      {
        projectId,
        excludeUserId,
        categories: categoryList,
        threshold: thresholdDate.toISOString(),
        limit: neo4j.int(eventLimit),
      }
    );

    const events: TeamEvent[] = result.map((r: any) => ({
      ...r.e.properties,
      timestamp: new Date(r.e.properties.timestamp),
    }));

    return NextResponse.json({
      events,
      totalCount: events.length,
      appliedFilters: {
        categories: categoryList,
        days: daysBack,
        excludeUserId,
      },
    });
  } catch (error: any) {
    console.error('[Team Events API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load team events',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
