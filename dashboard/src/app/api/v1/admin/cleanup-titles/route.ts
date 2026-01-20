/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-20
 * @tags: [api, admin, cleanup, data-quality]
 * @related: [diagnostics/route.ts, sprint/sync/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, supabase]
 */

/**
 * POST /api/v1/admin/cleanup-titles
 *
 * Cleanup endpoint to fix malformed node titles in Neo4j.
 * Handles corruption patterns like:
 * - "string;" or "string," (TypeScript type hints)
 * - "string; // Comment" (code with comments)
 * - API endpoint names stored as titles
 * - Stringified objects
 *
 * Query params:
 * - graphId: Required - the graph to cleanup
 * - dryRun: Optional - if "true", only report what would be fixed
 * - cleanupDuplicates: Optional - if "true", archive duplicate nodes
 * - archiveGraphId: Optional - custom archive graph ID (auto-generated if not provided)
 *
 * Duplicate Cleanup (when cleanupDuplicates=true):
 * - Finds duplicate Epic/Sprint nodes by canonical ID
 * - Picks the "best" node to keep (most relationships, most complete)
 * - Migrates relationships from duplicates to canonical node
 * - Moves duplicates to archive graph (preserves data for recovery)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/auth/resolve-user';
import { getDriver } from '@/app/api/v1/graph/_neo4j';

// Admin user IDs
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

// Patterns that indicate a malformed title
const MALFORMED_PATTERNS = [
  /^string[;,}\s]/i,           // starts with 'string;' or 'string,' or 'string }'
  /^["']?string["']?[;,]/i,    // quoted string with separator
  /^[{}\[\]];?$/,              // just braces/brackets
  /^\[object/i,                // stringified object
  /^undefined$/i,              // literal undefined
  /^null$/i,                   // literal null
  /^function\s*\(/i,           // function definition
  /\/\/\s*["']/,               // JS comment with quote
  /^["']?(GET|POST|PUT|PATCH|DELETE)\s+\/api/i,  // API endpoint
];

function isMalformedTitle(title: string | null): boolean {
  if (!title) return true;
  return MALFORMED_PATTERNS.some(pattern => pattern.test(title));
}

function extractCleanTitle(title: string): string | null {
  // Try to extract quoted string (handles 'string; // "Actual Title"')
  const quotedMatch = title.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    const extracted = quotedMatch[1] || quotedMatch[2];
    if (extracted && !isMalformedTitle(extracted)) {
      return extracted;
    }
  }

  // Try to extract content after // comment marker
  const commentMatch = title.match(/\/\/\s*(.+)$/);
  if (commentMatch) {
    const afterComment = commentMatch[1].replace(/^["']|["']$/g, '').trim();
    if (afterComment && !isMalformedTitle(afterComment)) {
      return afterComment;
    }
  }

  return null;
}

function generateFallbackTitle(nodeId: string, label: string): string {
  // Try to extract meaningful parts from the ID
  const epicMatch = nodeId.match(/e(\d+)/i);
  const sprintMatch = nodeId.match(/s(\d+)/i);
  const taskMatch = nodeId.match(/t(\d+)/i);

  if (label === 'Task' && epicMatch && sprintMatch && taskMatch) {
    return `Task ${parseInt(taskMatch[1])} (Sprint ${parseInt(sprintMatch[1])})`;
  }
  if (label === 'Sprint' && epicMatch && sprintMatch) {
    return `Sprint ${parseInt(sprintMatch[1])} (Epic ${parseInt(epicMatch[1])})`;
  }
  if (label === 'Epic' && epicMatch) {
    return `Epic ${parseInt(epicMatch[1])}`;
  }

  return nodeId;
}

interface CleanupResult {
  label: string;
  id: string;
  oldTitle: string | null;
  newTitle: string;
  source: 'extracted' | 'fallback';
}

export async function POST(request: NextRequest) {
  // Extract Bearer token (supports both gk_* API keys and OAuth JWTs)
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const userResult = await resolveUserId(token);

  if ('error' in userResult) {
    return NextResponse.json(
      { error: userResult.error },
      { status: 401 }
    );
  }

  console.log('[Cleanup Titles API] POST called by user:', userResult.userId);

  // Check admin access
  if (!ADMIN_USER_IDS.includes(userResult.userId)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const graphId = searchParams.get('graphId');
  const dryRun = searchParams.get('dryRun') === 'true';
  const cleanupDuplicates = searchParams.get('cleanupDuplicates') === 'true';
  // Archive graph ID - auto-generate if not provided
  const archiveGraphId = searchParams.get('archiveGraphId') ||
    `${graphId}_archive_duplicates_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

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
  const results: CleanupResult[] = [];
  const errors: string[] = [];

  try {
    // Query all nodes that might have malformed titles
    const labels = ['Sprint', 'Task', 'Epic'];

    for (const label of labels) {
      const queryResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n:${label})
           WHERE n.graphId = $graphId OR n.graph_id = $graphId
           RETURN n.id as id, n.title as title, n.name as name`,
          { graphId }
        );
      });

      for (const record of queryResult.records) {
        const id = record.get('id');
        const title = record.get('title') || record.get('name');

        if (isMalformedTitle(title)) {
          // Try to extract clean title
          const cleanTitle = title ? extractCleanTitle(title) : null;
          const newTitle = cleanTitle || generateFallbackTitle(id, label);
          const source = cleanTitle ? 'extracted' : 'fallback';

          results.push({
            label,
            id,
            oldTitle: title,
            newTitle,
            source,
          });

          // Apply fix if not dry run
          if (!dryRun) {
            try {
              await session.executeWrite(async (tx) => {
                return tx.run(
                  `MATCH (n:${label} {id: $id})
                   WHERE n.graphId = $graphId OR n.graph_id = $graphId
                   SET n.title = $newTitle, n.name = $newTitle, n.updatedAt = datetime()
                   RETURN n.id`,
                  { id, graphId, newTitle }
                );
              });
            } catch (err) {
              errors.push(`Failed to update ${label} ${id}: ${err}`);
            }
          }
        }
      }
    }

    // Find duplicate nodes
    const duplicateReport = await findDuplicates(session, graphId);

    // Handle duplicate cleanup if requested
    let duplicateCleanupResults: DuplicateCleanupResult[] | undefined;
    if (cleanupDuplicates && duplicateReport.length > 0) {
      duplicateCleanupResults = await archiveDuplicates(
        session,
        graphId,
        archiveGraphId,
        duplicateReport,
        dryRun
      );
    }

    // Build response message
    let message = dryRun
      ? `Found ${results.length} nodes with malformed titles (dry run - no changes made)`
      : `Fixed ${results.length} nodes with malformed titles`;

    if (cleanupDuplicates && duplicateCleanupResults) {
      const totalArchived = duplicateCleanupResults.reduce(
        (sum, r) => sum + r.archivedNodeIds.length, 0
      );
      message += dryRun
        ? `. Would archive ${totalArchived} duplicate nodes to ${archiveGraphId}`
        : `. Archived ${totalArchived} duplicate nodes to ${archiveGraphId}`;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      fixed: results.length,
      results,
      duplicates: duplicateReport,
      ...(cleanupDuplicates && {
        duplicateCleanup: {
          enabled: true,
          archiveGraphId,
          results: duplicateCleanupResults,
        },
      }),
      errors: errors.length > 0 ? errors : undefined,
      message,
    });

  } catch (error) {
    console.error('[Cleanup Titles API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

async function findDuplicates(session: any, graphId: string) {
  const duplicates: { label: string; canonicalId: string; count: number; nodeIds: string[] }[] = [];

  // Find duplicate Epics by canonical ID
  const epicDupes = await session.executeRead(async (tx: any) => {
    return tx.run(
      `MATCH (e:Epic)
       WHERE e.graphId = $graphId OR e.graph_id = $graphId
       WITH e,
            CASE
              WHEN e.epic_id =~ '(?i)^e\\\\d+$' THEN toLower(e.epic_id)
              WHEN e.epic_id =~ '(?i)^epic[-_]?\\\\d+$' THEN 'e' + substring(e.epic_id, size(e.epic_id) - 3)
              WHEN e.id =~ '(?i)^e\\\\d+$' THEN toLower(e.id)
              ELSE toLower(coalesce(e.epic_id, e.id))
            END as canonicalId
       WITH canonicalId, collect(e.id) as nodeIds, count(*) as cnt
       WHERE cnt > 1
       RETURN canonicalId, nodeIds, cnt
       ORDER BY cnt DESC`,
      { graphId }
    );
  });

  // Helper to convert Neo4j integers (handles BigInt)
  const toNum = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v?.toNumber === 'function') return v.toNumber();
    return Number(v) || 0;
  };

  for (const record of epicDupes.records) {
    duplicates.push({
      label: 'Epic',
      canonicalId: record.get('canonicalId'),
      count: toNum(record.get('cnt')),
      nodeIds: record.get('nodeIds'),
    });
  }

  // Find duplicate Sprints by normalized ID
  const sprintDupes = await session.executeRead(async (tx: any) => {
    return tx.run(
      `MATCH (s:Sprint)
       WHERE s.graphId = $graphId OR s.graph_id = $graphId
       WITH s,
            CASE
              WHEN s.id =~ '(?i)^e\\\\d+_s\\\\d+$' THEN toLower(s.id)
              WHEN s.sprint_id =~ '(?i)^e\\\\d+_s\\\\d+$' THEN toLower(s.sprint_id)
              ELSE toLower(coalesce(s.sprint_id, s.id))
            END as canonicalId
       WITH canonicalId, collect(s.id) as nodeIds, count(*) as cnt
       WHERE cnt > 1
       RETURN canonicalId, nodeIds, cnt
       ORDER BY cnt DESC`,
      { graphId }
    );
  });

  for (const record of sprintDupes.records) {
    duplicates.push({
      label: 'Sprint',
      canonicalId: record.get('canonicalId'),
      count: toNum(record.get('cnt')),
      nodeIds: record.get('nodeIds'),
    });
  }

  return duplicates;
}

/**
 * Diagnose duplicate nodes - get detailed info including dates and element IDs
 */
async function diagnoseDuplicates(session: any, graphId: string, sampleId?: string) {
  // If sampleId provided, get details for that specific ID
  // Otherwise, get a sample of the worst offenders
  const query = sampleId
    ? `MATCH (s:Sprint)
       WHERE s.id = $sampleId AND (s.graphId = $graphId OR s.graph_id = $graphId)
       RETURN s.id as id,
              elementId(s) as elementId,
              s.createdAt as createdAt,
              s.updatedAt as updatedAt,
              s.name as name,
              s.title as title,
              s.progress as progress,
              keys(s) as propertyKeys
       ORDER BY s.createdAt DESC
       LIMIT 20`
    : `MATCH (s:Sprint)
       WHERE s.graphId = $graphId OR s.graph_id = $graphId
       WITH s.id as id, collect({
         elementId: elementId(s),
         createdAt: s.createdAt,
         updatedAt: s.updatedAt,
         name: s.name,
         title: s.title,
         progress: s.progress
       }) as nodes, count(*) as cnt
       WHERE cnt > 1
       RETURN id, nodes[0..5] as sampleNodes, cnt
       ORDER BY cnt DESC
       LIMIT 10`;

  const result = await session.executeRead(async (tx: any) => {
    return tx.run(query, { graphId, sampleId });
  });

  // Helper to convert Neo4j integers (handles BigInt)
  const toNum = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v?.toNumber === 'function') return v.toNumber();
    return Number(v) || 0;
  };

  return result.records.map((r: any) => {
    if (sampleId) {
      return {
        id: r.get('id'),
        elementId: r.get('elementId'),
        createdAt: r.get('createdAt')?.toString(),
        updatedAt: r.get('updatedAt')?.toString(),
        name: r.get('name'),
        title: r.get('title'),
        progress: toNum(r.get('progress')),
        propertyKeys: r.get('propertyKeys'),
      };
    } else {
      return {
        id: r.get('id'),
        count: toNum(r.get('cnt')),
        sampleNodes: r.get('sampleNodes'),
      };
    }
  });
}

// ============================================================================
// Duplicate Cleanup with Archive
// ============================================================================

interface DuplicateCleanupResult {
  label: string;
  canonicalId: string;
  keptNodeId: string;
  archivedNodeIds: string[];
  migratedRelationships: number;
}

/**
 * Pick the best node to keep from a group of duplicates.
 * Uses Neo4j element IDs since nodes may have the same `id` property.
 * Criteria: most recent updatedAt/createdAt, non-null title, most relationships, most complete properties
 */
async function pickBestNode(
  session: any,
  label: string,
  nodeId: string, // The shared id property value
  graphId: string
): Promise<{ bestElementId: string; duplicateElementIds: string[] }> {
  // Query all nodes with this id, using elementId to distinguish them
  const result = await session.executeRead(async (tx: any) => {
    return tx.run(
      `MATCH (n:${label})
       WHERE n.id = $nodeId AND (n.graphId = $graphId OR n.graph_id = $graphId)
       OPTIONAL MATCH (n)-[r]-()
       WITH n, elementId(n) as elemId, count(r) as relCount,
            size([k IN keys(n) WHERE n[k] IS NOT NULL]) as propCount,
            CASE WHEN n.title IS NOT NULL AND n.title <> '' THEN 1 ELSE 0 END as hasTitle,
            coalesce(n.updatedAt, n.createdAt, datetime('1970-01-01')) as lastUpdate
       RETURN elemId, relCount, propCount, hasTitle, lastUpdate
       ORDER BY lastUpdate DESC, hasTitle DESC, relCount DESC, propCount DESC`,
      { nodeId, graphId }
    );
  });

  if (result.records.length <= 1) {
    // No duplicates or single node
    const elemId = result.records[0]?.get('elemId');
    return { bestElementId: elemId || '', duplicateElementIds: [] };
  }

  const allElementIds = result.records.map((r: any) => r.get('elemId'));
  const bestElementId = allElementIds[0]; // First one is the best (sorted by criteria)
  const duplicateElementIds = allElementIds.slice(1);

  return { bestElementId, duplicateElementIds };
}

/**
 * Archive duplicate nodes by moving them to a separate graph namespace.
 * Uses Neo4j element IDs to distinguish nodes with the same `id` property.
 * Also migrates relationships from duplicates to the canonical node.
 */
async function archiveDuplicates(
  session: any,
  graphId: string,
  archiveGraphId: string,
  duplicates: { label: string; canonicalId: string; count: number; nodeIds: string[] }[],
  dryRun: boolean
): Promise<DuplicateCleanupResult[]> {
  const results: DuplicateCleanupResult[] = [];

  for (const group of duplicates) {
    // Get unique id values (they may all be the same)
    const uniqueIds = [...new Set(group.nodeIds)];

    // For each unique id, find the best node and duplicates using element IDs
    for (const nodeId of uniqueIds) {
      const { bestElementId, duplicateElementIds } = await pickBestNode(
        session,
        group.label,
        nodeId,
        graphId
      );

      if (duplicateElementIds.length === 0) {
        continue; // No duplicates for this id
      }

      let migratedRelationships = 0;

      if (!dryRun) {
        // Step 1: Migrate incoming relationships from duplicates to canonical node
        // Uses elementId() to target specific nodes
        const incomingResult = await session.executeWrite(async (tx: any) => {
          return tx.run(
            `MATCH (source)-[r]->(dup:${group.label})
             WHERE elementId(dup) IN $duplicateElementIds
             MATCH (canonical:${group.label})
             WHERE elementId(canonical) = $bestElementId
             WITH source, r, canonical, type(r) as relType, properties(r) as relProps
             CALL {
               WITH source, canonical, relType, relProps
               CREATE (source)-[newRel:MIGRATED_REL]->(canonical)
               SET newRel = relProps
               RETURN newRel
             }
             DELETE r
             RETURN count(*) as migrated`,
            { duplicateElementIds, bestElementId }
          );
        });

        // Step 2: Migrate outgoing relationships from duplicates to canonical node
        const outgoingResult = await session.executeWrite(async (tx: any) => {
          return tx.run(
            `MATCH (dup:${group.label})-[r]->(target)
             WHERE elementId(dup) IN $duplicateElementIds
             MATCH (canonical:${group.label})
             WHERE elementId(canonical) = $bestElementId
             WITH canonical, r, target, type(r) as relType, properties(r) as relProps
             CALL {
               WITH canonical, target, relType, relProps
               CREATE (canonical)-[newRel:MIGRATED_REL]->(target)
               SET newRel = relProps
               RETURN newRel
             }
             DELETE r
             RETURN count(*) as migrated`,
            { duplicateElementIds, bestElementId }
          );
        });

        const inCount = incomingResult.records[0]?.get('migrated');
        const outCount = outgoingResult.records[0]?.get('migrated');
        // Convert Neo4j integers to JS numbers (handles BigInt)
        const toNum = (v: any) => {
          if (v === null || v === undefined) return 0;
          if (typeof v === 'bigint') return Number(v);
          if (typeof v?.toNumber === 'function') return v.toNumber();
          return Number(v) || 0;
        };
        migratedRelationships = toNum(inCount) + toNum(outCount);

        // Step 3: Move duplicate nodes to archive graph
        await session.executeWrite(async (tx: any) => {
          return tx.run(
            `MATCH (n:${group.label})
             WHERE elementId(n) IN $duplicateElementIds
             SET n.graphId = $archiveGraphId,
                 n.graph_id = $archiveGraphId,
                 n.archived_from = $graphId,
                 n.archived_at = datetime(),
                 n.archived_reason = 'duplicate_cleanup',
                 n.original_canonical_id = $canonicalId,
                 n.kept_element_id = $bestElementId
             RETURN count(*) as archived`,
            { duplicateElementIds, graphId, archiveGraphId, canonicalId: group.canonicalId, bestElementId }
          );
        });
      }

      results.push({
        label: group.label,
        canonicalId: group.canonicalId,
        keptNodeId: `${nodeId} (${bestElementId})`,
        archivedNodeIds: duplicateElementIds,
        migratedRelationships,
      });
    }
  }

  return results;
}

// GET endpoint for checking current state
export async function GET(request: NextRequest) {
  // Extract Bearer token (supports both gk_* API keys and OAuth JWTs)
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const userResult = await resolveUserId(token);

  if ('error' in userResult) {
    return NextResponse.json(
      { error: userResult.error },
      { status: 401 }
    );
  }

  // Check admin access
  if (!ADMIN_USER_IDS.includes(userResult.userId)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const graphId = searchParams.get('graphId');
  const diagnose = searchParams.get('diagnose') === 'true';
  const sampleId = searchParams.get('sampleId'); // Get details for specific ID

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
    // Diagnostic mode: return detailed duplicate info with dates
    if (diagnose) {
      const diagnosticInfo = await diagnoseDuplicates(session, graphId, sampleId || undefined);
      return NextResponse.json({
        mode: 'diagnostic',
        graphId,
        sampleId: sampleId || null,
        duplicates: diagnosticInfo,
        message: sampleId
          ? `Found ${diagnosticInfo.length} nodes with id="${sampleId}"`
          : `Top 10 duplicate groups with sample node details`,
      });
    }

    const malformed: { label: string; id: string; title: string | null }[] = [];
    const labels = ['Sprint', 'Task', 'Epic'];

    for (const label of labels) {
      const queryResult = await session.executeRead(async (tx) => {
        return tx.run(
          `MATCH (n:${label})
           WHERE n.graphId = $graphId OR n.graph_id = $graphId
           RETURN n.id as id, n.title as title, n.name as name`,
          { graphId }
        );
      });

      for (const record of queryResult.records) {
        const id = record.get('id');
        const title = record.get('title') || record.get('name');

        if (isMalformedTitle(title)) {
          malformed.push({ label, id, title });
        }
      }
    }

    const duplicates = await findDuplicates(session, graphId);

    return NextResponse.json({
      malformedCount: malformed.length,
      malformed,
      duplicates,
      message: `Found ${malformed.length} malformed titles and ${duplicates.length} duplicate groups`,
    });

  } finally {
    await session.close();
  }
}
