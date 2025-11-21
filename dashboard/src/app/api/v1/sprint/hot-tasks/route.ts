/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [api, sprint, hot-tasks, momentum, epic-001, task-4]
 * @related: [../active/route.ts, ../../task/[id]/activity/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/sprint/hot-tasks
 *
 * Get all tasks sorted by hotness (momentum awareness - TASK-4)
 * Identifies which tasks are actively being worked on vs. cold/stale
 *
 * Use cases:
 * - Show hot tasks first in sprint views
 * - Identify stale tasks needing attention
 * - Provide momentum signals to AI ("TASK-4 is blazing hot")
 *
 * Query parameters:
 * - sprint: Sprint ID (optional, defaults to active sprint)
 * - limit: Max tasks to return (optional, default 20)
 * - minHotness: Minimum hotness threshold (optional, 0-100)
 *
 * Response:
 * {
 *   sprint: "sprint_1732146000000_graph_infra",
 *   tasks: [
 *     {
 *       taskId: "TASK-4",
 *       title: "Task → Event Relationships",
 *       status: "in_progress",
 *       priority: "HIGH",
 *       hotness: 95,
 *       hotnessLevel: "blazing",
 *       count24h: 8,
 *       lastActivity: "2025-11-21T10:00:00Z"
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../graph/_neo4j';

interface HotTask {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  hotness: number;
  hotnessLevel: 'cold' | 'warm' | 'hot' | 'blazing';
  count24h: number;
  count7d: number;
  lastActivity: string | null;
}

interface HotTasksResponse {
  sprint: string;
  count: number;
  tasks: HotTask[];
}

/**
 * Calculate hotness from event timestamps
 */
function calculateHotness(events: Array<{ timestamp: string }>): number {
  if (!events || events.length === 0) {
    return 0;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const hour4Ms = 4 * 60 * 60 * 1000;
  const hour24Ms = 24 * 60 * 60 * 1000;
  const day7Ms = 7 * 24 * 60 * 60 * 1000;

  let score = 0;

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime();
    const ageMs = nowMs - eventTime;

    if (ageMs < 0) continue;

    if (ageMs <= hour4Ms) {
      score += 30;
    } else if (ageMs <= hour24Ms) {
      score += 20;
    } else if (ageMs <= day7Ms) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Get hotness level classification
 */
function getHotnessLevel(hotness: number): 'cold' | 'warm' | 'hot' | 'blazing' {
  if (hotness === 0) return 'cold';
  if (hotness < 30) return 'warm';
  if (hotness < 70) return 'hot';
  return 'blazing';
}

export async function GET(request: NextRequest) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database unavailable' },
        { status: 503 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const sprintFilter = searchParams.get('sprint');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minHotness = parseInt(searchParams.get('minHotness') || '0', 10);

    // Query all tasks with their recent events
    // If sprint filter provided, only tasks in that sprint
    const query = `
      MATCH (t:Task)
      ${sprintFilter ? 'WHERE EXISTS((s:Sprint {id: $sprintId})-[:CONTAINS]->(t))' : ''}

      // Get recent events (last 7 days)
      OPTIONAL MATCH (t)<-[:RECENT_ACTIVITY]-(e:Event)
      WHERE e.timestamp > datetime() - duration({days: 7})

      WITH t,
           collect({timestamp: e.timestamp}) as events,
           count(e) as totalEvents

      // Only return tasks with activity OR explicitly requested sprint
      WHERE totalEvents > 0 ${sprintFilter ? '' : 'OR NOT EXISTS((t)<-[:RECENT_ACTIVITY]-())'}

      RETURN t.id as taskId,
             t.title as title,
             t.status as status,
             t.priority as priority,
             events,
             totalEvents
      ORDER BY totalEvents DESC
      LIMIT $limit
    `;

    const result = await runQuery(query, {
      sprintId: sprintFilter,
      limit,
    });

    // Process tasks and calculate hotness
    const now = new Date();
    const hour24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const tasks: HotTask[] = result
      .map((record: any) => {
        const events = record.events.filter((e: any) => e.timestamp); // Filter out null timestamps
        const hotness = calculateHotness(events);

        // Count events in different time windows
        const count24h = events.filter(
          (e: any) => new Date(e.timestamp) > hour24Ago
        ).length;
        const count7d = events.length;

        // Get last activity
        const sortedEvents = events
          .map((e: any) => ({ timestamp: e.timestamp }))
          .sort((a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        const lastActivity = sortedEvents.length > 0 ? sortedEvents[0].timestamp : null;

        return {
          taskId: record.taskId,
          title: record.title || 'Untitled Task',
          status: record.status || 'not_started',
          priority: record.priority || 'MEDIUM',
          hotness,
          hotnessLevel: getHotnessLevel(hotness),
          count24h,
          count7d,
          lastActivity,
        };
      })
      .filter((task: HotTask) => task.hotness >= minHotness) // Apply minimum hotness filter
      .sort((a: HotTask, b: HotTask) => b.hotness - a.hotness); // Sort by hotness descending

    const response: HotTasksResponse = {
      sprint: sprintFilter || 'all',
      count: tasks.length,
      tasks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Hot Tasks API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch hot tasks',
      },
      { status: 500 }
    );
  }
}
