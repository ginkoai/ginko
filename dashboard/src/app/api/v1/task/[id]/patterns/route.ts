/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, task, patterns, epic-002-sprint-3]
 * @related: [../constraints/route.ts, ../gotchas/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/{id}/patterns
 *
 * Returns patterns for a task (APPLIES_PATTERN relationships)
 * Enables AI pattern awareness - when an AI picks up a task,
 * it knows which patterns to apply for implementation.
 *
 * EPIC-002 Sprint 3 TASK-2: Pattern API endpoints
 *
 * Response:
 * {
 *   task: { id, title, status },
 *   patterns: [
 *     {
 *       pattern: { id, title, category, confidence, content },
 *       relationship: { source, extracted_at },
 *       usages: [{ fileId, context }]
 *     }
 *   ],
 *   count: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../graph/_neo4j';

interface PatternUsage {
  fileId: string;
  context?: string;
}

interface PatternReference {
  pattern: {
    id: string;
    title: string;
    category: string;
    confidence: string;
    content?: string;
  };
  relationship: {
    source: string;
    extracted_at: string;
  };
  usages: PatternUsage[];
}

interface TaskPatternsResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  patterns: PatternReference[];
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

    // Query task and its APPLIES_PATTERN relationships
    // Also fetch APPLIED_IN relationships to show where patterns are used
    const query = `
      MATCH (t:Task {id: $taskId})
      OPTIONAL MATCH (t)-[r:APPLIES_PATTERN]->(p:Pattern)
      OPTIONAL MATCH (p)-[u:APPLIED_IN]->(f:File)
      WITH t, p, r, collect({
        fileId: f.id,
        context: u.context
      }) as usages
      RETURN t.id as taskId,
             t.title as taskTitle,
             t.status as taskStatus,
             collect({
               patternId: p.id,
               patternTitle: p.title,
               patternCategory: p.category,
               patternConfidence: p.confidence,
               patternContent: p.content,
               source: r.source,
               extractedAt: r.extracted_at,
               usages: usages
             }) as patterns
    `;

    const result = await runQuery(query, { taskId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const record = result[0];
    const rawPatterns = record.patterns || [];

    // Process patterns, filtering out null entries
    const patterns: PatternReference[] = [];

    for (const p of rawPatterns) {
      // Skip null entries (from tasks with no pattern relationships)
      if (!p.patternId) continue;

      patterns.push({
        pattern: {
          id: p.patternId,
          title: p.patternTitle || p.patternId,
          category: p.patternCategory || 'pattern',
          confidence: p.patternConfidence || 'medium',
          content: p.patternContent,
        },
        relationship: {
          source: p.source || 'sprint_definition',
          extracted_at: p.extractedAt || new Date().toISOString(),
        },
        usages: (p.usages || []).filter((u: PatternUsage) => u.fileId),
      });
    }

    const response: TaskPatternsResponse = {
      task: {
        id: record.taskId,
        title: record.taskTitle || taskId,
        status: record.taskStatus || 'unknown',
      },
      patterns,
      count: patterns.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Task Patterns] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
