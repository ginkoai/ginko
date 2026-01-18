/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, graph, roadmap, epic, ADR-056, now-next-later, adhoc_260117_s01]
 * @related: [../nodes/route.ts, ../../migrations/009-epic-roadmap/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/graph/roadmap
 *
 * Query roadmap view over Epic nodes (ADR-056 - Now/Next/Later Model).
 * Returns Epics organized by priority lane for roadmap visualization.
 *
 * Query Parameters:
 * - graphId: Graph namespace (required)
 * - all: Include Later, Done, and Dropped items (default: false, shows only Now+Next)
 * - lane: Filter by specific lane (now, next, later, done, dropped)
 * - status: Filter by roadmap_status (not_started, in_progress, completed, cancelled)
 * - visible: Filter by roadmap_visible (default: true for public views)
 *
 * Lanes:
 * - now: Fully planned, committed, ready for implementation
 * - next: Committed but may need additional planning
 * - later: Proposed but not yet committed (has decision factors)
 * - done: Completed work (hidden by default)
 * - dropped: Cancelled/abandoned work (hidden by default)
 *
 * Returns:
 * - epics: Array of Epic nodes with roadmap properties
 * - lanes: Grouped by lane (Now, Next, and optionally Later/Done/Dropped)
 * - summary: Counts by lane and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, runQuery } from '../_neo4j';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';

type RoadmapLane = 'now' | 'next' | 'later' | 'done' | 'dropped';
type RoadmapStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

interface EpicRoadmapItem {
  id: string;
  title: string;
  description?: string;
  roadmap_lane: RoadmapLane;
  roadmap_status: RoadmapStatus;
  priority?: number;
  decision_factors?: string[];
  roadmap_visible: boolean;
  tags?: string[];
}

interface LaneGroup {
  lane: RoadmapLane;
  label: string;
  epics: EpicRoadmapItem[];
}

interface RoadmapResponse {
  epics: EpicRoadmapItem[];
  lanes: LaneGroup[];
  summary: {
    total: number;
    byLane: Record<RoadmapLane, number>;
    byStatus: Record<string, number>;
  };
}

const LANE_LABELS: Record<RoadmapLane, string> = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
  done: 'Done',
  dropped: 'Dropped',
};

export async function GET(request: NextRequest) {
  console.log('[Roadmap API] GET /api/v1/graph/roadmap called');

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const includeAll = searchParams.get('all') === 'true';
    const laneFilter = searchParams.get('lane') as RoadmapLane | null;
    const statusFilter = searchParams.get('status');
    const visibleOnly = searchParams.get('visible') !== 'false';

    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'graphId is required',
          },
        },
        { status: 400 }
      );
    }

    // Verify user has access to this graph (ADR-060: Data Isolation)
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      console.log(`[Roadmap API] Access denied for graphId: ${graphId}`);
      console.log(`[Roadmap API] Access check result:`, JSON.stringify({
        error: access.error,
        userId: access.userId,
        graphOwnerId: access.graphOwnerId,
        teamId: access.teamId,
      }));
      return NextResponse.json(
        {
          error: {
            code: access.error === 'Graph not found' ? 'GRAPH_NOT_FOUND' : 'ACCESS_DENIED',
            message: access.error || 'You do not have access to this graph',
            // Include debug info in development
            ...(process.env.NODE_ENV !== 'production' && {
              debug: {
                userId: access.userId,
                graphOwnerId: access.graphOwnerId,
                requestedGraphId: graphId,
              }
            }),
          },
        },
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }

    // Build the Cypher query
    // Note: Epic nodes use graphId (camelCase), not graph_id (snake_case)
    let whereClause = 'WHERE (e.graphId = $graphId OR e.graph_id = $graphId)';

    // Filter by lane
    if (laneFilter) {
      whereClause += ' AND e.roadmap_lane = $laneFilter';
    } else if (!includeAll) {
      // Default: show Now and Next only (committed work)
      whereClause += " AND e.roadmap_lane IN ['now', 'next']";
    }

    // Filter by roadmap_status if specified
    if (statusFilter) {
      whereClause += ' AND e.roadmap_status = $statusFilter';
    }

    // Filter by visibility
    if (visibleOnly) {
      whereClause += ' AND (e.roadmap_visible IS NULL OR e.roadmap_visible = true)';
    }

    const query = `
      MATCH (e:Epic)
      ${whereClause}
      RETURN e.id as id,
             e.title as title,
             e.description as description,
             e.roadmap_lane as roadmap_lane,
             e.roadmap_status as roadmap_status,
             e.priority as priority,
             e.decision_factors as decision_factors,
             e.roadmap_visible as roadmap_visible,
             e.tags as tags
      ORDER BY
        CASE e.roadmap_lane
          WHEN 'now' THEN 0
          WHEN 'next' THEN 1
          WHEN 'later' THEN 2
          WHEN 'done' THEN 3
          WHEN 'dropped' THEN 4
          ELSE 5
        END,
        e.priority,
        e.id
    `;

    const results = await runQuery(query, { graphId, laneFilter, statusFilter });

    // Transform results into EpicRoadmapItems
    // Handle legacy data: convert commitment_status to roadmap_lane if needed
    const epics: EpicRoadmapItem[] = results.map(r => {
      // Convert legacy commitment_status to roadmap_lane
      let lane: RoadmapLane = r.roadmap_lane || 'later';
      if (!r.roadmap_lane && r.commitment_status) {
        lane = r.commitment_status === 'committed' ? 'next' : 'later';
      }

      return {
        id: r.id,
        title: r.title || 'Untitled Epic',
        description: r.description,
        roadmap_lane: lane,
        roadmap_status: r.roadmap_status || 'not_started',
        priority: r.priority,
        decision_factors: r.decision_factors || (lane === 'later' ? ['planning'] : undefined),
        roadmap_visible: r.roadmap_visible !== false,
        tags: r.tags || [],
      };
    });

    // Group by lane
    const laneMap = new Map<RoadmapLane, EpicRoadmapItem[]>();
    laneMap.set('now', []);
    laneMap.set('next', []);
    laneMap.set('later', []);
    laneMap.set('done', []);
    laneMap.set('dropped', []);

    for (const epic of epics) {
      const laneEpics = laneMap.get(epic.roadmap_lane);
      if (laneEpics) {
        laneEpics.push(epic);
      } else {
        // Handle unknown lanes by defaulting to later
        laneMap.get('later')!.push(epic);
      }
    }

    // Build lanes array - filter based on includeAll flag
    const allLanes: RoadmapLane[] = ['now', 'next', 'later', 'done', 'dropped'];
    const activeLanes: RoadmapLane[] = ['now', 'next'];
    const lanesToShow = includeAll ? allLanes : activeLanes;

    const lanes: LaneGroup[] = lanesToShow
      .filter(lane => laneMap.get(lane)!.length > 0 || (includeAll && activeLanes.includes(lane)))
      .map(lane => ({
        lane,
        label: LANE_LABELS[lane],
        epics: laneMap.get(lane)!,
      }));

    // Calculate summary stats (always include all lanes for footer message)
    const byLane: Record<RoadmapLane, number> = {
      now: laneMap.get('now')!.length,
      next: laneMap.get('next')!.length,
      later: laneMap.get('later')!.length,
      done: laneMap.get('done')!.length,
      dropped: laneMap.get('dropped')!.length,
    };

    const byStatus: Record<string, number> = {};
    for (const epic of epics) {
      const status = epic.roadmap_status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    const response: RoadmapResponse = {
      epics,
      lanes,
      summary: {
        total: epics.length,
        byLane,
        byStatus,
      },
    };

    console.log(`[Roadmap API] Returning ${epics.length} epics in ${lanes.length} lanes`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Roadmap API] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
