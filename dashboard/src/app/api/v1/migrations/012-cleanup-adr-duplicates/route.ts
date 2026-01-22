/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-22
 * @tags: [migration, cleanup, adr, duplicates]
 * @priority: high
 * @complexity: medium
 */

/**
 * POST /api/v1/migrations/012-cleanup-adr-duplicates
 *
 * Cleans up duplicate ADR nodes created by the graphId vs graph_id inconsistency
 * and short-form vs full-slug ID format issues.
 *
 * Strategy:
 * 1. Find all ADRs with short-form IDs (ADR-NNN without slug suffix)
 * 2. Check if a full-slug version exists for that number
 * 3. If duplicate exists, delete the short-form one
 * 4. Also delete any ADRs that don't match local file naming
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyConnection } from '../../graph/_neo4j';

const GRAPH_ID = 'gin_1762125961056_dg4bsd';

export async function POST(request: NextRequest) {
  console.log('[Migration 012] Starting ADR duplicate cleanup');

  try {
    // Verify connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const session = getSession();
    const results: string[] = [];

    try {
      // Step 1: Find and delete short-form ADR IDs (ADR-NNN without slug)
      // These are stubs created by task sync that duplicate the full-slug ADRs
      const shortFormResult = await session.executeWrite(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE (a.graph_id = $graphId OR a.graphId = $graphId)
            AND a.id =~ '^ADR-[0-9]{1,3}$'
          WITH a, a.id as adrId
          // Check if a full-slug version exists
          OPTIONAL MATCH (full:ADR)
          WHERE (full.graph_id = $graphId OR full.graphId = $graphId)
            AND full.id STARTS WITH adrId + '-'
            AND full.id <> a.id
          WITH a, adrId, full
          WHERE full IS NOT NULL
          DETACH DELETE a
          RETURN adrId as deleted
        `, { graphId: GRAPH_ID });
      });

      const deletedShortForms = shortFormResult.records.map(r => r.get('deleted'));
      results.push(`Deleted ${deletedShortForms.length} short-form ADR stubs: ${deletedShortForms.join(', ')}`);

      // Step 2: Get current ADR count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE a.graph_id = $graphId OR a.graphId = $graphId
          RETURN count(a) as count
        `, { graphId: GRAPH_ID });
      });

      const finalCount = countResult.records[0]?.get('count')?.toNumber() || 0;
      results.push(`Final ADR count: ${finalCount}`);

      return NextResponse.json({
        success: true,
        results,
        deletedCount: deletedShortForms.length,
        finalCount,
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
  // Dry run - show what would be deleted
  console.log('[Migration 012] Dry run - analyzing ADR duplicates');

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const session = getSession();

    try {
      // Find short-form ADRs that have full-slug duplicates
      const analysisResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE (a.graph_id = $graphId OR a.graphId = $graphId)
            AND a.id =~ '^ADR-[0-9]{1,3}$'
          WITH a, a.id as shortId
          OPTIONAL MATCH (full:ADR)
          WHERE (full.graph_id = $graphId OR full.graphId = $graphId)
            AND full.id STARTS WITH shortId + '-'
          RETURN shortId,
                 a.title as shortTitle,
                 full.id as fullId,
                 full.title as fullTitle,
                 full IS NOT NULL as hasDuplicate
          ORDER BY shortId
        `, { graphId: GRAPH_ID });
      });

      const duplicates = analysisResult.records
        .filter(r => r.get('hasDuplicate'))
        .map(r => ({
          shortId: r.get('shortId'),
          shortTitle: r.get('shortTitle'),
          fullId: r.get('fullId'),
          fullTitle: r.get('fullTitle'),
        }));

      const orphans = analysisResult.records
        .filter(r => !r.get('hasDuplicate'))
        .map(r => ({
          shortId: r.get('shortId'),
          shortTitle: r.get('shortTitle'),
        }));

      // Get total count
      const countResult = await session.executeRead(async (tx) => {
        return tx.run(`
          MATCH (a:ADR)
          WHERE a.graph_id = $graphId OR a.graphId = $graphId
          RETURN count(a) as count
        `, { graphId: GRAPH_ID });
      });

      const totalCount = countResult.records[0]?.get('count')?.toNumber() || 0;

      return NextResponse.json({
        totalADRs: totalCount,
        duplicatePairs: duplicates.length,
        orphanShortIds: orphans.length,
        duplicates,
        orphans,
        wouldDelete: duplicates.map(d => d.shortId),
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
