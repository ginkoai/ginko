/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-14
 * @tags: [migration, epic, graph, EPIC-011]
 * @related: [../../epic/sync/route.ts, ../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/010-epic-graph-id
 *
 * Migration 010: Add graph_id property to all Epic nodes (EPIC-011)
 *
 * This migration adds the graph_id property (snake_case) to Epic nodes
 * that only have graphId (camelCase). This ensures consistency with
 * other node types and fixes the nodes API label filtering.
 *
 * Query Parameters:
 * - dryRun: boolean (optional) - If true, reports what would be migrated without making changes
 *
 * Returns:
 * - migrated: number - Count of epics that were updated
 * - skipped: number - Count of epics that already had graph_id
 * - errors: string[] - Any errors encountered
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

// Initialize Supabase admin client for auth validation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Validate API key (gk_xxx format) against user_profiles
 */
async function validateApiKey(apiKey: string): Promise<{ valid: boolean; email?: string; userId?: string }> {
  if (!apiKey.startsWith('gk_') || apiKey.length < 20) {
    return { valid: false };
  }

  const prefix = apiKey.substring(0, 11);

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, api_key_hash')
    .eq('api_key_prefix', prefix)
    .single();

  if (error || !profile || !profile.api_key_hash) {
    return { valid: false };
  }

  const isValid = await bcrypt.compare(apiKey, profile.api_key_hash);
  if (!isValid) {
    return { valid: false };
  }

  return { valid: true, email: profile.email, userId: profile.id };
}

/**
 * Convert Neo4j Integer to JavaScript number
 */
function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return parseInt(value, 10) || 0;
}

interface MigrationResponse {
  migrated: number;
  skipped: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authResult = await validateApiKey(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired API key' } },
        { status: 401 }
      );
    }

    const userEmail = authResult.email || 'unknown';

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database is unavailable' } },
        { status: 503 }
      );
    }

    console.log(`[Migration 010] Starting${dryRun ? ' (dry run)' : ''} - User: ${userEmail}`);

    // Find all Epics that need migration (have graphId but missing graph_id)
    const findQuery = `
      MATCH (e:Epic)
      WHERE e.graphId IS NOT NULL AND e.graph_id IS NULL
      RETURN e.id as id, e.graphId as graphId
      ORDER BY e.id
    `;

    const needsMigration = await runQuery(findQuery, {});

    // Find count of Epics that already have graph_id
    const findSkippedQuery = `
      MATCH (e:Epic)
      WHERE e.graph_id IS NOT NULL
      RETURN count(e) as count
    `;

    const skippedResult = await runQuery(findSkippedQuery, {});
    const skippedCount = toNumber(skippedResult[0]?.count);

    const response: MigrationResponse = {
      migrated: 0,
      skipped: skippedCount,
      errors: [],
    };

    if (needsMigration.length === 0) {
      console.log('[Migration 010] No epics need migration');
      return NextResponse.json(response);
    }

    if (dryRun) {
      response.migrated = needsMigration.length;
      console.log(`[Migration 010] Dry run complete - ${needsMigration.length} epics would be migrated`);
      return NextResponse.json(response);
    }

    // Actually run the migration - copy graphId to graph_id
    const migrateQuery = `
      MATCH (e:Epic)
      WHERE e.graphId IS NOT NULL AND e.graph_id IS NULL
      SET e.graph_id = e.graphId
      RETURN count(e) as migrated
    `;

    const migrateResult = await runQuery(migrateQuery, {});
    response.migrated = toNumber(migrateResult[0]?.migrated);

    console.log(`[Migration 010] Complete - Migrated ${response.migrated} epics`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Migration 010] Error:', error);
    return NextResponse.json(
      {
        migrated: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Internal server error'],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/migrations/010-epic-graph-id
 *
 * Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        { status: 401 }
      );
    }

    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database is unavailable' } },
        { status: 503 }
      );
    }

    const statusQuery = `
      MATCH (e:Epic)
      RETURN
        count(CASE WHEN e.graphId IS NOT NULL AND e.graph_id IS NULL THEN 1 END) as needsMigration,
        count(CASE WHEN e.graph_id IS NOT NULL THEN 1 END) as alreadyMigrated
    `;

    const result = await runQuery(statusQuery, {});
    const status = result[0] || { needsMigration: 0, alreadyMigrated: 0 };

    return NextResponse.json({
      migration: '010-epic-graph-id',
      status: toNumber(status.needsMigration) > 0 ? 'pending' : 'complete',
      needsMigration: toNumber(status.needsMigration),
      alreadyMigrated: toNumber(status.alreadyMigrated),
    });

  } catch (error) {
    console.error('[Migration 010] Status check error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Internal server error' } },
      { status: 500 }
    );
  }
}
