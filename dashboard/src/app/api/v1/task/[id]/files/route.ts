/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [task, files, graph-query, epic-001, task-3, frontmatter, adr-002]
 * @related: [../../../sprint/sync/route.ts, _cloud-graph-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, fs/promises, path]
 */

/**
 * GET /api/v1/task/[id]/files
 *
 * Query files modified by a specific task (TASK-3)
 *
 * Returns files connected via (Task)-[:MODIFIES]->(File) relationship
 * with ADR-002 frontmatter metadata read from filesystem
 *
 * Design: Graph stores relationships only, filesystem is source of truth for metadata
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required)
 *
 * Returns:
 * - taskId: The task ID queried
 * - files: Array of file objects with path, exists flag, and frontmatter metadata
 * - count: Number of files
 *
 * Example Response:
 * {
 *   "taskId": "task_3_1732216800000",
 *   "files": [
 *     {
 *       "path": "packages/cli/src/lib/sprint-parser.ts",
 *       "exists": true,
 *       "metadata": {
 *         "fileType": "utility",
 *         "status": "current",
 *         "tags": ["sprint", "parser"],
 *         "complexity": "medium",
 *         "priority": "high",
 *         "dependencies": ["gray-matter"]
 *       }
 *     }
 *   ],
 *   "count": 1
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../../graph/_cloud-graph-client';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Frontmatter metadata structure (ADR-002)
 */
interface FileFrontmatter {
  fileType?: string;
  status?: string;
  updated?: string;
  tags?: string[];
  related?: string[];
  priority?: string;
  complexity?: string;
  dependencies?: string[];
}

/**
 * Enhanced file response with filesystem metadata
 */
interface FileWithMetadata {
  path: string;
  exists: boolean;
  metadata: FileFrontmatter | null;
}

/**
 * Read ADR-002 frontmatter from filesystem
 *
 * Reads first 12 lines and parses @key: value patterns
 *
 * @param filePath - Relative path from project root
 * @returns Parsed frontmatter or null if not found/error
 */
async function readFrontmatter(filePath: string): Promise<FileFrontmatter | null> {
  try {
    // Resolve to absolute path from project root
    // Dashboard is in /dashboard, project root is parent
    const projectRoot = join(process.cwd(), '..');
    const absolutePath = join(projectRoot, filePath);

    // Read first 12 lines (ADR-002 standard)
    const content = await readFile(absolutePath, 'utf-8');
    const lines = content.split('\n').slice(0, 12);

    const metadata: FileFrontmatter = {};

    for (const line of lines) {
      // Parse @key: value patterns
      const match = line.match(/@(\w+):\s*(.+)/);
      if (!match) continue;

      const [, key, value] = match;
      const trimmedValue = value.trim();

      // Parse arrays: [item1, item2, item3]
      if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        const arrayValue = trimmedValue
          .slice(1, -1)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);

        metadata[key as keyof FileFrontmatter] = arrayValue as any;
      } else {
        // Store as string
        metadata[key as keyof FileFrontmatter] = trimmedValue as any;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;

  } catch (error) {
    // File not found or read error - return null
    console.warn(`[Frontmatter] Could not read ${filePath}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

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
    const filePaths = await queryTaskFiles(client, taskId);

    // Enrich with filesystem frontmatter
    const filesWithMetadata = await Promise.all(
      filePaths.map(async (filePath) => {
        const metadata = await readFrontmatter(filePath);
        return {
          path: filePath,
          exists: metadata !== null,
          metadata,
        } as FileWithMetadata;
      })
    );

    return NextResponse.json({
      taskId,
      files: filesWithMetadata,
      count: filesWithMetadata.length,
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
 * RETURN f.path
 *
 * Returns only file paths - metadata is read from filesystem via ADR-002
 *
 * @param client - CloudGraphClient instance
 * @param taskId - Task ID to query
 * @returns Array of file paths
 */
async function queryTaskFiles(
  client: CloudGraphClient,
  taskId: string
): Promise<string[]> {
  // Build Cypher query - only paths, no metadata
  const query = `
    MATCH (t:Task {id: $taskId})-[:MODIFIES]->(f:File)
    RETURN f.path as path
    ORDER BY f.path
  `;

  try {
    // Execute query via CloudGraphClient
    const result = await client.runScopedQuery(query, { taskId });

    // Extract file paths
    const filePaths = result.map((record: any) => record.path);

    return filePaths;
  } catch (error) {
    console.error('[Task Files Query] Query execution failed:', error);
    throw error;
  }
}
