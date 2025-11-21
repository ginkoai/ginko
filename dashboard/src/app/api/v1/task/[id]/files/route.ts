/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [task, files, graph-query, epic-001, task-3]
 * @related: [../../../sprint/sync/route.ts, _cloud-graph-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/[id]/files
 *
 * Query files modified by a specific task (TASK-3)
 *
 * Returns files connected via (Task)-[:MODIFIES]->(File) relationship
 * with optional frontmatter metadata from ADR-002
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (optional, can use default)
 *
 * Returns:
 * - taskId: The task ID queried
 * - files: Array of file objects with path and metadata
 * - count: Number of files
 *
 * Example Response:
 * {
 *   "taskId": "task_3_1732216800000",
 *   "files": [
 *     {
 *       "path": "packages/cli/src/lib/sprint-parser.ts",
 *       "status": "current",
 *       "metadata": {
 *         "tags": ["sprint", "parser"],
 *         "complexity": "medium"
 *       }
 *     }
 *   ],
 *   "count": 1
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../../graph/_cloud-graph-client';

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

    const token = authHeader.substring(7);

    // Get graphId from query params or use default
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    const taskId = params.id;

    // Create graph client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Query for files modified by this task
    const files = await queryTaskFiles(client, taskId);

    return NextResponse.json({
      taskId,
      files,
      count: files.length,
    });

  } catch (error) {
    console.error('[Task Files Query] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Query files modified by a task
 *
 * Executes Cypher query:
 * MATCH (t:Task {id: $taskId})-[:MODIFIES]->(f:File)
 * OPTIONAL MATCH (f)-[:HAS_FRONTMATTER]->(m:Metadata)
 * RETURN f.path, f.status, m.tags, m.complexity
 *
 * @param client - CloudGraphClient instance
 * @param taskId - Task ID to query
 * @returns Array of file objects
 */
async function queryTaskFiles(
  client: CloudGraphClient,
  taskId: string
): Promise<Array<{
  path: string;
  status: string;
  metadata?: {
    tags?: string[];
    complexity?: string;
  };
}>> {
  // Build Cypher query
  const query = `
    MATCH (t:Task {id: $taskId})-[:MODIFIES]->(f:File)
    OPTIONAL MATCH (f)-[:HAS_FRONTMATTER]->(m:Metadata)
    RETURN f.path as path, f.status as status, m.tags as tags, m.complexity as complexity
    ORDER BY f.path
  `;

  try {
    // Execute query via CloudGraphClient
    const result = await client.runScopedQuery(query, { taskId });

    // Transform results
    const files = result.map((record: any) => ({
      path: record.path,
      status: record.status || 'current',
      ...(record.tags || record.complexity ? {
        metadata: {
          ...(record.tags ? { tags: record.tags } : {}),
          ...(record.complexity ? { complexity: record.complexity } : {}),
        }
      } : {})
    }));

    return files;
  } catch (error) {
    console.error('[Task Files Query] Query execution failed:', error);
    throw error;
  }
}
