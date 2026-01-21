/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [sprint, graph-query, epic-015, status-api, performance]
 * @related: [_cloud-graph-client.ts, sync/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/sprint/active
 *
 * Get current active sprint with tasks (EPIC-015 Sprint 2)
 *
 * Performance requirement: <200ms response time
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required via header or query)
 *
 * Returns (enhanced response for CLI status command):
 * - sprint: { id, title, epic_id, status, progress: { complete, total, percent } }
 * - tasks: Array of task objects with id, title, status, blocked_reason?, assignee?
 * - next_task: { id, title, continue: boolean } - continue=true if was in_progress
 * - blocked_tasks: Array of blocked tasks with id, title, reason
 * - meta: { executionTime, timestamp }
 *
 * Backward compatible fields (deprecated):
 * - nextTask: Same as next_task for existing clients
 * - stats: Legacy stats object
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';

// ============================================================================
// Type Definitions
// ============================================================================

interface SprintData {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  progress: number;
  status?: string;
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
  blocked_reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EpicData {
  id: string;
  title?: string;
  roadmap_lane?: 'now' | 'next' | 'later' | 'done' | 'dropped';
  roadmap_status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  priority?: number;
}

// Legacy stats interface (backward compatibility)
interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  progressPercentage: number;
}

// Enhanced response types (EPIC-015)
interface SprintProgress {
  complete: number;
  total: number;
  percent: number;
}

interface EnhancedSprint {
  id: string;
  title: string;
  epic_id: string;
  status: string;
  progress: SprintProgress;
}

interface EnhancedTask {
  id: string;
  title: string;
  status: string;
  blocked_reason?: string;
  assignee?: string;
}

interface NextTask {
  id: string;
  title: string;
  continue: boolean;
}

interface BlockedTask {
  id: string;
  title: string;
  reason: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract epic_id from sprint ID using standard naming convention (ADR-052)
 * Pattern: e{NNN}_s{NN} → e{NNN}
 * Examples:
 *   - e015_s02 → e015
 *   - e008_s04 → e008
 *   - adhoc_251209_s01 → adhoc_251209
 */
function extractEpicId(sprintId: string): string {
  // Standard pattern: e{NNN}_s{NN}
  const standardMatch = sprintId.match(/^(e\d{3})_s\d{2}$/);
  if (standardMatch) {
    return standardMatch[1];
  }

  // Ad-hoc pattern: adhoc_{YYMMDD}_s{NN}
  const adhocMatch = sprintId.match(/^(adhoc_\d{6})_s\d{2}$/);
  if (adhocMatch) {
    return adhocMatch[1];
  }

  // Fallback: return sprint ID as-is if no pattern matches
  return sprintId;
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

    // Query for active sprint with priority:
    // Priority order for selecting active sprint:
    // 1. Epic roadmap lane: Now > Next > Later (done/dropped excluded)
    // 2. Sprint completion: incomplete > no tasks > complete
    // 3. Sprint status: active/in_progress > not_started > other
    // 4. Progress (lower first), then newest
    let result = await client.runScopedQuery<any>(`
      // Step 1: Get sprints with their parent epic and task counts
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
      OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      WITH s, e,
           count(t) as totalTasks,
           sum(CASE WHEN t.status = 'complete' THEN 1 ELSE 0 END) as completedTasks

      // Step 2: Calculate progress and apply filters
      WITH s, e, totalTasks, completedTasks,
           CASE WHEN totalTasks > 0 THEN toInteger((completedTasks * 100) / totalTasks) ELSE 0 END as progress
      WHERE (s.status IS NULL OR s.status <> 'complete')
        AND (e IS NULL OR e.roadmap_lane IS NULL OR NOT e.roadmap_lane IN ['done', 'dropped'])

      // Step 3: Order by priority and select top sprint
      WITH s, e, totalTasks, progress
      ORDER BY
        CASE WHEN e.roadmap_lane = 'now' THEN 0 WHEN e.roadmap_lane = 'next' THEN 1 WHEN e.roadmap_lane = 'later' THEN 2 ELSE 3 END,
        CASE WHEN totalTasks > 0 AND progress < 100 THEN 0 WHEN totalTasks = 0 THEN 1 ELSE 2 END,
        CASE WHEN s.status IN ['active', 'in_progress'] THEN 0 WHEN s.status = 'not_started' THEN 1 ELSE 2 END,
        progress ASC,
        s.createdAt DESC
      LIMIT 1

      // Step 4: Load tasks for selected sprint
      WITH s, e
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)

      RETURN s as sprint, collect(DISTINCT t) as tasks, next as nextTask, e as epic
    `);

    // Fallback: If no sprint found (all might be marked 'complete'), get most recent
    if (result.length === 0) {
      result = await client.runScopedQuery<any>(`
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
        OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)
        WITH s, e
        ORDER BY s.createdAt DESC
        LIMIT 1

        OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
        OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)

        RETURN s as sprint,
               collect(DISTINCT t) as tasks,
               next as nextTask,
               e as epic
      `);
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No sprints found in this project' },
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

    const sprintData: SprintData = extractProps<SprintData>(record.sprint)!;
    const rawTasks: TaskData[] = record.tasks
      .filter((t: any) => t !== null)
      .map((t: any) => extractProps<TaskData>(t)!);
    const nextTaskData: TaskData | null = extractProps<TaskData>(record.nextTask);
    const epicData: EpicData | null = extractProps<EpicData>(record.epic);

    // Calculate completion counts
    const completedTasks = rawTasks.filter(t => t.status === 'complete').length;
    const inProgressTasks = rawTasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = rawTasks.filter(t => t.status === 'blocked');
    const notStartedTasks = rawTasks.filter(t => t.status === 'not_started' || t.status === 'todo').length;

    // =========================================================================
    // Build enhanced response (EPIC-015)
    // =========================================================================

    // Enhanced sprint with progress object
    const enhancedSprint: EnhancedSprint = {
      id: sprintData.id,
      title: sprintData.name || sprintData.id,
      epic_id: extractEpicId(sprintData.id),
      status: sprintData.status || 'active',
      progress: {
        complete: completedTasks,
        total: rawTasks.length,
        percent: rawTasks.length > 0
          ? Math.round((completedTasks / rawTasks.length) * 100)
          : 0,
      },
    };

    // Enhanced tasks array
    const enhancedTasks: EnhancedTask[] = rawTasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      ...(t.blocked_reason && { blocked_reason: t.blocked_reason }),
      ...(t.owner && { assignee: t.owner }),
    }));

    // Build next_task with continue flag
    // continue=true if the task was in_progress (indicates resumption)
    let enhancedNextTask: NextTask | null = null;
    if (nextTaskData) {
      enhancedNextTask = {
        id: nextTaskData.id,
        title: nextTaskData.title,
        continue: nextTaskData.status === 'in_progress',
      };
    } else {
      // If no explicit NEXT_TASK relationship, find first non-complete task
      const firstIncomplete = rawTasks.find(t =>
        t.status !== 'complete' && t.status !== 'blocked'
      );
      if (firstIncomplete) {
        enhancedNextTask = {
          id: firstIncomplete.id,
          title: firstIncomplete.title,
          continue: firstIncomplete.status === 'in_progress',
        };
      }
    }

    // Build blocked_tasks array
    const enhancedBlockedTasks: BlockedTask[] = blockedTasks.map(t => ({
      id: t.id,
      title: t.title,
      reason: t.blocked_reason || 'No reason provided',
    }));

    // =========================================================================
    // Build legacy response (backward compatibility)
    // =========================================================================

    const stats: SprintStats = {
      totalTasks: rawTasks.length,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      progressPercentage: enhancedSprint.progress.percent,
    };

    const executionTime = Date.now() - startTime;

    // Log performance warning if over threshold
    if (executionTime > 200) {
      console.warn(`[Sprint Active] Query took ${executionTime}ms (target: <200ms)`);
    }

    // Return combined response with enhanced fields and backward-compatible fields
    return NextResponse.json({
      // Enhanced response fields (EPIC-015)
      sprint: enhancedSprint,
      tasks: enhancedTasks,
      next_task: enhancedNextTask,
      blocked_tasks: enhancedBlockedTasks,

      // Epic/roadmap info (for CLI display)
      epic: epicData ? {
        id: epicData.id,
        title: epicData.title,
        roadmap_lane: epicData.roadmap_lane,
        roadmap_status: epicData.roadmap_status,
      } : null,

      // Backward-compatible fields (deprecated)
      nextTask: nextTaskData,
      stats,

      // Metadata
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
