/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-14
 * @tags: [migration, sprint, task, epic_id, EPIC-011]
 * @related: [../../sprint/sync/route.ts, ../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/011-sprint-epic-id
 *
 * Migration 011: Add epic_id and graph_id to Sprint and Task nodes (EPIC-011)
 *
 * This migration:
 * 1. Adds graph_id (snake_case) to Sprint/Task nodes that only have graphId
 * 2. Extracts epic_id from Sprint ID (e{NNN}_s{NN} → EPIC-{N})
 * 3. Adds epic_id to Task nodes based on parent Sprint
 *
 * Query Parameters:
 * - dryRun: boolean (optional) - If true, reports what would be migrated
 *
 * Returns:
 * - sprintsMigrated: number
 * - tasksMigrated: number
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
  tasksMigrated: number;
  sprintsSkipped: number;
  tasksSkipped: number;
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

    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    console.log(`[Migration 011] Starting${dryRun ? ' (dry run)' : ''}`);

    const response: MigrationResponse = {
      sprintsMigrated: 0,
      tasksMigrated: 0,
      sprintsSkipped: 0,
      tasksSkipped: 0,
      errors: [],
    };

    // Step 1: Add graph_id to Sprints that only have graphId
    const sprintGraphIdQuery = `
      MATCH (s:Sprint)
      WHERE s.graphId IS NOT NULL AND s.graph_id IS NULL
      ${dryRun ? 'RETURN count(s) as count' : 'SET s.graph_id = s.graphId RETURN count(s) as count'}
    `;
    const sprintGraphIdResult = await runQuery(sprintGraphIdQuery, {});
    const sprintGraphIdCount = toNumber(sprintGraphIdResult[0]?.count);

    // Step 2: Add epic_id to Sprints that have e{NNN}_s{NN} format ID but no epic_id
    // ADR-052: Extract epic number from sprint ID format e{NNN}_s{NN}
    const sprintEpicIdQuery = `
      MATCH (s:Sprint)
      WHERE s.id =~ 'e[0-9]{3}_s[0-9]{2}.*' AND s.epic_id IS NULL
      ${dryRun ? 'RETURN s.id as id, count(s) as count' : `
      WITH s, 'EPIC-' + toString(toInteger(substring(s.id, 1, 3))) as epicId
      SET s.epic_id = epicId
      RETURN count(s) as count
      `}
    `;
    const sprintEpicIdResult = await runQuery(sprintEpicIdQuery, {});
    const sprintEpicIdCount = toNumber(sprintEpicIdResult[0]?.count);

    response.sprintsMigrated = sprintGraphIdCount + sprintEpicIdCount;

    // Step 3: Count already-migrated sprints
    const sprintSkippedQuery = `
      MATCH (s:Sprint)
      WHERE s.graph_id IS NOT NULL AND s.epic_id IS NOT NULL
      RETURN count(s) as count
    `;
    const sprintSkippedResult = await runQuery(sprintSkippedQuery, {});
    response.sprintsSkipped = toNumber(sprintSkippedResult[0]?.count);

    // Step 4: Add graph_id to Tasks that only have graphId
    const taskGraphIdQuery = `
      MATCH (t:Task)
      WHERE t.graphId IS NOT NULL AND t.graph_id IS NULL
      ${dryRun ? 'RETURN count(t) as count' : 'SET t.graph_id = t.graphId RETURN count(t) as count'}
    `;
    const taskGraphIdResult = await runQuery(taskGraphIdQuery, {});
    const taskGraphIdCount = toNumber(taskGraphIdResult[0]?.count);

    // Step 5: Add sprint_id and epic_id to Tasks based on CONTAINS relationship
    const taskParentQuery = `
      MATCH (s:Sprint)-[:CONTAINS]->(t:Task)
      WHERE t.sprint_id IS NULL OR t.epic_id IS NULL
      ${dryRun ? 'RETURN count(t) as count' : `
      SET t.sprint_id = s.id,
          t.epic_id = s.epic_id
      RETURN count(t) as count
      `}
    `;
    const taskParentResult = await runQuery(taskParentQuery, {});
    const taskParentCount = toNumber(taskParentResult[0]?.count);

    response.tasksMigrated = taskGraphIdCount + taskParentCount;

    // Step 6: Count already-migrated tasks
    const taskSkippedQuery = `
      MATCH (t:Task)
      WHERE t.graph_id IS NOT NULL AND t.sprint_id IS NOT NULL
      RETURN count(t) as count
    `;
    const taskSkippedResult = await runQuery(taskSkippedQuery, {});
    response.tasksSkipped = toNumber(taskSkippedResult[0]?.count);

    console.log(`[Migration 011] Complete - Sprints: ${response.sprintsMigrated}, Tasks: ${response.tasksMigrated}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Migration 011] Error:', error);
    return NextResponse.json(
      {
        sprintsMigrated: 0,
        tasksMigrated: 0,
        sprintsSkipped: 0,
        tasksSkipped: 0,
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

    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable' } },
        { status: 503 }
      );
    }

    const statusQuery = `
      MATCH (s:Sprint)
      WITH
        count(CASE WHEN s.graph_id IS NULL OR s.epic_id IS NULL THEN 1 END) as sprintsNeedMigration,
        count(CASE WHEN s.graph_id IS NOT NULL AND s.epic_id IS NOT NULL THEN 1 END) as sprintsMigrated
      MATCH (t:Task)
      RETURN
        sprintsNeedMigration,
        sprintsMigrated,
        count(CASE WHEN t.graph_id IS NULL OR t.sprint_id IS NULL THEN 1 END) as tasksNeedMigration,
        count(CASE WHEN t.graph_id IS NOT NULL AND t.sprint_id IS NOT NULL THEN 1 END) as tasksMigrated
    `;

    const result = await runQuery(statusQuery, {});
    const status = result[0] || {};

    const needsMigration = toNumber(status.sprintsNeedMigration) + toNumber(status.tasksNeedMigration);

    return NextResponse.json({
      migration: '011-sprint-epic-id',
      status: needsMigration > 0 ? 'pending' : 'complete',
      sprints: {
        needsMigration: toNumber(status.sprintsNeedMigration),
        migrated: toNumber(status.sprintsMigrated),
      },
      tasks: {
        needsMigration: toNumber(status.tasksNeedMigration),
        migrated: toNumber(status.tasksMigrated),
      },
    });

  } catch (error) {
    console.error('[Migration 011] Status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
