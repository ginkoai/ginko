/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, task, gotchas, epic-002-sprint-3]
 * @related: [../constraints/route.ts, ../patterns/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/{id}/gotchas
 *
 * Returns gotchas for a task (AVOID_GOTCHA relationships)
 * Enables AI gotcha awareness - when an AI picks up a task,
 * it knows which pitfalls to avoid during implementation.
 *
 * EPIC-002 Sprint 3 TASK-2: Gotcha API endpoints
 *
 * Response:
 * {
 *   task: { id, title, status },
 *   gotchas: [
 *     {
 *       gotcha: { id, title, severity, symptom, cause, solution },
 *       relationship: { source, extracted_at },
 *       stats: { encounters, resolutions }
 *     }
 *   ],
 *   count: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../graph/_neo4j';

interface GotchaStats {
  encounters: number;
  resolutions: number;
}

interface GotchaReference {
  gotcha: {
    id: string;
    title: string;
    severity: string;
    symptom?: string;
    cause?: string;
    solution?: string;
  };
  relationship: {
    source: string;
    extracted_at: string;
  };
  stats: GotchaStats;
}

interface TaskGotchasResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  gotchas: GotchaReference[];
  count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Query task and its AVOID_GOTCHA relationships
    const query = `
      MATCH (t:Task {id: $taskId})
      OPTIONAL MATCH (t)-[r:AVOID_GOTCHA]->(g:Gotcha)
      RETURN t.id as taskId,
             t.title as taskTitle,
             t.status as taskStatus,
             collect({
               gotchaId: g.id,
               gotchaTitle: g.title,
               gotchaSeverity: g.severity,
               gotchaSymptom: g.symptom,
               gotchaCause: g.cause,
               gotchaSolution: g.solution,
               encounters: g.encounters,
               resolutions: g.resolutions,
               source: r.source,
               extractedAt: r.extracted_at
             }) as gotchas
    `;

    const result = await runQuery(query, { taskId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const record = result[0];
    const rawGotchas = record.gotchas || [];

    // Process gotchas, filtering out null entries
    const gotchas: GotchaReference[] = [];

    for (const g of rawGotchas) {
      // Skip null entries (from tasks with no gotcha relationships)
      if (!g.gotchaId) continue;

      gotchas.push({
        gotcha: {
          id: g.gotchaId,
          title: g.gotchaTitle || g.gotchaId,
          severity: g.gotchaSeverity || 'medium',
          symptom: g.gotchaSymptom,
          cause: g.gotchaCause,
          solution: g.gotchaSolution,
        },
        relationship: {
          source: g.source || 'sprint_definition',
          extracted_at: g.extractedAt || new Date().toISOString(),
        },
        stats: {
          encounters: g.encounters || 0,
          resolutions: g.resolutions || 0,
        },
      });
    }

    // Sort by severity (critical > high > medium > low)
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    gotchas.sort((a, b) =>
      (severityOrder[a.gotcha.severity] || 2) - (severityOrder[b.gotcha.severity] || 2)
    );

    const response: TaskGotchasResponse = {
      task: {
        id: record.taskId,
        title: record.taskTitle || taskId,
        status: record.taskStatus || 'unknown',
      },
      gotchas,
      count: gotchas.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Task Gotchas] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
