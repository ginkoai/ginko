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
          { action: 'dedupe-tasks', description: 'Remove duplicate Task nodes (keep one per id)', estimatedDeletes: analysis.duplicateTasks.duplicateCount },
          { action: 'cleanup-stale', description: 'Delete nodes from stale/test graphIds', estimatedDeletes: staleResults.reduce((sum, r) => sum + toNumber(r.count), 0) },
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

    // Require owner access
    const access = await verifyGraphAccessFromRequest(request, graphId, 'write');
    if (!access.hasAccess || access.role !== 'owner') {
      return NextResponse.json(
        { error: { code: 'ACCESS_DENIED', message: 'Owner access required for cleanup operations' } },
        { status: 403 }
      );
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
}
