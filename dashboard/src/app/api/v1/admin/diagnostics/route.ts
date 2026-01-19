/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, admin, diagnostics, debug]
 * @related: [../teams/route.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [neo4j-driver, supabase]
 */

/**
 * GET /api/v1/admin/diagnostics
 *
 * Diagnostic endpoint to investigate data issues:
 * - Epics and their children
 * - Sprints with malformed titles
 * - Epic-Sprint relationship mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getDriver } from '@/app/api/v1/graph/_neo4j';

// Admin user IDs
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

interface DiagnosticResult {
  epics: {
    id: string;
    epic_id: string | null;
    title: string | null;
    childCount: number;
  }[];
  sprints: {
    id: string;
    sprint_id: string | null;
    title: string | null;
    epicId: string | null;
    isMalformed: boolean;
  }[];
  malformedSprints: {
    id: string;
    title: string | null;
    reason: string;
  }[];
  orphanedSprints: {
    id: string;
    title: string | null;
    expectedEpic: string | null;
  }[];
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Diagnostics API] GET called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'graphId query parameter required' },
        { status: 400 }
      );
    }

    const driver = getDriver();
    if (!driver) {
      return NextResponse.json(
        { error: 'Neo4j driver not available' },
        { status: 503 }
      );
    }

    const session = driver.session();

    try {
      // Query all Epics with their properties
      const epicResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (e:Epic)
           WHERE e.graphId = $graphId OR e.graph_id = $graphId
           OPTIONAL MATCH (e)-[r:HAS_SPRINT|CONTAINS]->(s:Sprint)
           RETURN e.id as id,
                  e.epic_id as epic_id,
                  e.title as title,
                  count(s) as childCount
           ORDER BY e.id`,
          { graphId }
        );
      });

      const epics = epicResult.records.map((r) => ({
        id: r.get('id'),
        epic_id: r.get('epic_id'),
        title: r.get('title'),
        childCount: r.get('childCount')?.toNumber?.() || r.get('childCount') || 0,
      }));

      // Query all Sprints with their properties
      const sprintResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (s:Sprint)
           WHERE s.graphId = $graphId OR s.graph_id = $graphId
           RETURN s.id as id,
                  s.sprint_id as sprint_id,
                  s.title as title
           ORDER BY s.id
           LIMIT 100`,
          { graphId }
        );
      });

      const sprints = sprintResult.records.map((r) => {
        const id = r.get('id') || '';
        const sprintId = r.get('sprint_id') || '';
        const title = r.get('title') || '';

        // Extract epic ID from sprint
        const epicId = extractEpicId(sprintId) || extractEpicId(id) || extractEpicId(title);

        // Check for malformed title
        const isMalformed =
          title.includes('string') ||
          title.includes('};') ||
          title.includes('[object') ||
          title.includes('undefined') ||
          title.includes('null');

        return {
          id,
          sprint_id: sprintId,
          title,
          epicId,
          isMalformed,
        };
      });

      // Filter malformed sprints
      const malformedSprints = sprints
        .filter((s) => s.isMalformed)
        .map((s) => ({
          id: s.id,
          title: s.title,
          reason: detectMalformReason(s.title),
        }));

      // Find orphaned sprints (sprints that should belong to an epic but don't match)
      const epicIds = new Set(epics.map((e) => e.epic_id?.toLowerCase()).filter(Boolean));
      const epicNodeIds = new Set(epics.map((e) => extractEpicId(e.id)).filter(Boolean));

      const orphanedSprints = sprints
        .filter((s) => {
          if (!s.epicId) return false; // No expected epic
          // Check if expected epic exists
          return !epicIds.has(s.epicId.toLowerCase()) && !epicNodeIds.has(s.epicId);
        })
        .map((s) => ({
          id: s.id,
          title: s.title,
          expectedEpic: s.epicId,
        }));

      const result: DiagnosticResult = {
        epics,
        sprints: sprints.slice(0, 50), // Limit for readability
        malformedSprints,
        orphanedSprints: orphanedSprints.slice(0, 20),
      };

      return NextResponse.json({
        graphId,
        summary: {
          totalEpics: epics.length,
          epicsWithNoChildren: epics.filter((e) => e.childCount === 0).length,
          totalSprints: sprints.length,
          malformedSprintCount: malformedSprints.length,
          orphanedSprintCount: orphanedSprints.length,
        },
        data: result,
      });

    } catch (error) {
      console.error('[Diagnostics API] Error:', error);
      return NextResponse.json(
        {
          error: 'Diagnostics failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    } finally {
      await session.close();
    }
  });
}

// Helper: Extract epic ID from string
function extractEpicId(id: string | null): string | null {
  if (!id) return null;
  const lower = id.toLowerCase();

  // Pattern 1: e{NNN}[-_]s{NN} anywhere
  const eMatch = lower.match(/e(\d{2,3})[-_]s\d+/);
  if (eMatch) return `e${eMatch[1].padStart(3, '0')}`;

  // Pattern 2: standalone e{NNN}
  const standaloneE = lower.match(/[-_]e(\d{2,3})[-_]/);
  if (standaloneE) return `e${standaloneE[1].padStart(3, '0')}`;

  // Pattern 3: epic{NNN}
  const epicMatch = lower.match(/epic[-_]?(\d{2,3})/);
  if (epicMatch) return `e${epicMatch[1].padStart(3, '0')}`;

  // Pattern 4: e{NNN} at start
  const prefixMatch = lower.match(/^e(\d+)/);
  if (prefixMatch) return `e${prefixMatch[1].padStart(3, '0')}`;

  return null;
}

// Helper: Detect reason for malformed title
function detectMalformReason(title: string | null): string {
  if (!title) return 'null title';
  if (title.includes('string')) return 'contains "string" literal';
  if (title.includes('};')) return 'contains JS object remnant';
  if (title.includes('[object')) return 'stringified object';
  if (title.includes('undefined')) return 'contains undefined';
  if (title.includes('null')) return 'contains null literal';
  return 'unknown';
}
