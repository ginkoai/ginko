/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [api, task-activity, hotness, epic-001, task-4]
 * @related: [../../files/route.ts, ../../../../sprint/hot-tasks/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/[id]/activity
 *
 * Get recent activity for a specific task (TASK-4)
 * Returns events that mention the task with hotness calculation
 *
 * Hotness formula:
 * - Events in last 4h: Weight 3x (30 points each)
 * - Events in last 24h: Weight 2x (20 points each)
 * - Events in last 7d: Weight 1x (10 points each)
 * - Max score: 100
 *
 * Response:
 * {
 *   taskId: "TASK-4",
 *   lastActivity: "2025-11-21T10:00:00Z",
 *   count24h: 5,
 *   count7d: 12,
 *   hotness: 85,
 *   hotnessLevel: "blazing",
 *   events: [...] // Most recent 10
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../_neo4j';

interface ActivityResponse {
  taskId: string;
  lastActivity: string | null;
  count24h: number;
  count7d: number;
  hotness: number;
  hotnessLevel: 'cold' | 'warm' | 'hot' | 'blazing';
  events: Array<{
    id: string;
    timestamp: string;
    category: string;
    description: string;
    impact: string;
  }>;
}

/**
 * Calculate task hotness from event timestamps
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

    if (ageMs < 0) continue; // Future event (clock skew), ignore

    if (ageMs <= hour4Ms) {
      score += 30; // Very recent: 3x weight
    } else if (ageMs <= hour24Ms) {
      score += 20; // Recent: 2x weight
    } else if (ageMs <= day7Ms) {
      score += 10; // This week: 1x weight
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database unavailable' },
        { status: 503 }
      );
    }

    const taskId = params.id;

    // Query events mentioning this task
    const query = `
      MATCH (t:Task {id: $taskId})<-[:RECENT_ACTIVITY]-(e:Event)
      WHERE e.timestamp > datetime() - duration({days: 7})
      RETURN e.id as id,
             e.timestamp as timestamp,
             e.category as category,
             e.description as description,
             e.impact as impact
      ORDER BY e.timestamp DESC
    `;

    const result = await runQuery(query, { taskId });

    // Extract events
    const events = result.map((record: any) => ({
      id: record.id,
      timestamp: record.timestamp,
      category: record.category,
      description: record.description,
      impact: record.impact,
    }));

    // Calculate time-based counts
    const now = new Date();
    const hour24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const count24h = events.filter(
      (e: any) => new Date(e.timestamp) > hour24Ago
    ).length;
    const count7d = events.length;

    // Calculate hotness
    const hotness = calculateHotness(events);
    const hotnessLevel = getHotnessLevel(hotness);

    // Get last activity timestamp
    const lastActivity = events.length > 0 ? events[0].timestamp : null;

    const response: ActivityResponse = {
      taskId,
      lastActivity,
      count24h,
      count7d,
      hotness,
      hotnessLevel,
      events: events.slice(0, 10), // Most recent 10
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Task Activity API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch task activity',
      },
      { status: 500 }
    );
  }
}
