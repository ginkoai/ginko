/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-09
 * @tags: [migration, epic, roadmap, ADR-056, graph]
 * @related: [../../epic/sync/route.ts, ../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/009-epic-roadmap
 *
 * Migration 009: Add roadmap properties to all Epic nodes (ADR-056)
 *
 * This migration adds the following properties to Epic nodes:
 * - commitment_status: 'uncommitted' (default)
 * - roadmap_status: 'not_started' (default)
 * - roadmap_visible: true (default)
 * - changelog: [] (empty array, initialized)
 *
 * Query Parameters:
 * - dryRun: boolean (optional) - If true, reports what would be migrated without making changes
 *
 * Returns:
 * - migrated: number - Count of epics that were updated
 * - skipped: number - Count of epics that already had properties
 * - errors: string[] - Any errors encountered
 * - details: array - Per-epic migration details (if dryRun=true)
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
  // Check format
  if (!apiKey.startsWith('gk_') || apiKey.length < 20) {
    return { valid: false };
  }

  // Extract prefix for lookup (gk_ + first 8 chars)
  const prefix = apiKey.substring(0, 11);

  // Find user by API key prefix
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, api_key_hash')
    .eq('api_key_prefix', prefix)
    .single();

  if (error || !profile || !profile.api_key_hash) {
    return { valid: false };
  }

  // Verify the full key with bcrypt
  const isValid = await bcrypt.compare(apiKey, profile.api_key_hash);
  if (!isValid) {
    return { valid: false };
  }

  return { valid: true, email: profile.email, userId: profile.id };
}

interface MigrationDetail {
  epic_id: string;
  status: 'migrated' | 'skipped' | 'error';
  message?: string;
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
  details?: MigrationDetail[];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via API key (gk_xxx format from CLI)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate API key
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

    console.log(`[Migration 009] Starting${dryRun ? ' (dry run)' : ''} - User: ${userEmail}`);

    // Find all Epics that need migration (missing roadmap properties)
    const findQuery = `
      MATCH (e:Epic)
      WHERE e.commitment_status IS NULL
      RETURN e.id as id,
             e.title as title,
             e.status as status
      ORDER BY e.id
    `;

    const needsMigration = await runQuery(findQuery, {});

    // Find all Epics that already have properties (for skip count)
    const findSkippedQuery = `
      MATCH (e:Epic)
      WHERE e.commitment_status IS NOT NULL
      RETURN count(e) as count
    `;

    const skippedResult = await runQuery(findSkippedQuery, {});
    const skippedCount = toNumber(skippedResult[0]?.count);

    const response: MigrationResponse = {
      migrated: 0,
      skipped: skippedCount,
      errors: [],
      details: dryRun ? [] : undefined,
    };

    if (needsMigration.length === 0) {
      console.log('[Migration 009] No epics need migration');
      return NextResponse.json(response);
    }

    if (dryRun) {
      // In dry run mode, just report what would be done
      response.details = needsMigration.map(epic => ({
        epic_id: epic.id as string,
        status: 'migrated' as const,
        message: `Would add roadmap properties (commitment_status=uncommitted, roadmap_status=not_started)`,
      }));
      response.migrated = needsMigration.length;

      console.log(`[Migration 009] Dry run complete - ${needsMigration.length} epics would be migrated`);
      return NextResponse.json(response);
    }

    // Actually run the migration
    const timestamp = new Date().toISOString();
    // Neo4j doesn't support object literals - store changelog as JSON string
    const changelogEntry = JSON.stringify([{
      timestamp,
      field: 'roadmap_properties',
      from: null,
      to: 'initialized',
      reason: 'Migration 009: Added roadmap properties per ADR-056'
    }]);

    const migrateQuery = `
      MATCH (e:Epic)
      WHERE e.commitment_status IS NULL
      SET e.commitment_status = 'uncommitted',
          e.roadmap_status = 'not_started',
          e.roadmap_visible = true,
          e.changelog = $changelog,
          e.migrated_at = datetime($timestamp),
          e.migrated_by = $migratedBy
      RETURN count(e) as migrated
    `;

    const migrateResult = await runQuery(migrateQuery, {
      timestamp,
      changelog: changelogEntry,
      migratedBy: userEmail,
    });

    response.migrated = toNumber(migrateResult[0]?.migrated);

    console.log(`[Migration 009] Complete - Migrated ${response.migrated} epics`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Migration 009] Error:', error);
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
 * GET /api/v1/migrations/009-epic-roadmap
 *
 * Check migration status - how many Epics need migration
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        { status: 401 }
      );
    }

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database is unavailable' } },
        { status: 503 }
      );
    }

    // Count epics by migration status
    const statusQuery = `
      MATCH (e:Epic)
      RETURN
        count(CASE WHEN e.commitment_status IS NULL THEN 1 END) as needsMigration,
        count(CASE WHEN e.commitment_status IS NOT NULL THEN 1 END) as alreadyMigrated
    `;

    const result = await runQuery(statusQuery, {});
    const status = result[0] || { needsMigration: 0, alreadyMigrated: 0 };

    return NextResponse.json({
      migration: '009-epic-roadmap',
      status: status.needsMigration > 0 ? 'pending' : 'complete',
      needsMigration: status.needsMigration,
      alreadyMigrated: status.alreadyMigrated,
    });

  } catch (error) {
    console.error('[Migration 009] Status check error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Internal server error' } },
      { status: 500 }
    );
  }
}
