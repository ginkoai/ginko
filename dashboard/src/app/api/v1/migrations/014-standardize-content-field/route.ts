/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-23
 * @tags: [migration, sprint, principle, content, standardization]
 * @related: [../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/014-standardize-content-field
 *
 * Migration 014: Standardize markdown content field names
 *
 * This migration:
 * 1. Renames Sprint.goal → Sprint.content (preserves existing content if present)
 * 2. Renames Principle.theory → Principle.content (preserves existing content if present)
 *
 * Non-destructive: Only copies values to new field name, doesn't delete old fields.
 *
 * Query Parameters:
 * - graphId (required): The graph to migrate
 * - dryRun: boolean (optional) - If true, reports what would be migrated
 *
 * Returns:
 * - sprintsMigrated: number
 * - principlesMigrated: number
 * - errors: string[]
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; email?: string }> {
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
  return isValid ? { valid: true, email: profile.email } : { valid: false };
}

function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return parseInt(value, 10) || 0;
}

interface MigrationResponse {
  sprintsMigrated: number;
  principlesMigrated: number;
  sprintsSkipped: number;
  principlesSkipped: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authResult = await validateApiKey(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    console.log(`[Migration 014] Starting for graphId=${graphId}${dryRun ? ' (dry run)' : ''}`);

    const response: MigrationResponse = {
      sprintsMigrated: 0,
      principlesMigrated: 0,
      sprintsSkipped: 0,
      principlesSkipped: 0,
      errors: [],
    };

    // Step 1: Copy Sprint.goal → Sprint.content (where goal exists and content doesn't)
    const sprintMigrateQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND s.goal IS NOT NULL
        AND (s.content IS NULL OR s.content = '')
      ${dryRun ? 'RETURN count(s) as count' : 'SET s.content = s.goal RETURN count(s) as count'}
    `;
    const sprintMigrateResult = await runQuery(sprintMigrateQuery, { graphId });
    response.sprintsMigrated = toNumber(sprintMigrateResult[0]?.count);

    // Step 2: Count Sprints already migrated (have content)
    const sprintSkippedQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND s.content IS NOT NULL AND s.content <> ''
      RETURN count(s) as count
    `;
    const sprintSkippedResult = await runQuery(sprintSkippedQuery, { graphId });
    response.sprintsSkipped = toNumber(sprintSkippedResult[0]?.count);

    // Step 3: Copy Principle.theory → Principle.content (where theory exists and content doesn't)
    const principleMigrateQuery = `
      MATCH (p:Principle)
      WHERE (p.graph_id = $graphId OR p.graphId = $graphId)
        AND p.theory IS NOT NULL
        AND (p.content IS NULL OR p.content = '')
      ${dryRun ? 'RETURN count(p) as count' : 'SET p.content = p.theory RETURN count(p) as count'}
    `;
    const principleMigrateResult = await runQuery(principleMigrateQuery, { graphId });
    response.principlesMigrated = toNumber(principleMigrateResult[0]?.count);

    // Step 4: Count Principles already migrated (have content)
    const principleSkippedQuery = `
      MATCH (p:Principle)
      WHERE (p.graph_id = $graphId OR p.graphId = $graphId)
        AND p.content IS NOT NULL AND p.content <> ''
      RETURN count(p) as count
    `;
    const principleSkippedResult = await runQuery(principleSkippedQuery, { graphId });
    response.principlesSkipped = toNumber(principleSkippedResult[0]?.count);

    console.log(`[Migration 014] Complete - Sprints: ${response.sprintsMigrated} migrated, ${response.sprintsSkipped} skipped | Principles: ${response.principlesMigrated} migrated, ${response.principlesSkipped} skipped`);

    return NextResponse.json({
      ...response,
      graphId,
      dryRun,
      message: dryRun
        ? `Would migrate ${response.sprintsMigrated} sprints and ${response.principlesMigrated} principles`
        : `Migrated ${response.sprintsMigrated} sprints and ${response.principlesMigrated} principles`,
    });

  } catch (error) {
    console.error('[Migration 014] Error:', error);
    return NextResponse.json(
      {
        sprintsMigrated: 0,
        principlesMigrated: 0,
        sprintsSkipped: 0,
        principlesSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Internal server error'],
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId query parameter is required' } },
        { status: 400 }
      );
    }

    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    // Check current status
    const sprintStatusQuery = `
      MATCH (s:Sprint)
      WHERE s.graph_id = $graphId OR s.graphId = $graphId
      RETURN
        count(CASE WHEN s.goal IS NOT NULL AND (s.content IS NULL OR s.content = '') THEN 1 END) as needsMigration,
        count(CASE WHEN s.content IS NOT NULL AND s.content <> '' THEN 1 END) as alreadyMigrated
    `;
    const sprintStatus = await runQuery(sprintStatusQuery, { graphId });

    const principleStatusQuery = `
      MATCH (p:Principle)
      WHERE p.graph_id = $graphId OR p.graphId = $graphId
      RETURN
        count(CASE WHEN p.theory IS NOT NULL AND (p.content IS NULL OR p.content = '') THEN 1 END) as needsMigration,
        count(CASE WHEN p.content IS NOT NULL AND p.content <> '' THEN 1 END) as alreadyMigrated
    `;
    const principleStatus = await runQuery(principleStatusQuery, { graphId });

    const sprintData = sprintStatus[0] || {};
    const principleData = principleStatus[0] || {};

    const totalNeedsMigration = toNumber(sprintData.needsMigration) + toNumber(principleData.needsMigration);

    return NextResponse.json({
      migration: '014-standardize-content-field',
      graphId,
      status: totalNeedsMigration > 0 ? 'pending' : 'complete',
      sprints: {
        needsMigration: toNumber(sprintData.needsMigration),
        alreadyMigrated: toNumber(sprintData.alreadyMigrated),
      },
      principles: {
        needsMigration: toNumber(principleData.needsMigration),
        alreadyMigrated: toNumber(principleData.alreadyMigrated),
      },
    });

  } catch (error) {
    console.error('[Migration 014] Status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
