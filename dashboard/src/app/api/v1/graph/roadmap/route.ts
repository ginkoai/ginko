/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-11
 * @tags: [api, graph, roadmap, epic, ADR-056]
 * @related: [../nodes/route.ts, ../../migrations/009-epic-roadmap/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/graph/roadmap
 *
 * Query roadmap view over Epic nodes (ADR-056).
 * Returns Epics organized by quarter for roadmap visualization.
 *
 * Query Parameters:
 * - graphId: Graph namespace (required)
 * - all: Include uncommitted items (default: false)
 * - status: Filter by roadmap_status (optional: not_started, in_progress, completed, cancelled)
 * - visible: Filter by roadmap_visible (default: true for public views)
 *
 * Returns:
 * - epics: Array of Epic nodes with roadmap properties
 * - quarters: Grouped by quarter for display
 * - summary: Counts by status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, runQuery } from '../_neo4j';

interface EpicRoadmapItem {
  id: string;
  title: string;
  description?: string;
  commitment_status: 'uncommitted' | 'committed';
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  target_start_quarter?: string;
  target_end_quarter?: string;
  roadmap_visible: boolean;
  tags?: string[];
}

interface QuarterGroup {
  quarter: string;
  epics: EpicRoadmapItem[];
}

interface RoadmapResponse {
  epics: EpicRoadmapItem[];
  quarters: QuarterGroup[];
  uncommitted: EpicRoadmapItem[];
  summary: {
    total: number;
    committed: number;
    uncommitted: number;
    byStatus: Record<string, number>;
  };
}

/**
 * Convert Neo4j Integer to JavaScript number
 */
function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return parseInt(value, 10) || 0;
}

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

    // Build the Cypher query
    let whereClause = 'WHERE e.graph_id = $graphId';

    // Filter by commitment status unless --all is specified
    if (!includeAll) {
      whereClause += " AND e.commitment_status = 'committed'";
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
             e.commitment_status as commitment_status,
             e.roadmap_status as roadmap_status,
             e.target_start_quarter as target_start_quarter,
             e.target_end_quarter as target_end_quarter,
             e.roadmap_visible as roadmap_visible,
             e.tags as tags
      ORDER BY e.target_start_quarter, e.id
    `;

    const results = await runQuery(query, { graphId, statusFilter });

    // Transform results into EpicRoadmapItems
    const epics: EpicRoadmapItem[] = results.map(r => ({
      id: r.id,
      title: r.title || 'Untitled Epic',
      description: r.description,
      commitment_status: r.commitment_status || 'uncommitted',
      roadmap_status: r.roadmap_status || 'not_started',
      target_start_quarter: r.target_start_quarter,
      target_end_quarter: r.target_end_quarter,
      roadmap_visible: r.roadmap_visible !== false,
      tags: r.tags || [],
    }));

    // Group by quarter
    const quarterMap = new Map<string, EpicRoadmapItem[]>();
    const uncommitted: EpicRoadmapItem[] = [];

    for (const epic of epics) {
      if (epic.commitment_status === 'uncommitted') {
        uncommitted.push(epic);
      } else if (epic.target_start_quarter) {
        const quarter = epic.target_start_quarter;
        if (!quarterMap.has(quarter)) {
          quarterMap.set(quarter, []);
        }
        quarterMap.get(quarter)!.push(epic);
      } else {
        // Committed but no quarter assigned - put in "Unscheduled"
        if (!quarterMap.has('Unscheduled')) {
          quarterMap.set('Unscheduled', []);
        }
        quarterMap.get('Unscheduled')!.push(epic);
      }
    }

    // Sort quarters chronologically
    const sortedQuarters = Array.from(quarterMap.keys()).sort((a, b) => {
      if (a === 'Unscheduled') return 1;
      if (b === 'Unscheduled') return -1;
      return a.localeCompare(b);
    });

    const quarters: QuarterGroup[] = sortedQuarters.map(q => ({
      quarter: q,
      epics: quarterMap.get(q)!,
    }));

    // Calculate summary stats
    const byStatus: Record<string, number> = {};
    for (const epic of epics) {
      const status = epic.roadmap_status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    const response: RoadmapResponse = {
      epics,
      quarters,
      uncommitted: includeAll ? uncommitted : [],
      summary: {
        total: epics.length,
        committed: epics.filter(e => e.commitment_status === 'committed').length,
        uncommitted: uncommitted.length,
        byStatus,
      },
    };

    console.log(`[Roadmap API] Returning ${epics.length} epics, ${quarters.length} quarters`);
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
