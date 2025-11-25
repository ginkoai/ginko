/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, pattern, usages, epic-002-sprint-3]
 * @related: [../../task/[id]/patterns/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/pattern/{id}/usages
 *
 * Returns where a pattern is applied (APPLIED_IN relationships to files,
 * and APPLIES_PATTERN relationships from tasks)
 *
 * EPIC-002 Sprint 3 TASK-2: Pattern usages endpoint
 *
 * Response:
 * {
 *   pattern: { id, title, category, confidence, content },
 *   usages: {
 *     files: [{ id, path, context, extracted_at }],
 *     tasks: [{ id, title, status, extracted_at }]
 *   },
 *   totalUsages: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../graph/_neo4j';

interface FileUsage {
  id: string;
  path?: string;
  context?: string;
  extracted_at: string;
}

interface TaskUsage {
  id: string;
  title: string;
  status: string;
  extracted_at: string;
}

interface PatternUsagesResponse {
  pattern: {
    id: string;
    title: string;
    category: string;
    confidence: string;
    content?: string;
  };
  usages: {
    files: FileUsage[];
    tasks: TaskUsage[];
  };
  totalUsages: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patternId } = await params;

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Query pattern and its usages (files via APPLIED_IN, tasks via APPLIES_PATTERN)
    const query = `
      MATCH (p:Pattern {id: $patternId})
      OPTIONAL MATCH (p)-[rf:APPLIED_IN]->(f:File)
      OPTIONAL MATCH (t:Task)-[rt:APPLIES_PATTERN]->(p)
      WITH p,
           collect(DISTINCT {
             fileId: f.id,
             filePath: f.path,
             context: rf.context,
             extractedAt: rf.extracted_at
           }) as fileUsages,
           collect(DISTINCT {
             taskId: t.id,
             taskTitle: t.title,
             taskStatus: t.status,
             extractedAt: rt.extracted_at
           }) as taskUsages
      RETURN p.id as patternId,
             p.title as patternTitle,
             p.category as patternCategory,
             p.confidence as patternConfidence,
             p.content as patternContent,
             fileUsages,
             taskUsages
    `;

    const result = await runQuery(query, { patternId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    const record = result[0];

    // Process file usages
    const files: FileUsage[] = (record.fileUsages || [])
      .filter((f: any) => f.fileId)
      .map((f: any) => ({
        id: f.fileId,
        path: f.filePath,
        context: f.context,
        extracted_at: f.extractedAt || new Date().toISOString(),
      }));

    // Process task usages
    const tasks: TaskUsage[] = (record.taskUsages || [])
      .filter((t: any) => t.taskId)
      .map((t: any) => ({
        id: t.taskId,
        title: t.taskTitle || t.taskId,
        status: t.taskStatus || 'unknown',
        extracted_at: t.extractedAt || new Date().toISOString(),
      }));

    const response: PatternUsagesResponse = {
      pattern: {
        id: record.patternId,
        title: record.patternTitle || patternId,
        category: record.patternCategory || 'pattern',
        confidence: record.patternConfidence || 'medium',
        content: record.patternContent,
      },
      usages: {
        files,
        tasks,
      },
      totalUsages: files.length + tasks.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Pattern Usages] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
