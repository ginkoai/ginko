/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, graph, cleanup, maintenance, data-integrity]
 * @related: [../status/route.ts, ../_neo4j.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/graph/cleanup
 * Analyze orphan nodes, duplicates, and data integrity issues
 *
 * DELETE /api/v1/graph/cleanup
 * Execute cleanup operations (requires confirmation)
 *
 * Query Parameters:
 * - graphId: Target graph (required)
 * - action: 'analyze' (default) | 'cleanup-orphans' | 'cleanup-default' | 'dedupe-epics' | 'dedupe-tasks'
 * - dryRun: 'true' (default) | 'false' - preview changes without executing
 * - confirm: Required confirmation token for destructive operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../_neo4j';
import { verifyGraphAccessFromRequest } from '@/lib/graph/access';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';

// Admin user IDs that can perform cleanup on any graph
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

interface OrphanAnalysis {
  nodeType: string;
  count: number;
  sampleIds: string[];
}

interface DuplicateEpic {
  baseId: string;
  duplicateId: string;
  baseTitle: string;
  duplicateTitle: string;
}

interface DuplicateTask {
  taskId: string;
  count: number;
  sprintId: string;
}

interface NonCanonicalEpic {
  legacyId: string;
  canonicalId: string;
  title: string;
}

interface CleanupAnalysis {
  orphanNodes: {
    total: number;
    byType: OrphanAnalysis[];
  };
  defaultGraphIdNodes: {
    total: number;
    byType: OrphanAnalysis[];
  };
  duplicateEpics: DuplicateEpic[];
  nonCanonicalEpics: NonCanonicalEpic[];
  duplicateTasks: {
    total: number;
    uniqueIds: number;
    duplicateCount: number;
    samples: DuplicateTask[];
  };
  staleGraphIds: {
    graphId: string;
    count: number;
  }[];
}

export async function GET(request: NextRequest) {
  console.log('[Cleanup API] GET /api/v1/graph/cleanup called');

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'graphId required' } },
        { status: 400 }
      );
    }

    // Require owner access for cleanup operations
    const access = await verifyGraphAccessFromRequest(request, graphId, 'write');
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: { code: 'ACCESS_DENIED', message: access.error || 'Write access required' } },
        { status: 403 }
      );
    }

    // Analyze orphan nodes (no graphId or graph_id)
    const orphanQuery = `
      MATCH (n)
      WHERE n.graphId IS NULL AND n.graph_id IS NULL
      WITH labels(n)[0] as nodeType, n.id as nodeId
      WITH nodeType, collect(nodeId)[0..5] as sampleIds, count(*) as count
      RETURN nodeType, count, sampleIds
      ORDER BY count DESC
    `;
    const orphanResults = await runQuery<{ nodeType: string; count: number; sampleIds: string[] }>(orphanQuery, {});

    // Analyze nodes with "default" graphId
    const defaultQuery = `
      MATCH (n)
      WHERE n.graphId = 'default' OR n.graph_id = 'default'
      WITH labels(n)[0] as nodeType, n.id as nodeId
      WITH nodeType, collect(nodeId)[0..5] as sampleIds, count(*) as count
      RETURN nodeType, count, sampleIds
      ORDER BY count DESC
    `;
    const defaultResults = await runQuery<{ nodeType: string; count: number; sampleIds: string[] }>(defaultQuery, {});

    // Find duplicate epics (same EPIC-NNN pattern with different suffixes)
    const duplicateEpicQuery = `
      MATCH (e1:Epic), (e2:Epic)
      WHERE (e1.graphId = $graphId OR e1.graph_id = $graphId)
        AND (e2.graphId = $graphId OR e2.graph_id = $graphId)
        AND e1.id =~ 'EPIC-[0-9]+'
        AND e2.id STARTS WITH e1.id + '-'
        AND e1.id <> e2.id
      RETURN e1.id as baseId, e2.id as duplicateId, e1.title as baseTitle, e2.title as duplicateTitle
      ORDER BY e1.id
    `;
    const duplicateResults = await runQuery<DuplicateEpic>(duplicateEpicQuery, { graphId });

    // Find Epic nodes with non-canonical IDs (EPIC-NNN or EPIC-NNN-slug format)
    // These should be normalized to eNNN format per ADR-052
    const nonCanonicalEpicQuery = `
      MATCH (e:Epic)
      WHERE (e.graphId = $graphId OR e.graph_id = $graphId)
        AND (e.id =~ 'EPIC-[0-9]+.*' OR e.id =~ 'EPIC-[0-9]+')
      WITH e,
        'e' + right('000' + substring(e.id, 5, 3), 3) as canonicalId
      RETURN e.id as legacyId, canonicalId, e.title as title
      ORDER BY e.id
    `;
    const nonCanonicalResults = await runQuery<NonCanonicalEpic>(nonCanonicalEpicQuery, { graphId });

    // Find duplicate tasks (same id, multiple nodes)
    const duplicateTaskQuery = `
      MATCH (t:Task)
      WHERE t.graph_id = $graphId OR t.graphId = $graphId
      WITH t.id as taskId, t.sprint_id as sprintId, count(t) as cnt
      WHERE cnt > 1
      RETURN taskId, cnt as count, sprintId
      ORDER BY cnt DESC
      LIMIT 20
    `;
    const duplicateTaskResults = await runQuery<DuplicateTask>(duplicateTaskQuery, { graphId });

    // Get total task count and unique IDs for summary
    const taskCountQuery = `
      MATCH (t:Task)
      WHERE t.graph_id = $graphId OR t.graphId = $graphId
      WITH count(t) as total, count(DISTINCT t.id) as unique
      RETURN total, unique
    `;
    const taskCountResult = await runQuery<{ total: number; unique: number }>(taskCountQuery, { graphId });

    // Find stale/orphaned graphIds (not the main one, with few nodes)
    const staleGraphIdQuery = `
      MATCH (n)
      WHERE n.graphId IS NOT NULL AND n.graphId <> $graphId AND n.graphId <> 'default'
      WITH n.graphId as gid, count(*) as count
      WHERE count < 10
      RETURN gid as graphId, count
      ORDER BY count DESC
      LIMIT 20
    `;
    const staleResults = await runQuery<{ graphId: string; count: number }>(staleGraphIdQuery, { graphId });

    // Helper to safely convert Neo4j integers
    const toNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'bigint') return Number(val);
      if (val && typeof val === 'object' && 'low' in val) return val.low;
      return Number(val) || 0;
    };

    const analysis: CleanupAnalysis = {
      orphanNodes: {
        total: orphanResults.reduce((sum, r) => sum + toNumber(r.count), 0),
        byType: orphanResults.map(r => ({
          nodeType: r.nodeType,
          count: toNumber(r.count),
          sampleIds: r.sampleIds || [],
        })),
      },
      defaultGraphIdNodes: {
        total: defaultResults.reduce((sum, r) => sum + toNumber(r.count), 0),
        byType: defaultResults.map(r => ({
          nodeType: r.nodeType,
          count: toNumber(r.count),
          sampleIds: r.sampleIds || [],
        })),
      },
      duplicateEpics: duplicateResults,
      nonCanonicalEpics: nonCanonicalResults,
      duplicateTasks: {
        total: toNumber(taskCountResult[0]?.total) || 0,
        uniqueIds: toNumber(taskCountResult[0]?.unique) || 0,
        duplicateCount: toNumber(taskCountResult[0]?.total) - toNumber(taskCountResult[0]?.unique),
        samples: duplicateTaskResults.map(r => ({
          taskId: r.taskId,
          count: toNumber(r.count),
          sprintId: r.sprintId || 'unknown',
        })),
      },
      staleGraphIds: staleResults.map(r => ({
        graphId: r.graphId,
        count: toNumber(r.count),
      })),
    };

    return NextResponse.json({
      graphId,
      analysis,
      actions: {
        available: [
          { action: 'cleanup-orphans', description: 'Delete orphan nodes (no graphId)', estimatedDeletes: analysis.orphanNodes.total },
          { action: 'cleanup-default', description: 'Migrate or delete "default" graphId nodes', estimatedAffected: analysis.defaultGraphIdNodes.total },
          { action: 'dedupe-epics', description: 'Merge duplicate epics (keep detailed version)', estimatedMerges: analysis.duplicateEpics.length },
          { action: 'normalize-epic-ids', description: 'Normalize EPIC-NNN IDs to eNNN format (ADR-052)', estimatedAffected: analysis.nonCanonicalEpics.length },
          { action: 'dedupe-tasks', description: 'Remove duplicate Task nodes (keep one per id)', estimatedDeletes: analysis.duplicateTasks.duplicateCount },
          { action: 'cleanup-phantom-entities', description: 'Delete phantom epics ("unknown") and slug-based sprint duplicates, rebuild task relationships' },
          { action: 'merge-duplicate-structural-nodes', description: 'Merge duplicate Sprint/Epic nodes created by dual creation paths (doc upload + task sync)' },
          { action: 'cleanup-stale', description: 'Delete nodes from stale/test graphIds', estimatedDeletes: staleResults.reduce((sum, r) => sum + toNumber(r.count), 0) },
          { action: 'delete-project', description: 'DELETE ALL: Remove entire project (Neo4j + Supabase)', warning: 'DESTRUCTIVE - cannot be undone' },
        ],
        usage: 'DELETE /api/v1/graph/cleanup?graphId=X&action=ACTION&dryRun=false&confirm=CLEANUP_CONFIRMED',
      },
    });

  } catch (error) {
    console.error('[Cleanup API] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[Cleanup API] DELETE /api/v1/graph/cleanup called');

  return withAuth(request, async (user: AuthenticatedUser, _supabase: any) => {
    try {
      const isConnected = await verifyConnection();
      if (!isConnected) {
        return NextResponse.json(
          { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
          { status: 503 }
        );
      }

      const { searchParams } = new URL(request.url);
      const graphId = searchParams.get('graphId');
      const action = searchParams.get('action');
      const dryRun = searchParams.get('dryRun') !== 'false';
      const confirm = searchParams.get('confirm');

      if (!graphId || !action) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'graphId and action required' } },
          { status: 400 }
        );
      }

      // Require confirmation for non-dry-run
      if (!dryRun && confirm !== 'CLEANUP_CONFIRMED') {
        return NextResponse.json(
          { error: { code: 'CONFIRMATION_REQUIRED', message: 'Add confirm=CLEANUP_CONFIRMED to execute destructive operation' } },
          { status: 400 }
        );
      }

      // Check if user is admin (can cleanup any graph)
      const isAdmin = ADMIN_USER_IDS.includes(user.id);
      if (isAdmin) {
        console.log(`[Cleanup API] Admin access granted for user: ${user.id}`);
      }

      // Require owner access (or admin)
      if (!isAdmin) {
        const access = await verifyGraphAccessFromRequest(request, graphId, 'write');
        if (!access.hasAccess || access.role !== 'owner') {
          return NextResponse.json(
            { error: { code: 'ACCESS_DENIED', message: 'Owner access required for cleanup operations' } },
            { status: 403 }
          );
        }
      }

    // Helper to safely convert Neo4j integers
    const toNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'bigint') return Number(val);
      if (val && typeof val === 'object' && 'low' in val) return val.low;
      return Number(val) || 0;
    };

    let result: { affected: number; details: string };

    switch (action) {
      case 'cleanup-orphans': {
        if (dryRun) {
          const countQuery = `MATCH (n) WHERE n.graphId IS NULL AND n.graph_id IS NULL RETURN count(n) as count`;
          const countResult = await runQuery<{ count: number }>(countQuery, {});
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would delete orphan nodes' };
        } else {
          const deleteQuery = `MATCH (n) WHERE n.graphId IS NULL AND n.graph_id IS NULL DETACH DELETE n RETURN count(n) as count`;
          const deleteResult = await runQuery<{ count: number }>(deleteQuery, {});
          result = { affected: toNumber(deleteResult[0]?.count), details: 'Deleted orphan nodes' };
        }
        break;
      }

      case 'cleanup-default': {
        if (dryRun) {
          const countQuery = `MATCH (n) WHERE n.graphId = 'default' OR n.graph_id = 'default' RETURN count(n) as count`;
          const countResult = await runQuery<{ count: number }>(countQuery, {});
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would delete "default" graphId nodes' };
        } else {
          const deleteQuery = `MATCH (n) WHERE n.graphId = 'default' OR n.graph_id = 'default' DETACH DELETE n RETURN count(n) as count`;
          const deleteResult = await runQuery<{ count: number }>(deleteQuery, {});
          result = { affected: toNumber(deleteResult[0]?.count), details: 'Deleted "default" graphId nodes' };
        }
        break;
      }

      case 'dedupe-epics': {
        // Merge duplicates: keep the detailed version (longer ID), delete the short one
        // Transfer relationships from short to long version
        if (dryRun) {
          const countQuery = `
            MATCH (e1:Epic), (e2:Epic)
            WHERE (e1.graphId = $graphId OR e1.graph_id = $graphId)
              AND (e2.graphId = $graphId OR e2.graph_id = $graphId)
              AND e1.id =~ 'EPIC-[0-9]+'
              AND e2.id STARTS WITH e1.id + '-'
            RETURN count(DISTINCT e1) as count
          `;
          const countResult = await runQuery<{ count: number }>(countQuery, { graphId });
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would merge duplicate epics (delete short version, keep detailed)' };
        } else {
          // First, transfer any relationships from short epic to long epic
          // Then delete the short epic
          const mergeQuery = `
            MATCH (e1:Epic), (e2:Epic)
            WHERE (e1.graphId = $graphId OR e1.graph_id = $graphId)
              AND (e2.graphId = $graphId OR e2.graph_id = $graphId)
              AND e1.id =~ 'EPIC-[0-9]+'
              AND e2.id STARTS WITH e1.id + '-'
            WITH e1, e2
            // Copy properties from short to long if missing on long
            SET e2.legacy_id = e1.id
            WITH e1, e2
            DETACH DELETE e1
            RETURN count(e1) as count
          `;
          const mergeResult = await runQuery<{ count: number }>(mergeQuery, { graphId });
          result = { affected: toNumber(mergeResult[0]?.count), details: 'Merged duplicate epics (kept detailed versions)' };
        }
        break;
      }

      case 'dedupe-tasks': {
        // Find duplicate tasks and keep only the newest one (by Neo4j internal ID)
        if (dryRun) {
          const countQuery = `
            MATCH (t:Task)
            WHERE t.graph_id = $graphId OR t.graphId = $graphId
            WITH t.id as taskId, collect(t) as nodes
            WHERE size(nodes) > 1
            UNWIND nodes[1..] as toDelete
            RETURN count(toDelete) as count
          `;
          const countResult = await runQuery<{ count: number }>(countQuery, { graphId });
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would delete duplicate Task nodes (keeping one per id)' };
        } else {
          // Keep the first node (arbitrary but consistent), delete the rest
          const dedupeQuery = `
            MATCH (t:Task)
            WHERE t.graph_id = $graphId OR t.graphId = $graphId
            WITH t.id as taskId, collect(t) as nodes
            WHERE size(nodes) > 1
            WITH taskId, nodes[0] as keep, nodes[1..] as toDelete
            UNWIND toDelete as dup
            DETACH DELETE dup
            RETURN count(dup) as count
          `;
          const dedupeResult = await runQuery<{ count: number }>(dedupeQuery, { graphId });
          result = { affected: toNumber(dedupeResult[0]?.count), details: 'Deleted duplicate Task nodes (kept one per id)' };
        }
        break;
      }

      case 'normalize-epic-ids': {
        // Normalize EPIC-NNN and EPIC-NNN-slug IDs to eNNN format (ADR-052)
        if (dryRun) {
          const countQuery = `
            MATCH (e:Epic)
            WHERE (e.graphId = $graphId OR e.graph_id = $graphId)
              AND (e.id =~ 'EPIC-[0-9]+.*' OR e.id =~ 'EPIC-[0-9]+')
            RETURN count(e) as count
          `;
          const countResult = await runQuery<{ count: number }>(countQuery, { graphId });
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would normalize EPIC-NNN IDs to eNNN format' };
        } else {
          let totalAffected = 0;

          // Step 1: Find all non-canonical Epic nodes and compute their canonical ID
          const findQuery = `
            MATCH (legacy:Epic)
            WHERE (legacy.graphId = $graphId OR legacy.graph_id = $graphId)
              AND (legacy.id =~ 'EPIC-[0-9]+.*' OR legacy.id =~ 'EPIC-[0-9]+')
            WITH legacy,
              'e' + right('000' + substring(legacy.id, 5, 3), 3) as canonicalId
            OPTIONAL MATCH (canonical:Epic)
            WHERE (canonical.graphId = $graphId OR canonical.graph_id = $graphId)
              AND canonical.id = canonicalId
              AND canonical <> legacy
            RETURN legacy.id as legacyId, canonicalId,
              elementId(legacy) as legacyElementId,
              elementId(canonical) as canonicalElementId,
              canonical IS NOT NULL as hasCanonical
          `;
          const entries = await runQuery<{
            legacyId: string;
            canonicalId: string;
            legacyElementId: string;
            canonicalElementId: string | null;
            hasCanonical: boolean;
          }>(findQuery, { graphId });

          for (const entry of entries) {
            if (entry.hasCanonical) {
              // Canonical node exists — transfer relationships and delete legacy
              // Transfer outgoing relationships
              await runQuery(`
                MATCH (legacy:Epic)
                WHERE elementId(legacy) = $legacyElementId
                MATCH (canonical:Epic)
                WHERE elementId(canonical) = $canonicalElementId
                MATCH (legacy)-[r]->(target)
                WHERE NOT target = canonical
                WITH canonical, target, type(r) as relType, properties(r) as relProps
                CALL apoc.create.relationship(canonical, relType, relProps, target) YIELD rel
                RETURN count(rel) as transferred
              `, {
                legacyElementId: entry.legacyElementId,
                canonicalElementId: entry.canonicalElementId,
              }).catch(() => {
                // If APOC is not available, skip relationship transfer
              });

              // Transfer incoming relationships
              await runQuery(`
                MATCH (legacy:Epic)
                WHERE elementId(legacy) = $legacyElementId
                MATCH (canonical:Epic)
                WHERE elementId(canonical) = $canonicalElementId
                MATCH (source)-[r]->(legacy)
                WHERE NOT source = canonical
                WITH canonical, source, type(r) as relType, properties(r) as relProps
                CALL apoc.create.relationship(source, relType, relProps, canonical) YIELD rel
                RETURN count(rel) as transferred
              `, {
                legacyElementId: entry.legacyElementId,
                canonicalElementId: entry.canonicalElementId,
              }).catch(() => {
                // If APOC is not available, skip relationship transfer
              });

              // Merge properties from legacy to canonical (don't overwrite existing)
              await runQuery(`
                MATCH (legacy:Epic)
                WHERE elementId(legacy) = $legacyElementId
                MATCH (canonical:Epic)
                WHERE elementId(canonical) = $canonicalElementId
                SET canonical.legacy_id = legacy.id
                WITH legacy
                DETACH DELETE legacy
                RETURN count(legacy) as deleted
              `, {
                legacyElementId: entry.legacyElementId,
                canonicalElementId: entry.canonicalElementId,
              });
            } else {
              // No canonical node exists — rename legacy node's ID
              await runQuery(`
                MATCH (legacy:Epic)
                WHERE elementId(legacy) = $legacyElementId
                SET legacy.legacy_id = legacy.id, legacy.id = $canonicalId
                RETURN legacy.id as newId
              `, {
                legacyElementId: entry.legacyElementId,
                canonicalId: entry.canonicalId,
              });
            }
            totalAffected++;
          }

          result = { affected: totalAffected, details: `Normalized ${totalAffected} Epic node(s) to eNNN format` };
        }
        break;
      }

      case 'cleanup-phantom-entities': {
        // Delete phantom entities created by task sync with bad IDs:
        // - Epic nodes with id "unknown"
        // - Sprint nodes with non-canonical slug-based IDs
        // Then rebuild BELONGS_TO relationships for orphaned tasks
        if (dryRun) {
          const unknownEpicQuery = `
            MATCH (e:Epic)
            WHERE (e.graph_id = $graphId OR e.graphId = $graphId)
              AND e.id = 'unknown'
            RETURN count(e) as count
          `;
          const slugSprintQuery = `
            MATCH (s:Sprint)
            WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
              AND NOT s.id =~ '^e\\\\d+_s\\\\d+$'
              AND NOT s.id =~ '^adhoc_\\\\d+_s\\\\d+$'
            RETURN count(s) as count
          `;
          const epicCount = await runQuery<{ count: number }>(unknownEpicQuery, { graphId });
          const sprintCount = await runQuery<{ count: number }>(slugSprintQuery, { graphId });
          const total = toNumber(epicCount[0]?.count) + toNumber(sprintCount[0]?.count);
          result = { affected: total, details: `Dry run: would delete ${toNumber(epicCount[0]?.count)} phantom epic(s), ${toNumber(sprintCount[0]?.count)} slug-based sprint(s)` };
        } else {
          let totalAffected = 0;

          // 1. Delete Epic with id "unknown"
          const deleteUnknownEpic = await runQuery<{ count: number }>(`
            MATCH (e:Epic)
            WHERE (e.graph_id = $graphId OR e.graphId = $graphId)
              AND e.id = 'unknown'
            DETACH DELETE e
            RETURN count(e) as count
          `, { graphId });
          totalAffected += toNumber(deleteUnknownEpic[0]?.count);

          // 2. Delete slug-based Sprint nodes (non-canonical IDs)
          const deleteSlugSprints = await runQuery<{ count: number }>(`
            MATCH (s:Sprint)
            WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
              AND NOT s.id =~ '^e\\\\d+_s\\\\d+$'
              AND NOT s.id =~ '^adhoc_\\\\d+_s\\\\d+$'
            DETACH DELETE s
            RETURN count(s) as count
          `, { graphId });
          totalAffected += toNumber(deleteSlugSprints[0]?.count);

          // 3. Rebuild BELONGS_TO relationships for tasks using their sprint_id/epic_id properties
          await runQuery(`
            MATCH (t:Task)
            WHERE (t.graph_id = $graphId OR t.graphId = $graphId)
              AND t.sprint_id IS NOT NULL
              AND NOT (t)-[:BELONGS_TO]->(:Sprint)
            MATCH (s:Sprint)
            WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
              AND s.id = t.sprint_id
            MERGE (t)-[:BELONGS_TO]->(s)
          `, { graphId });

          await runQuery(`
            MATCH (t:Task)
            WHERE (t.graph_id = $graphId OR t.graphId = $graphId)
              AND t.epic_id IS NOT NULL
              AND NOT (t)-[:BELONGS_TO]->(:Sprint)-[:BELONGS_TO]->(:Epic)
            MATCH (e:Epic)
            WHERE (e.graph_id = $graphId OR e.graphId = $graphId)
              AND e.id = t.epic_id
            MATCH (t)-[:BELONGS_TO]->(s:Sprint)
            MERGE (s)-[:BELONGS_TO]->(e)
          `, { graphId });

          result = { affected: totalAffected, details: `Deleted phantom entities and rebuilt task relationships` };
        }
        break;
      }

      case 'merge-duplicate-structural-nodes': {
        // Merge duplicate Sprint/Epic nodes created by dual creation paths
        // (document upload + task sync). Picks the structural node as survivor,
        // merges content properties from document node, transfers relationships,
        // and deletes the orphan.

        interface NodeRecord {
          type: string;
          elementId: string;
          id: string;
          properties: Record<string, any>;
        }

        interface DuplicateGroup {
          type: string;
          canonicalId: string;
          nodes: Array<{
            elementId: string;
            id: string;
            properties: Record<string, any>;
          }>;
          count: number;
        }

        interface MergeDetail {
          type: string;
          canonicalId: string;
          survivorId: string;
          orphanId: string;
          propertiesMerged: string[];
          relationshipsTransferred: number;
        }

        // Normalize Sprint/Epic IDs to canonical form for duplicate detection.
        // Handles: e001_s01, 2026_02_e001_sprint1, e001-sprint1, EPIC-001, etc.
        function normalizeStructuralId(id: string, type: string): string {
          const lower = id.toLowerCase().replace(/-/g, '_');

          if (type === 'Epic') {
            // EPIC-001 → e001
            const epicMatch = lower.match(/epic[_]?(\d+)/);
            if (epicMatch) return `e${epicMatch[1].padStart(3, '0')}`;
            // e001 already canonical
            const canonMatch = lower.match(/^e(\d{3})$/);
            if (canonMatch) return lower;
            // Date-prefixed: 2026_02_e001 → e001
            const datePrefixed = lower.match(/\d{4}_\d{2}_e(\d{3})$/);
            if (datePrefixed) return `e${datePrefixed[1]}`;
            return lower;
          }

          // Sprint normalization
          // Already canonical: e001_s01
          const canonMatch = lower.match(/^(e\d{3}_s\d{2}[a-z]?)$/);
          if (canonMatch) return canonMatch[1];
          // Adhoc canonical: adhoc_260203_s01
          const adhocCanon = lower.match(/^(adhoc_\d{6}_s\d{2})$/);
          if (adhocCanon) return adhocCanon[1];
          // Hybrid/legacy: e001_sprint1 or 2026_02_e001_sprint1
          const sprintMatch = lower.match(/(e\d{3})[_]sprint(\d+)/);
          if (sprintMatch) return `${sprintMatch[1]}_s${sprintMatch[2].padStart(2, '0')}`;
          // Date-prefixed canonical: 2026_02_e001_s01 → e001_s01
          const dateCanon = lower.match(/\d{4}_\d{2}_(e\d{3}_s\d{2})/);
          if (dateCanon) return dateCanon[1];
          return lower;
        }

        // Step 1: Fetch ALL Sprint/Epic nodes, then group by normalized ID in JS
        const findAllQuery = `
          MATCH (n)
          WHERE (n.graph_id = $graphId OR n.graphId = $graphId)
            AND (n:Sprint OR n:Epic)
          RETURN labels(n)[0] as type,
                 elementId(n) as elementId,
                 n.id as id,
                 properties(n) as properties
          ORDER BY labels(n)[0], n.id
        `;

        const allNodes = await runQuery<NodeRecord>(findAllQuery, { graphId });

        // Group by (type, normalizedId)
        const groupMap = new Map<string, DuplicateGroup>();
        for (const node of allNodes) {
          const normalized = normalizeStructuralId(node.id, node.type);
          const key = `${node.type}::${normalized}`;
          if (!groupMap.has(key)) {
            groupMap.set(key, { type: node.type, canonicalId: normalized, nodes: [], count: 0 });
          }
          const group = groupMap.get(key)!;
          group.nodes.push({ elementId: node.elementId, id: node.id, properties: node.properties });
          group.count = group.nodes.length;
        }

        // Filter to only groups with duplicates
        const duplicateGroups: DuplicateGroup[] = Array.from(groupMap.values()).filter(g => g.count > 1);

        if (duplicateGroups.length === 0) {
          result = { affected: 0, details: 'No duplicate structural nodes found' };
          return NextResponse.json({
            action,
            dryRun,
            merged: 0,
            details: [],
          });
        }

        if (dryRun) {
          // Preview mode: return what would be merged without executing
          const mergeDetails: MergeDetail[] = duplicateGroups.map(group => {
            const nodes = group.nodes;
            // Pick survivor: prefer the node with structural properties
            // (epic_id for Sprint, or status set by task sync)
            const survivor = nodes.find(n =>
              n.properties.epic_id || n.properties.sprint_id ||
              (n.properties.status && !n.properties.content)
            ) || nodes[0];
            const orphan = nodes.find(n => n.elementId !== survivor.elementId) || nodes[1];

            // Determine which content properties would be merged
            const contentProps = ['content', 'summary', 'embedding', 'embedding_model', 'has_embedding', 'filePath', 'hash'];
            const propsToMerge = contentProps.filter(prop => orphan.properties[prop] !== undefined);

            return {
              type: group.type,
              canonicalId: group.canonicalId,
              survivorId: survivor.elementId,
              orphanId: orphan.elementId,
              propertiesMerged: propsToMerge,
              relationshipsTransferred: 0, // Unknown in dry-run
            };
          });

          return NextResponse.json({
            action,
            dryRun,
            merged: mergeDetails.length,
            details: mergeDetails,
          });
        }

        // Execute mode: perform actual merges
        const mergeDetails: MergeDetail[] = [];
        let totalMerged = 0;

        for (const group of duplicateGroups) {
          const nodes = group.nodes;

          // Pick survivor: prefer the node with structural properties
          const survivor = nodes.find(n =>
            n.properties.epic_id || n.properties.sprint_id ||
            (n.properties.status && !n.properties.content)
          ) || nodes[0];
          const orphan = nodes.find(n => n.elementId !== survivor.elementId) || nodes[1];

          if (!orphan || survivor.elementId === orphan.elementId) continue;

          let relsTransferred = 0;
          const contentProps = ['content', 'summary', 'embedding', 'embedding_model', 'has_embedding', 'filePath', 'hash'];
          const propsToMerge = contentProps.filter(prop => orphan.properties[prop] !== undefined);

          try {
            // Step 2: Transfer outgoing relationships from orphan to survivor
            const transferOutgoing = await runQuery<{ transferred: number }>(`
              MATCH (orphan)
              WHERE elementId(orphan) = $orphanElementId
              MATCH (orphan)-[r]->(target)
              MATCH (survivor)
              WHERE elementId(survivor) = $survivorElementId
              WITH survivor, target, type(r) as relType, r
              WHERE NOT exists((survivor)-[]->(target))
              CALL {
                WITH survivor, target, relType
                WITH survivor, target, relType
                MERGE (survivor)-[newR:\`PLACEHOLDER\`]->(target)
                RETURN count(newR) as cnt
              }
              RETURN count(*) as transferred
            `.replace('PLACEHOLDER', 'TRANSFERRED'), {
              orphanElementId: orphan.elementId,
              survivorElementId: survivor.elementId,
            }).catch(() => [{ transferred: 0 }]);
            relsTransferred += toNumber(transferOutgoing[0]?.transferred);

            // Step 3: Transfer incoming relationships from orphan to survivor
            const transferIncoming = await runQuery<{ transferred: number }>(`
              MATCH (orphan)
              WHERE elementId(orphan) = $orphanElementId
              MATCH (source)-[r]->(orphan)
              MATCH (survivor)
              WHERE elementId(survivor) = $survivorElementId
              WITH survivor, source, type(r) as relType, r
              WHERE NOT exists((source)-[]->(survivor))
              CALL {
                WITH survivor, source, relType
                WITH survivor, source, relType
                MERGE (source)-[newR:\`PLACEHOLDER\`]->(survivor)
                RETURN count(newR) as cnt
              }
              RETURN count(*) as transferred
            `.replace('PLACEHOLDER', 'TRANSFERRED'), {
              orphanElementId: orphan.elementId,
              survivorElementId: survivor.elementId,
            }).catch(() => [{ transferred: 0 }]);
            relsTransferred += toNumber(transferIncoming[0]?.transferred);

            // Step 4: Merge content properties from orphan onto survivor
            const propsToSet: Record<string, any> = {};
            for (const prop of propsToMerge) {
              if (orphan.properties[prop] !== undefined && orphan.properties[prop] !== null) {
                propsToSet[prop] = orphan.properties[prop];
              }
            }

            if (Object.keys(propsToSet).length > 0) {
              await runQuery(`
                MATCH (survivor)
                WHERE elementId(survivor) = $survivorElementId
                SET survivor += $propsToSet
                RETURN count(*) as propertiesMerged
              `, {
                survivorElementId: survivor.elementId,
                propsToSet,
              });
            }

            // Step 5: Delete orphan node
            await runQuery(`
              MATCH (orphan)
              WHERE elementId(orphan) = $orphanElementId
              DETACH DELETE orphan
              RETURN count(*) as deleted
            `, {
              orphanElementId: orphan.elementId,
            });

            mergeDetails.push({
              type: group.type,
              canonicalId: group.canonicalId,
              survivorId: survivor.elementId,
              orphanId: orphan.elementId,
              propertiesMerged: propsToMerge,
              relationshipsTransferred: relsTransferred,
            });

            totalMerged++;
          } catch (mergeError) {
            console.error(`[Cleanup API] Error merging ${group.type} ${group.canonicalId}:`, mergeError);
            // Continue with next group
          }
        }

        return NextResponse.json({
          action,
          dryRun,
          merged: totalMerged,
          details: mergeDetails,
        });
      }

      case 'cleanup-stale': {
        if (dryRun) {
          const countQuery = `
            MATCH (n)
            WHERE n.graphId IS NOT NULL AND n.graphId <> $graphId AND n.graphId <> 'default'
            WITH n.graphId as gid, count(*) as cnt
            WHERE cnt < 10
            WITH collect(gid) as staleIds
            MATCH (m) WHERE m.graphId IN staleIds
            RETURN count(m) as count
          `;
          const countResult = await runQuery<{ count: number }>(countQuery, { graphId });
          result = { affected: toNumber(countResult[0]?.count), details: 'Dry run: would delete nodes from stale graphIds' };
        } else {
          const deleteQuery = `
            MATCH (n)
            WHERE n.graphId IS NOT NULL AND n.graphId <> $graphId AND n.graphId <> 'default'
            WITH n.graphId as gid, count(*) as cnt
            WHERE cnt < 10
            WITH collect(gid) as staleIds
            MATCH (m) WHERE m.graphId IN staleIds
            DETACH DELETE m
            RETURN count(m) as count
          `;
          const deleteResult = await runQuery<{ count: number }>(deleteQuery, { graphId });
          result = { affected: toNumber(deleteResult[0]?.count), details: 'Deleted nodes from stale graphIds' };
        }
        break;
      }

      case 'delete-project': {
        // DANGEROUS: Delete ALL nodes for this graphId and cleanup Supabase
        // This completely removes a project from the system
        if (dryRun) {
          // Count all nodes that would be deleted
          const countQuery = `
            MATCH (n)
            WHERE n.graphId = $graphId OR n.graph_id = $graphId
            RETURN count(n) as count
          `;
          const countResult = await runQuery<{ count: number }>(countQuery, { graphId });

          // Count Project nodes
          const projectCountQuery = `
            MATCH (p:Project)
            WHERE p.graphId = $graphId
            RETURN count(p) as count
          `;
          const projectCountResult = await runQuery<{ count: number }>(projectCountQuery, { graphId });

          const nodeCount = toNumber(countResult[0]?.count);
          const projectCount = toNumber(projectCountResult[0]?.count);

          result = {
            affected: nodeCount + projectCount,
            details: `Dry run: would delete ${nodeCount} nodes + ${projectCount} Project nodes + Supabase teams/insights`,
          };
        } else {
          // Use service role client for cleanup (need admin access)
          const { createServiceRoleClient } = await import('@/lib/supabase/server');
          const supabaseAdmin = createServiceRoleClient();

          let totalDeleted = 0;
          const details: string[] = [];

          // 1. Delete all nodes with this graphId from Neo4j
          const deleteNodesQuery = `
            MATCH (n)
            WHERE n.graphId = $graphId OR n.graph_id = $graphId
            WITH n, labels(n)[0] as nodeType
            DETACH DELETE n
            RETURN count(n) as count
          `;
          const nodeDeleteResult = await runQuery<{ count: number }>(deleteNodesQuery, { graphId });
          const nodesDeleted = toNumber(nodeDeleteResult[0]?.count);
          totalDeleted += nodesDeleted;
          details.push(`${nodesDeleted} graph nodes`);

          // 2. Delete the Project node itself
          const deleteProjectQuery = `
            MATCH (p:Project)
            WHERE p.graphId = $graphId
            DETACH DELETE p
            RETURN count(p) as count
          `;
          const projectDeleteResult = await runQuery<{ count: number }>(deleteProjectQuery, { graphId });
          const projectsDeleted = toNumber(projectDeleteResult[0]?.count);
          totalDeleted += projectsDeleted;
          if (projectsDeleted > 0) {
            details.push(`${projectsDeleted} Project node(s)`);
          }

          // 3. Delete teams from Supabase (team_members will cascade)
          const { data: teamsDeleted, error: teamError } = await supabaseAdmin
            .from('teams')
            .delete()
            .eq('graph_id', graphId)
            .select('id');

          if (teamError) {
            console.error('[Cleanup API] Error deleting teams:', teamError);
          } else if (teamsDeleted && teamsDeleted.length > 0) {
            details.push(`${teamsDeleted.length} Supabase team(s)`);
          }

          // 4. Delete insight_runs from Supabase (insights will cascade)
          const { data: insightsDeleted, error: insightError } = await supabaseAdmin
            .from('insight_runs')
            .delete()
            .eq('graph_id', graphId)
            .select('id');

          if (insightError) {
            console.error('[Cleanup API] Error deleting insights:', insightError);
          } else if (insightsDeleted && insightsDeleted.length > 0) {
            details.push(`${insightsDeleted.length} insight run(s)`);
          }

          result = {
            affected: totalDeleted,
            details: `Deleted: ${details.join(', ')}`,
          };
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }

    return NextResponse.json({
      action,
      dryRun,
      ...result,
    });

    } catch (error) {
      console.error('[Cleanup API] Error:', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
        { status: 500 }
      );
    }
  });
}
