/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, task, adr, constraints, epic-002]
 * @related: [../activity/route.ts, ../files/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/task/{id}/constraints
 *
 * Returns ADR constraints for a task (MUST_FOLLOW relationships)
 * Enables AI constraint awareness - when an AI picks up a task,
 * it knows which architectural decisions must be followed.
 *
 * EPIC-002 Phase 1: Task → MUST_FOLLOW → ADR relationships
 *
 * Response:
 * {
 *   task: { id, title, status },
 *   constraints: [
 *     {
 *       adr: { id, title, status, summary },
 *       relationship: { source, extracted_at }
 *     }
 *   ],
 *   count: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../graph/_neo4j';
import fs from 'fs';
import path from 'path';

interface ADRConstraint {
  adr: {
    id: string;
    title: string;
    status: string;
    summary: string;
    filePath?: string;
  };
  relationship: {
    source: string;
    extracted_at: string;
  };
}

interface TaskConstraintsResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  constraints: ADRConstraint[];
  count: number;
}

/**
 * Read ADR frontmatter from filesystem for enhanced context
 * Falls back gracefully if file not found
 */
async function readADRFromFilesystem(adrId: string): Promise<{
  title: string;
  status: string;
  summary: string;
  filePath: string;
} | null> {
  try {
    // Try to find the ADR file
    // ADR ID format: "adr_002" or "ADR-002"
    const adrNumber = adrId.replace(/^adr_|^ADR-/i, '').padStart(3, '0');
    const adrFileName = `ADR-${adrNumber}`;

    // Common paths to check
    const possiblePaths = [
      path.join(process.cwd(), '..', 'docs', 'adr', `${adrFileName}.md`),
      path.join(process.cwd(), 'docs', 'adr', `${adrFileName}.md`),
    ];

    for (const filePath of possiblePaths) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');

        // Extract title from first H1
        const titleMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
        const title = titleMatch ? titleMatch[1].trim() : `ADR-${adrNumber}`;

        // Extract status from content
        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i);
        const status = statusMatch ? statusMatch[1].trim() : 'active';

        // Extract summary (first paragraph after title)
        const summaryMatch = content.match(/^#.+?\n\n(.+?)(?:\n\n|$)/s);
        const summary = summaryMatch
          ? summaryMatch[1].trim().substring(0, 200) + (summaryMatch[1].length > 200 ? '...' : '')
          : '';

        return {
          title,
          status,
          summary,
          filePath,
        };
      } catch {
        // File not found at this path, try next
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
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

    // Query task and its MUST_FOLLOW relationships
    const query = `
      MATCH (t:Task {id: $taskId})
      OPTIONAL MATCH (t)-[r:MUST_FOLLOW]->(a:ADR)
      RETURN t.id as taskId,
             t.title as taskTitle,
             t.status as taskStatus,
             collect({
               adrId: a.id,
               adrTitle: a.title,
               adrStatus: a.status,
               source: r.source,
               extractedAt: r.extracted_at
             }) as constraints
    `;

    const result = await runQuery(query, { taskId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const record = result[0];
    const rawConstraints = record.constraints || [];

    // Enhance constraints with filesystem data
    const constraints: ADRConstraint[] = [];

    for (const c of rawConstraints) {
      // Skip null entries (from tasks with no ADR relationships)
      if (!c.adrId) continue;

      // Try to get enhanced ADR data from filesystem
      const fsData = await readADRFromFilesystem(c.adrId);

      constraints.push({
        adr: {
          id: c.adrId,
          title: fsData?.title || c.adrTitle || c.adrId,
          status: fsData?.status || c.adrStatus || 'active',
          summary: fsData?.summary || '',
          filePath: fsData?.filePath,
        },
        relationship: {
          source: c.source || 'sprint_definition',
          extracted_at: c.extractedAt || new Date().toISOString(),
        },
      });
    }

    const response: TaskConstraintsResponse = {
      task: {
        id: record.taskId,
        title: record.taskTitle || taskId,
        status: record.taskStatus || 'unknown',
      },
      constraints,
      count: constraints.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Task Constraints] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
