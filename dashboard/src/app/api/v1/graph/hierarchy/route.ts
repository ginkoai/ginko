/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-14
 * @tags: [api, graph, hierarchy, epic, sprint, task, EPIC-011]
 * @related: [../nodes/route.ts, ../_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/graph/hierarchy
 *
 * Query hierarchy relationships for Epic → Sprint → Task navigation (EPIC-011).
 * Uses epic_id and sprint_id properties for efficient property-based lookups.
 *
 * Query Parameters:
 * - graphId: Graph namespace (required)
 * - nodeId: The node ID to query (required) - e.g., "EPIC-009", "e009_s01", "e009_s01_t01"
 * - direction: "children" | "parent" | "both" (default: "both")
 *
 * Returns:
 * - node: The queried node with basic properties
 * - children: Array of child nodes (sprints for epic, tasks for sprint)
 * - parent: Parent node (epic for sprint, sprint for task)
 *
 * Examples:
 * - GET /api/v1/graph/hierarchy?graphId=X&nodeId=EPIC-009
 *   Returns EPIC-009 with its child sprints
 *
 * - GET /api/v1/graph/hierarchy?graphId=X&nodeId=e009_s01
 *   Returns sprint with parent epic and child tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, runQuery } from '../_neo4j';

type NodeType = 'Epic' | 'Sprint' | 'Task' | 'Unknown';

interface HierarchyNode {
  id: string;
  label: string;
  title?: string;
  status?: string;
  epic_id?: string;
  sprint_id?: string;
}

interface HierarchyResponse {
  node: HierarchyNode | null;
  children: HierarchyNode[];
  parent: HierarchyNode | null;
  nodeType: NodeType;
}

/**
 * Determine node type from ID pattern
 * - EPIC-NNN → Epic
 * - eNNN_sNN → Sprint
 * - eNNN_sNN_tNN → Task
 */
function detectNodeType(nodeId: string): NodeType {
  if (nodeId.match(/^EPIC-\d+$/i)) return 'Epic';
  if (nodeId.match(/^e\d{3}_s\d{2}$/i)) return 'Sprint';
  if (nodeId.match(/^e\d{3}_s\d{2}_t\d{2}$/i)) return 'Task';
  // Also handle adhoc patterns
  if (nodeId.match(/^adhoc_\d{6}_s\d{2}$/i)) return 'Sprint';
  if (nodeId.match(/^adhoc_\d{6}_s\d{2}_t\d{2}$/i)) return 'Task';
  return 'Unknown';
}

/**
 * Extract epic ID from sprint/task ID
 * e009_s01 → EPIC-9
 * e009_s01_t01 → EPIC-9
 */
function extractEpicId(nodeId: string): string | null {
  const match = nodeId.match(/^e(\d{3})_s\d{2}/i);
  if (match) {
    const epicNum = parseInt(match[1], 10);
    return `EPIC-${epicNum}`;
  }
  return null;
}

/**
 * Extract sprint ID from task ID
 * e009_s01_t01 → e009_s01
 */
function extractSprintId(taskId: string): string | null {
  const match = taskId.match(/^(e\d{3}_s\d{2})_t\d{2}/i);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  console.log('[Hierarchy API] GET /api/v1/graph/hierarchy called');

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
    const nodeId = searchParams.get('nodeId');
    const direction = searchParams.get('direction') || 'both';

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

    if (!nodeId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_NODE_ID',
            message: 'nodeId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    const nodeType = detectNodeType(nodeId);
    const response: HierarchyResponse = {
      node: null,
      children: [],
      parent: null,
      nodeType,
    };

    // Query the main node
    const nodeQuery = `
      MATCH (n {graph_id: $graphId})
      WHERE n.id = $nodeId OR n.node_id = $nodeId
      RETURN n.id as id,
             labels(n)[0] as label,
             n.title as title,
             n.status as status,
             n.epic_id as epic_id,
             n.sprint_id as sprint_id
      LIMIT 1
    `;

    const nodeResults = await runQuery<{
      id: string;
      label: string;
      title: string;
      status: string;
      epic_id: string;
      sprint_id: string;
    }>(nodeQuery, { graphId, nodeId });

    if (nodeResults.length > 0) {
      response.node = nodeResults[0];
    }

    // Query children based on node type
    if (direction === 'children' || direction === 'both') {
      let childrenQuery = '';
      let childParams: Record<string, any> = { graphId, nodeId };

      if (nodeType === 'Epic') {
        // Handle both EPIC-009 and EPIC-9 formats for epic_id matching
        // Epic nodes use EPIC-009 format, but sprint epic_id uses EPIC-9 format
        const epicNum = nodeId.match(/EPIC-0*(\d+)/i)?.[1] || nodeId;
        const epicIdVariants = [`EPIC-${epicNum}`, nodeId];
        childParams = { graphId, epicIdVariants };

        // Epic → Sprints (find sprints with matching epic_id)
        childrenQuery = `
          MATCH (s:Sprint {graph_id: $graphId})
          WHERE s.epic_id IN $epicIdVariants
          RETURN s.id as id,
                 'Sprint' as label,
                 s.title as title,
                 s.status as status,
                 s.epic_id as epic_id
          ORDER BY s.id
          LIMIT 50
        `;
      } else if (nodeType === 'Sprint') {
        // Sprint → Tasks (find tasks with matching sprint_id)
        childrenQuery = `
          MATCH (t:Task {graph_id: $graphId})
          WHERE t.sprint_id = $nodeId
          RETURN t.id as id,
                 'Task' as label,
                 t.title as title,
                 t.status as status,
                 t.sprint_id as sprint_id,
                 t.epic_id as epic_id
          ORDER BY t.id
          LIMIT 100
        `;
      }

      if (childrenQuery) {
        const childResults = await runQuery<HierarchyNode>(childrenQuery, childParams);
        response.children = childResults;
      }
    }

    // Query parent based on node type
    if (direction === 'parent' || direction === 'both') {
      let parentQuery = '';
      let parentId: string | null = null;

      if (nodeType === 'Sprint') {
        // Sprint → Epic (use epic_id property or extract from ID)
        parentId = response.node?.epic_id || extractEpicId(nodeId);
        if (parentId) {
          parentQuery = `
            MATCH (e:Epic {graph_id: $graphId})
            WHERE e.id = $parentId OR e.node_id = $parentId
            RETURN e.id as id,
                   'Epic' as label,
                   e.title as title,
                   e.status as status
            LIMIT 1
          `;
        }
      } else if (nodeType === 'Task') {
        // Task → Sprint (use sprint_id property or extract from ID)
        parentId = response.node?.sprint_id || extractSprintId(nodeId);
        if (parentId) {
          parentQuery = `
            MATCH (s:Sprint {graph_id: $graphId})
            WHERE s.id = $parentId OR s.node_id = $parentId
            RETURN s.id as id,
                   'Sprint' as label,
                   s.title as title,
                   s.status as status,
                   s.epic_id as epic_id
            LIMIT 1
          `;
        }
      }

      if (parentQuery && parentId) {
        const parentResults = await runQuery<HierarchyNode>(parentQuery, { graphId, parentId });
        if (parentResults.length > 0) {
          response.parent = parentResults[0];
        }
      }
    }

    console.log(`[Hierarchy API] Found: node=${response.node?.id}, children=${response.children.length}, parent=${response.parent?.id}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Hierarchy API] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
