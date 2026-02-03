/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, task-sync, epic-015, sprint-0a, graph-authoritative]
 * @related: [../[id]/status/route.ts, ../../sprint/sync/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/task/sync
 * Create or update Task nodes in graph from parsed sprint data (EPIC-015 Sprint 0a Task 2)
 *
 * Key principle (ADR-060): Content from Git, State from Graph.
 * - On CREATE: Uses initial_status from markdown
 * - On UPDATE: Preserves existing status (graph-authoritative)
 *
 * Request Body:
 * - graphId: Graph namespace (required)
 * - tasks: Array of ParsedTask objects (required)
 * - createRelationships: Whether to create BELONGS_TO relationships (default: true)
 *
 * Returns (200):
 * - success: true
 * - created: Number of new tasks created
 * - updated: Number of existing tasks updated
 * - relationships: Number of relationships created
 * - tasks: Array of task IDs processed
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../../graph/_neo4j';

// Types matching task-parser.ts
type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete' | 'paused';

interface ParsedTask {
  id: string;
  sprint_id: string;
  epic_id: string;
  title: string;
  sprint_title?: string;  // Optional sprint title from CLI
  estimate: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assignee: string | null;
  initial_status: TaskStatus;
  goal: string | null;
  approach: string | null;  // e014_s02_t04: Implementation notes
  acceptance_criteria: string[];
  files: string[];
  related_adrs: string[];
}

interface SyncRequest {
  graphId: string;
  tasks: ParsedTask[];
  createRelationships?: boolean;
}

interface SyncResponse {
  success: boolean;
  created: number;
  updated: number;
  relationships: number;
  tasks: string[];
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('[Task Sync API] POST /api/v1/task/sync called');

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
        } as ErrorResponse,
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Parse request body
    const body: SyncRequest = await request.json();

    // Validate graphId
    if (!body.graphId || typeof body.graphId !== 'string' || body.graphId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required and must be a non-empty string',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate tasks array
    if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TASKS',
            message: 'tasks must be a non-empty array of task objects',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const graphId = body.graphId.trim();
    const createRelationships = body.createRelationships !== false;
    const processedTasks: string[] = [];
    let created = 0;
    let updated = 0;
    let relationships = 0;

    const session = getSession();
    try {
      // Process tasks in a transaction
      await session.executeWrite(async (tx) => {
        for (const task of body.tasks) {
          // Validate task has required fields
          if (!task.id || !task.sprint_id || !task.epic_id || !task.title) {
            console.warn(`[Task Sync API] Skipping invalid task:`, task.id || 'unknown');
            continue;
          }

          // MERGE task node - preserves status on UPDATE
          const result = await tx.run(
            `
            MERGE (t:Task {id: $taskId, graph_id: $graphId})
            ON CREATE SET
              t.title = $title,
              t.priority = $priority,
              t.estimate = $estimate,
              t.assignee = $assignee,
              t.goal = $goal,
              t.approach = $approach,
              t.status = $initialStatus,
              t.acceptance_criteria = $acceptanceCriteria,
              t.files = $files,
              t.related_adrs = $relatedAdrs,
              t.sprint_id = $sprintId,
              t.epic_id = $epicId,
              t.created_at = datetime(),
              t.updated_at = datetime(),
              t.synced_at = datetime()
            ON MATCH SET
              t.title = $title,
              t.priority = $priority,
              t.estimate = $estimate,
              t.goal = $goal,
              t.approach = $approach,
              t.acceptance_criteria = $acceptanceCriteria,
              t.files = $files,
              t.related_adrs = $relatedAdrs,
              t.sprint_id = $sprintId,
              t.epic_id = $epicId,
              t.updated_at = datetime(),
              t.synced_at = datetime()
              // NOTE: status, assignee NOT updated on MATCH - graph is authoritative
            RETURN t.id as id,
                   CASE WHEN t.created_at = t.updated_at THEN 'created' ELSE 'updated' END as action
            `,
            {
              taskId: task.id,
              graphId,
              title: task.title,
              priority: task.priority,
              estimate: task.estimate,
              assignee: task.assignee,
              goal: task.goal,
              approach: task.approach || null,
              initialStatus: task.initial_status,
              acceptanceCriteria: task.acceptance_criteria,
              files: task.files,
              relatedAdrs: task.related_adrs,
              sprintId: task.sprint_id,
              epicId: task.epic_id,
            }
          );

          if (result.records.length > 0) {
            const action = result.records[0].get('action');
            if (action === 'created') {
              created++;
            } else {
              updated++;
            }
            processedTasks.push(task.id);
          }

          // Create relationships if requested
          if (createRelationships) {
            // Task -[BELONGS_TO]-> Sprint
            const sprintRel = await tx.run(
              `
              MATCH (t:Task {id: $taskId, graph_id: $graphId})
              MERGE (s:Sprint {id: $sprintId, graph_id: $graphId})
              ON CREATE SET
                s.title = $sprintTitle,
                s.epic_id = $epicId,
                s.status = 'not_started',
                s.created_at = datetime(),
                s.synced_at = datetime()
              ON MATCH SET
                s.synced_at = datetime()
              MERGE (t)-[r:BELONGS_TO]->(s)
              ON CREATE SET r.created_at = datetime()
              RETURN count(r) as count
              `,
              {
                taskId: task.id,
                graphId,
                sprintId: task.sprint_id,
                sprintTitle: task.sprint_title || `Sprint ${task.sprint_id}`,
                epicId: task.epic_id,
              }
            );

            if (sprintRel.records[0]?.get('count')?.toNumber() > 0) {
              relationships++;
            }

            // Sprint -[BELONGS_TO]-> Epic
            const epicRel = await tx.run(
              `
              MATCH (s:Sprint {id: $sprintId, graph_id: $graphId})
              MERGE (e:Epic {id: $epicId, graph_id: $graphId})
              ON CREATE SET e.created_at = datetime(), e.synced_at = datetime()
              MERGE (s)-[r:BELONGS_TO]->(e)
              ON CREATE SET r.created_at = datetime()
              RETURN count(r) as count
              `,
              { sprintId: task.sprint_id, epicId: task.epic_id, graphId }
            );

            if (epicRel.records[0]?.get('count')?.toNumber() > 0) {
              relationships++;
            }

            // Task -[REFERENCES]-> ADR (for each related ADR)
            for (const adrId of task.related_adrs) {
              await tx.run(
                `
                MATCH (t:Task {id: $taskId, graph_id: $graphId})
                MERGE (a:ADR {id: $adrId, graph_id: $graphId})
                ON CREATE SET a.created_at = datetime()
                MERGE (t)-[r:REFERENCES]->(a)
                ON CREATE SET r.created_at = datetime()
                `,
                { taskId: task.id, adrId, graphId }
              );
              relationships++;
            }
          }
        }
      });

      const response: SyncResponse = {
        success: true,
        created,
        updated,
        relationships,
        tasks: processedTasks,
      };

      console.log(
        `[Task Sync API] Synced ${processedTasks.length} tasks: ${created} created, ${updated} updated, ${relationships} relationships`
      );
      return NextResponse.json(response, { status: 200 });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Sync API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync tasks',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/task/sync
 * Get all tasks for a graph/sprint
 */
export async function GET(request: NextRequest) {
  console.log('[Task Sync API] GET /api/v1/task/sync called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const sprintId = searchParams.get('sprintId');
    const epicId = searchParams.get('epicId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    const session = getSession();
    try {
      // Build query based on filters
      let query = `MATCH (t:Task {graph_id: $graphId})`;
      const params: Record<string, string> = { graphId };

      if (sprintId) {
        query += ` WHERE t.sprint_id = $sprintId`;
        params.sprintId = sprintId;
      } else if (epicId) {
        query += ` WHERE t.epic_id = $epicId`;
        params.epicId = epicId;
      }

      query += `
        RETURN t.id as id,
               t.title as title,
               t.status as status,
               t.priority as priority,
               t.sprint_id as sprint_id,
               t.epic_id as epic_id,
               t.estimate as estimate,
               t.assignee as assignee,
               t.goal as goal,
               t.approach as approach,
               t.synced_at as synced_at
        ORDER BY t.sprint_id, t.id
      `;

      const result = await session.executeRead(async (tx) => {
        return tx.run(query, params);
      });

      const tasks = result.records.map((record) => ({
        id: record.get('id'),
        title: record.get('title'),
        status: record.get('status') || 'not_started',
        priority: record.get('priority') || 'MEDIUM',
        sprint_id: record.get('sprint_id'),
        epic_id: record.get('epic_id'),
        estimate: record.get('estimate'),
        assignee: record.get('assignee'),
        goal: record.get('goal'),
        approach: record.get('approach') || null,
        synced_at: record.get('synced_at')?.toString() || null,
      }));

      return NextResponse.json({ tasks, count: tasks.length });

    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Task Sync API] ERROR getting tasks:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get tasks' } },
      { status: 500 }
    );
  }
}
