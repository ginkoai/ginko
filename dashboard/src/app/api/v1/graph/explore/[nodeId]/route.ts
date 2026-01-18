/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, graph, explore, document, relationships, EPIC-011, adhoc_260117_s01]
 * @related: [../../_neo4j.ts, ../hierarchy/route.ts, ../../adjacencies/[nodeId]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/graph/explore/[nodeId]
 *
 * Explore a document/node and its connections.
 * Combines node properties, relationships, and hierarchy info.
 *
 * Query Parameters:
 * - graphId: Graph namespace (required)
 * - depth: Relationship traversal depth (default: 1, max: 3)
 *
 * Returns:
 * - document: Node properties (id, type, title, summary, tags, etc.)
 * - relationships: Connected nodes (implements, referencedBy, similarTo, etc.)
 * - hierarchy: Parent/children for Epic/Sprint/Task nodes
 * - totalConnections: Count of all relationships
 * - connectionsByType: Breakdown by relationship type
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, runQuery } from '../../_neo4j';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';

interface DocumentInfo {
  id: string;
  type: string;
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  filePath: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface RelatedNode {
  id: string;
  type: string;
  title: string;
  similarity: number | null;
}

interface HierarchyInfo {
  parent?: {
    id: string;
    type: string;
    title: string;
  };
  children: Array<{
    id: string;
    type: string;
    title: string;
    status?: string;
  }>;
}

interface ExploreResponse {
  document: DocumentInfo;
  relationships: {
    implements?: RelatedNode[];
    referencedBy?: RelatedNode[];
    similarTo?: RelatedNode[];
    appliedPatterns?: RelatedNode[];
  };
  hierarchy?: HierarchyInfo;
  totalConnections: number;
  connectionsByType: Record<string, number>;
}

/**
 * Detect node type from label or ID
 */
function detectNodeType(label: string, nodeId: string): string {
  if (label) return label;
  if (nodeId.match(/^EPIC-\d+$/i)) return 'Epic';
  if (nodeId.match(/^e\d{3}_s\d{2}$/i)) return 'Sprint';
  if (nodeId.match(/^e\d{3}_s\d{2}_t\d{2}$/i)) return 'Task';
  if (nodeId.match(/^ADR-\d+$/i)) return 'ADR';
  if (nodeId.match(/^PRD-\d+$/i)) return 'PRD';
  return 'Unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId: rawNodeId } = await params;
  const nodeId = decodeURIComponent(rawNodeId);
  console.log('[Explore API] GET /api/v1/graph/explore/', nodeId);

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
    const depth = Math.min(parseInt(searchParams.get('depth') || '1', 10), 3);

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

    // Verify user has access to this graph (ADR-060: Data Isolation)
    const access = await verifyGraphAccessFromRequest(request, graphId, 'read');
    if (!access.hasAccess) {
      console.log(`[Explore API] Access denied for graphId: ${graphId}, error: ${access.error}`);
      return NextResponse.json(
        {
          error: {
            code: access.error === 'Graph not found' ? 'GRAPH_NOT_FOUND' : 'ACCESS_DENIED',
            message: access.error || 'You do not have access to this graph',
          },
        },
        { status: access.error === 'Graph not found' ? 404 : 403 }
      );
    }

    // Query the main node
    const nodeQuery = `
      MATCH (n {graph_id: $graphId})
      WHERE n.id = $nodeId OR n.node_id = $nodeId
      RETURN n,
             labels(n)[0] as label
      LIMIT 1
    `;

    const nodeResults = await runQuery<{ n: any; label: string }>(nodeQuery, { graphId, nodeId });

    if (nodeResults.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Node "${nodeId}" not found in graph`,
          },
        },
        { status: 404 }
      );
    }

    const node = nodeResults[0].n.properties;
    const label = nodeResults[0].label;
    const nodeType = detectNodeType(label, nodeId);

    // Build document info
    const document: DocumentInfo = {
      id: node.id || node.node_id || nodeId,
      type: nodeType,
      title: node.title || node.name || nodeId,
      summary: node.summary || node.description || '',
      content: node.content,
      tags: node.tags || [],
      filePath: node.file_path || node.filePath || '',
      metadata: node.metadata,
      createdAt: node.created_at || node.createdAt || new Date().toISOString(),
      updatedAt: node.updated_at || node.updatedAt || new Date().toISOString(),
    };

    // Query relationships
    const relationshipsQuery = `
      MATCH (n {graph_id: $graphId})
      WHERE n.id = $nodeId OR n.node_id = $nodeId
      OPTIONAL MATCH (n)-[r]->(target {graph_id: $graphId})
      RETURN type(r) as relType,
             'outgoing' as direction,
             target.id as targetId,
             labels(target)[0] as targetLabel,
             target.title as targetTitle
      UNION ALL
      MATCH (n {graph_id: $graphId})
      WHERE n.id = $nodeId OR n.node_id = $nodeId
      OPTIONAL MATCH (n)<-[r]-(source {graph_id: $graphId})
      RETURN type(r) as relType,
             'incoming' as direction,
             source.id as targetId,
             labels(source)[0] as targetLabel,
             source.title as targetTitle
    `;

    const relResults = await runQuery<{
      relType: string;
      direction: string;
      targetId: string;
      targetLabel: string;
      targetTitle: string;
    }>(relationshipsQuery, { graphId, nodeId });

    // Organize relationships
    const relationships: ExploreResponse['relationships'] = {
      implements: [],
      referencedBy: [],
      similarTo: [],
      appliedPatterns: [],
    };
    const connectionsByType: Record<string, number> = {};

    for (const rel of relResults) {
      if (!rel.relType || !rel.targetId) continue;

      connectionsByType[rel.relType] = (connectionsByType[rel.relType] || 0) + 1;

      const relatedNode: RelatedNode = {
        id: rel.targetId,
        type: rel.targetLabel || 'Unknown',
        title: rel.targetTitle || rel.targetId,
        similarity: null,
      };

      // Categorize relationships
      if (rel.relType === 'IMPLEMENTS') {
        relationships.implements!.push(relatedNode);
      } else if (rel.relType === 'REFERENCES' && rel.direction === 'incoming') {
        relationships.referencedBy!.push(relatedNode);
      } else if (rel.relType === 'SIMILAR_TO') {
        relationships.similarTo!.push(relatedNode);
      } else if (rel.relType === 'APPLIES_PATTERN') {
        relationships.appliedPatterns!.push(relatedNode);
      }
    }

    const totalConnections = Object.values(connectionsByType).reduce((a, b) => a + b, 0);

    // Add hierarchy info for Epic/Sprint/Task nodes
    let hierarchy: HierarchyInfo | undefined;

    if (nodeType === 'Epic' || nodeType === 'Sprint' || nodeType === 'Task') {
      hierarchy = { children: [] };

      // Query children
      if (nodeType === 'Epic') {
        // Handle both EPIC-009 and EPIC-9 formats for epic_id matching
        // Epic nodes use EPIC-009 format, but sprint epic_id uses EPIC-9 format
        const epicNum = nodeId.match(/EPIC-0*(\d+)/i)?.[1] || nodeId;
        const epicIdVariants = [`EPIC-${epicNum}`, nodeId]; // e.g., ['EPIC-9', 'EPIC-009']

        const childrenQuery = `
          MATCH (s:Sprint {graph_id: $graphId})
          WHERE s.epic_id IN $epicIdVariants
          RETURN s.id as id, 'Sprint' as type, s.title as title, s.status as status
          ORDER BY s.id
          LIMIT 50
        `;
        const children = await runQuery<{ id: string; type: string; title: string; status: string }>(
          childrenQuery,
          { graphId, epicIdVariants }
        );
        hierarchy.children = children;
      } else if (nodeType === 'Sprint') {
        const childrenQuery = `
          MATCH (t:Task {graph_id: $graphId})
          WHERE t.sprint_id = $nodeId
          RETURN t.id as id, 'Task' as type, t.title as title, t.status as status
          ORDER BY t.id
          LIMIT 100
        `;
        const children = await runQuery<{ id: string; type: string; title: string; status: string }>(
          childrenQuery,
          { graphId, nodeId }
        );
        hierarchy.children = children;
      }

      // Query parent
      if (nodeType === 'Sprint') {
        const epicId = node.epic_id;
        if (epicId) {
          const parentQuery = `
            MATCH (e:Epic {graph_id: $graphId})
            WHERE e.id = $epicId OR e.node_id = $epicId
            RETURN e.id as id, 'Epic' as type, e.title as title
            LIMIT 1
          `;
          const parents = await runQuery<{ id: string; type: string; title: string }>(
            parentQuery,
            { graphId, epicId }
          );
          if (parents.length > 0) {
            hierarchy.parent = parents[0];
          }
        }
      } else if (nodeType === 'Task') {
        const sprintId = node.sprint_id;
        if (sprintId) {
          const parentQuery = `
            MATCH (s:Sprint {graph_id: $graphId})
            WHERE s.id = $sprintId OR s.node_id = $sprintId
            RETURN s.id as id, 'Sprint' as type, s.title as title
            LIMIT 1
          `;
          const parents = await runQuery<{ id: string; type: string; title: string }>(
            parentQuery,
            { graphId, sprintId }
          );
          if (parents.length > 0) {
            hierarchy.parent = parents[0];
          }
        }
      }
    }

    const response: ExploreResponse = {
      document,
      relationships,
      totalConnections,
      connectionsByType,
    };

    if (hierarchy) {
      response.hierarchy = hierarchy;
    }

    console.log(`[Explore API] Found: ${document.type} "${document.title}" with ${totalConnections} connections`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Explore API] Error:', error);
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
