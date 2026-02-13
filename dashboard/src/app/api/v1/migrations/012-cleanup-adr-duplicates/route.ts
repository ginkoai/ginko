/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-02-13
 * @tags: [migration, cleanup, adr, duplicates]
 * @priority: high
 * @complexity: medium
 */

/**
 * POST /api/v1/migrations/012-cleanup-adr-duplicates
 *
 * Cleans up duplicate ADR nodes caused by three independent ID formats:
 *
 * 1. Short-form (ADR-039)          — current CLI output, CANONICAL
 * 2. Full-slug (ADR-039-graph-based-context-discovery) — original CLI code
 * 3. Double-slug (ADR-039-adr-039) — old CLI push of duplicate filenames
 *
 * Strategy (INVERTED from original migration):
 * 1. Find all non-canonical ADR nodes (full-slug and double-slug)
 * 2. For each, find or create the matching short-form canonical node
 * 3. Transfer any relationships from duplicate to canonical
 * 4. Delete the duplicate nodes
 *
 * Combined with server-side ID normalization in the documents route,
 * this prevents re-duplication on subsequent pushes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyConnection } from '../../graph/_neo4j';

const GRAPH_ID = 'gin_1762125961056_dg4bsd';

/**
 * Extract the canonical short-form ID (ADR-NNN) from any ADR ID format.
 */
function extractCanonicalId(id: string): string | null {
  const match = id.match(/^(ADR-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export async function POST(request: NextRequest) {
  console.log('[Migration 012] Starting ADR duplicate cleanup (inverted: keep short-form)');

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const session = getSession();
    const results: string[] = [];

    try {
      // Step 1: Get before count
      const beforeResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE a.graph_id = $graphId OR a.graphId = $graphId
          RETURN count(a) as count
        `, { graphId: GRAPH_ID });
      });
      const beforeCount = beforeResult.records[0]?.get('count')?.toNumber() || 0;
      results.push(`Before: ${beforeCount} ADR nodes`);

      // Step 2: Transfer relationships from full-slug duplicates to short-form canonical nodes.
      // For each full-slug node that has a matching short-form node, move incoming
      // and outgoing relationships to the short-form node, then delete the full-slug.
      const transferResult = await session.executeWrite(async (tx) => {
        return tx.run(`
          // Find full-slug ADR nodes (id has characters after ADR-NNN)
          MATCH (dup:ADR)
          WHERE (dup.graph_id = $graphId OR dup.graphId = $graphId)
            AND dup.id =~ '^ADR-[0-9]+-[a-zA-Z].*'
          WITH dup, apoc.text.regexGroups(dup.id, '^(ADR-[0-9]+)')[0][1] AS canonicalId
          // Find or create the canonical short-form node
          MERGE (canon:ADR {id: canonicalId, graph_id: $graphId})
          // Copy properties from duplicate to canonical (canonical's own properties win on conflict)
          ON CREATE SET canon = dup, canon.id = canonicalId
          ON MATCH SET canon.updated_at = datetime().epochMillis
          WITH dup, canon
          // Transfer outgoing relationships
          CALL {
            WITH dup, canon
            MATCH (dup)-[r]->(target)
            WHERE NOT target = canon
            WITH canon, target, type(r) AS relType, properties(r) AS relProps
            CALL apoc.merge.relationship(canon, relType, {}, relProps, target, {}) YIELD rel
            RETURN count(rel) AS outTransferred
          }
          // Transfer incoming relationships
          CALL {
            WITH dup, canon
            MATCH (source)-[r]->(dup)
            WHERE NOT source = canon
            WITH canon, source, type(r) AS relType, properties(r) AS relProps
            CALL apoc.merge.relationship(source, relType, {}, relProps, canon, {}) YIELD rel
            RETURN count(rel) AS inTransferred
          }
          WITH dup, canon, dup.id AS deletedId
          DETACH DELETE dup
          RETURN deletedId
        `, { graphId: GRAPH_ID });
      });

      const deletedFullSlugs = transferResult.records.map(r => r.get('deletedId'));
      results.push(`Deleted ${deletedFullSlugs.length} full-slug duplicates`);

      // Step 3: Delete double-slug nodes (ADR-NNN-adr-NNN pattern)
      const doubleSlugResult = await session.executeWrite(async (tx) => {
        return tx.run(`
          MATCH (dup:ADR)
          WHERE (dup.graph_id = $graphId OR dup.graphId = $graphId)
            AND dup.id =~ '^ADR-[0-9]+-adr-[0-9]+$'
          WITH dup, apoc.text.regexGroups(dup.id, '^(ADR-[0-9]+)')[0][1] AS canonicalId
          // Ensure canonical node exists
          MERGE (canon:ADR {id: canonicalId, graph_id: $graphId})
          ON CREATE SET canon = dup, canon.id = canonicalId
          WITH dup, canon, dup.id AS deletedId
          // Transfer any relationships
          CALL {
            WITH dup, canon
            MATCH (dup)-[r]->(target)
            WHERE NOT target = canon
            WITH canon, target, type(r) AS relType, properties(r) AS relProps
            CALL apoc.merge.relationship(canon, relType, {}, relProps, target, {}) YIELD rel
            RETURN count(rel) AS outMoved
          }
          CALL {
            WITH dup, canon
            MATCH (source)-[r]->(dup)
            WHERE NOT source = canon
            WITH canon, source, type(r) AS relType, properties(r) AS relProps
            CALL apoc.merge.relationship(source, relType, {}, relProps, canon, {}) YIELD rel
            RETURN count(rel) AS inMoved
          }
          DETACH DELETE dup
          RETURN deletedId
        `, { graphId: GRAPH_ID });
      });

      const deletedDoubleSlugs = doubleSlugResult.records.map(r => r.get('deletedId'));
      results.push(`Deleted ${deletedDoubleSlugs.length} double-slug duplicates (ADR-NNN-adr-NNN)`);

      // Step 4: Delete non-ADR nodes with ADR label (ADR-INDEX, ADR-TEMPLATE, etc.)
      const miscResult = await session.executeWrite(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE (a.graph_id = $graphId OR a.graphId = $graphId)
            AND NOT a.id =~ '^ADR-[0-9]+.*'
          WITH a, a.id AS deletedId
          DETACH DELETE a
          RETURN deletedId
        `, { graphId: GRAPH_ID });
      });

      const deletedMisc = miscResult.records.map(r => r.get('deletedId'));
      if (deletedMisc.length > 0) {
        results.push(`Deleted ${deletedMisc.length} non-ADR nodes: ${deletedMisc.join(', ')}`);
      }

      // Step 5: Get final count
      const afterResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE a.graph_id = $graphId OR a.graphId = $graphId
          RETURN count(a) as count
        `, { graphId: GRAPH_ID });
      });
      const afterCount = afterResult.records[0]?.get('count')?.toNumber() || 0;
      results.push(`After: ${afterCount} ADR nodes`);

      const totalDeleted = deletedFullSlugs.length + deletedDoubleSlugs.length + deletedMisc.length;

      return NextResponse.json({
        success: true,
        results,
        deletedCount: totalDeleted,
        deletedFullSlugs: deletedFullSlugs.length,
        deletedDoubleSlugs: deletedDoubleSlugs.length,
        deletedMisc: deletedMisc.length,
        beforeCount,
        afterCount,
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('[Migration 012] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Migration failed',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Dry run - show what would be deleted (now targets full-slug and double-slug)
  console.log('[Migration 012] Dry run - analyzing ADR duplicates (inverted direction)');

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const session = getSession();

    try {
      // Find all ADR nodes grouped by canonical ID
      const analysisResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE a.graph_id = $graphId OR a.graphId = $graphId
          WITH a,
               CASE
                 WHEN a.id =~ '^ADR-[0-9]{1,3}$' THEN 'short-form'
                 WHEN a.id =~ '^ADR-[0-9]+-adr-[0-9]+$' THEN 'double-slug'
                 ELSE 'full-slug'
               END AS idType
          RETURN a.id AS id, a.title AS title, idType,
                 size([(a)-[r]-() | r]) AS relationshipCount
          ORDER BY a.id
        `, { graphId: GRAPH_ID });
      });

      const allNodes = analysisResult.records.map(r => ({
        id: r.get('id'),
        title: r.get('title'),
        idType: r.get('idType'),
        relationshipCount: r.get('relationshipCount')?.toNumber?.() || r.get('relationshipCount') || 0,
      }));

      const shortForm = allNodes.filter(n => n.idType === 'short-form');
      const fullSlug = allNodes.filter(n => n.idType === 'full-slug');
      const doubleSlug = allNodes.filter(n => n.idType === 'double-slug');

      const totalCount = allNodes.length;

      return NextResponse.json({
        totalADRs: totalCount,
        breakdown: {
          shortForm: shortForm.length,
          fullSlug: fullSlug.length,
          doubleSlug: doubleSlug.length,
        },
        keepCount: shortForm.length,
        wouldDelete: fullSlug.length + doubleSlug.length,
        wouldDeleteFullSlugs: fullSlug.map(n => n.id),
        wouldDeleteDoubleSlugs: doubleSlug.map(n => n.id),
        kept: shortForm.map(n => ({ id: n.id, title: n.title, rels: n.relationshipCount })),
        expectedAfter: shortForm.length,
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('[Migration 012] Analysis error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 });
  }
}
