/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-23
 * @tags: [migration, epic, sprint, status]
 * @related: [../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/013-epic-sprint-status
 *
 * Migration 013: Add status property to Epic and Sprint nodes
 *
 * This migration:
 * 1. Adds status='active' to Epic nodes that don't have a status property
 * 2. Adds status='active' to Sprint nodes that don't have a status property
 *
 * Non-destructive: Only updates nodes missing the status property.
 * Nodes with existing status values are preserved.
 *
 * Query Parameters:
 * - graphId (required): The graph to migrate
 * - dryRun: boolean (optional) - If true, reports what would be migrated
 *
 * Returns:
 * - epicsMigrated: number
 * - sprintsMigrated: number
 * - epicsSkipped: number (already have status)
 * - sprintsSkipped: number (already have status)
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
  epicsMigrated: number;
  sprintsMigrated: number;
  epicsSkipped: number;
  sprintsSkipped: number;
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

    console.log(`[Migration 013] Starting for graphId=${graphId}${dryRun ? ' (dry run)' : ''}`);

    const response: MigrationResponse = {
      epicsMigrated: 0,
      sprintsMigrated: 0,
      epicsSkipped: 0,
      sprintsSkipped: 0,
      errors: [],
    };

    // Step 1: Add status='active' to Epics without status (scoped to graphId)
    const epicMigrateQuery = `
      MATCH (e:Epic)
      WHERE (e.graph_id = $graphId OR e.graphId = $graphId) AND e.status IS NULL
      ${dryRun ? 'RETURN count(e) as count' : "SET e.status = 'active' RETURN count(e) as count"}
    `;
    const epicMigrateResult = await runQuery(epicMigrateQuery, { graphId });
    response.epicsMigrated = toNumber(epicMigrateResult[0]?.count);

    // Step 2: Count Epics that already have status (skipped)
    const epicSkippedQuery = `
      MATCH (e:Epic)
      WHERE (e.graph_id = $graphId OR e.graphId = $graphId) AND e.status IS NOT NULL
      RETURN count(e) as count
    `;
    const epicSkippedResult = await runQuery(epicSkippedQuery, { graphId });
    response.epicsSkipped = toNumber(epicSkippedResult[0]?.count);

    // Step 3: Add status='active' to Sprints without status (scoped to graphId)
    const sprintMigrateQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId) AND s.status IS NULL
      ${dryRun ? 'RETURN count(s) as count' : "SET s.status = 'active' RETURN count(s) as count"}
    `;
    const sprintMigrateResult = await runQuery(sprintMigrateQuery, { graphId });
    response.sprintsMigrated = toNumber(sprintMigrateResult[0]?.count);

    // Step 4: Count Sprints that already have status (skipped)
    const sprintSkippedQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId) AND s.status IS NOT NULL
      RETURN count(s) as count
    `;
    const sprintSkippedResult = await runQuery(sprintSkippedQuery, { graphId });
    response.sprintsSkipped = toNumber(sprintSkippedResult[0]?.count);

    console.log(`[Migration 013] Complete - Epics: ${response.epicsMigrated} migrated, ${response.epicsSkipped} skipped | Sprints: ${response.sprintsMigrated} migrated, ${response.sprintsSkipped} skipped`);

    return NextResponse.json({
      ...response,
      graphId,
      dryRun,
      message: dryRun
        ? `Would migrate ${response.epicsMigrated} epics and ${response.sprintsMigrated} sprints`
        : `Migrated ${response.epicsMigrated} epics and ${response.sprintsMigrated} sprints`,
    });

  } catch (error) {
    console.error('[Migration 013] Error:', error);
    return NextResponse.json(
      {
        epicsMigrated: 0,
        sprintsMigrated: 0,
        epicsSkipped: 0,
        sprintsSkipped: 0,
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

    // Check current status counts (scoped to graphId)
    const statusQuery = `
      MATCH (e:Epic)
      WHERE e.graph_id = $graphId OR e.graphId = $graphId
      WITH
        count(CASE WHEN e.status IS NULL THEN 1 END) as epicsNeedMigration,
        count(CASE WHEN e.status IS NOT NULL THEN 1 END) as epicsWithStatus
      MATCH (s:Sprint)
      WHERE s.graph_id = $graphId OR s.graphId = $graphId
      RETURN
        epicsNeedMigration,
        epicsWithStatus,
        count(CASE WHEN s.status IS NULL THEN 1 END) as sprintsNeedMigration,
        count(CASE WHEN s.status IS NOT NULL THEN 1 END) as sprintsWithStatus
    `;

    const result = await runQuery(statusQuery, { graphId });
    const status = result[0] || {};

    const needsMigration = toNumber(status.epicsNeedMigration) + toNumber(status.sprintsNeedMigration);

    return NextResponse.json({
      migration: '013-epic-sprint-status',
      graphId,
      status: needsMigration > 0 ? 'pending' : 'complete',
      epics: {
        needsMigration: toNumber(status.epicsNeedMigration),
        withStatus: toNumber(status.epicsWithStatus),
      },
      sprints: {
        needsMigration: toNumber(status.sprintsNeedMigration),
        withStatus: toNumber(status.sprintsWithStatus),
      },
    });

  } catch (error) {
    console.error('[Migration 013] Status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
