/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [sprint, graph-query, epic-001, task-2, performance]
 * @related: [_cloud-graph-client.ts, sync/route.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/sprint/active
 *
 * Get current active sprint with tasks (TASK-2)
 *
 * Performance requirement: <200ms response time
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required via header or query)
 *
 * Returns:
 * - sprint: Active sprint node data
 * - tasks: Array of task nodes
 * - nextTask: Next incomplete task (from NEXT_TASK relationship)
 * - stats: Sprint statistics (total tasks, completed, in progress)
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';

interface SprintData {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  effort: string;
  priority: string;
  files: string[];
  relatedADRs: string[];
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  progressPercentage: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

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

    // Get graphId from query params or header
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId') || request.headers.get('x-graph-id');

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Create graph client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Query for active sprint (most recent)
    // Performance optimization: Single query with all relationships
    const result = await client.runScopedQuery<any>(`
      // Get most recent sprint
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
      WITH s
      ORDER BY s.createdAt DESC
      LIMIT 1

      // Get all tasks for this sprint
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)

      // Get next task
      OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)

      // Return sprint with all data
      RETURN s as sprint,
             collect(DISTINCT t) as tasks,
             next as nextTask
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No active sprint found' },
        { status: 404 }
      );
    }

    const record = result[0];

    // Extract properties from Neo4j node objects
    // Neo4j driver returns nodes wrapped: { properties: { ... } }
    const extractProps = <T>(node: any): T | null => {
      if (!node) return null;
      // Handle both raw Neo4j format (with properties) and clean format
      return (node.properties || node) as T;
    };

    const sprint: SprintData = extractProps<SprintData>(record.sprint)!;
    const tasks: TaskData[] = record.tasks
      .filter((t: any) => t !== null)
      .map((t: any) => extractProps<TaskData>(t)!);
    const nextTask: TaskData | null = extractProps<TaskData>(record.nextTask);

    // Calculate stats
    const stats: SprintStats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'complete').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      notStartedTasks: tasks.filter(t => t.status === 'not_started').length,
      progressPercentage: tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'complete').length / tasks.length) * 100)
        : 0,
    };

    const executionTime = Date.now() - startTime;

    // Log performance warning if over threshold
    if (executionTime > 200) {
      console.warn(`[Sprint Active] Query took ${executionTime}ms (target: <200ms)`);
    }

    return NextResponse.json({
      sprint,
      tasks,
      nextTask,
      stats,
      meta: {
        executionTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Sprint Active] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
