/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-26
 * @tags: [migration, sprint, cleanup, data-corruption]
 * @related: [../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/016-cleanup-adhoc-sprint-corruption
 *
 * Migration 016: Clean up corrupted adhoc_260120_s01 sprint
 *
 * Problem: The adhoc_260120_s01 sprint node had its title overwritten to
 * "SPRINT: EPIC-016 Sprint 4 - Flow-Aware Nudging" and contains tasks
 * that should belong to Sprint 4 (e016_s04).
 *
 * This migration:
 * 1. Deletes the adhoc_260120_s01 Sprint node
 * 2. Deletes all Task nodes with task_id starting with adhoc_260120_s01
 *
 * After running this, use `ginko graph load` to re-upload Sprint 4
 * with correct task IDs (e016_s04_t01 through e016_s04_t07).
 *
 * Query Parameters:
 * - graphId (required): The graph to clean up
 * - dryRun: boolean (optional) - If true, reports what would be deleted
 *
 * Returns:
 * - deletedSprint: number
 * - deletedTasks: number
 * - taskIds: string[]
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

    console.log(`[Migration 016] Starting cleanup for graphId=${graphId}${dryRun ? ' (dry run)' : ''}`);

    // List tasks that will be deleted
    const listTasksQuery = `
      MATCH (t:Task)
      WHERE (t.graph_id = $graphId OR t.graphId = $graphId)
        AND (t.id STARTS WITH 'adhoc_260120_s01' OR t.task_id STARTS WITH 'adhoc_260120_s01')
      RETURN t.id as id, t.task_id as taskId, t.title as title
    `;
    const taskResults = await runQuery(listTasksQuery, { graphId });
    const tasksToDelete = taskResults.map((r: any) => ({
      id: r.id,
      taskId: r.taskId,
      title: r.title,
    }));

    console.log(`[Migration 016] Found ${tasksToDelete.length} tasks to delete`);

    // Check for the sprint
    const listSprintQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND (s.id = 'adhoc_260120_s01' OR s.sprint_id = 'adhoc_260120_s01')
      RETURN s.id as id, s.title as title
    `;
    const sprintResults = await runQuery(listSprintQuery, { graphId });
    const sprintToDelete = sprintResults[0] || null;

    console.log(`[Migration 016] Sprint to delete:`, sprintToDelete);

    let deletedTasks = 0;
    let deletedSprint = 0;

    if (!dryRun) {
      // Delete tasks first
      if (tasksToDelete.length > 0) {
        const deleteTasksQuery = `
          MATCH (t:Task)
          WHERE (t.graph_id = $graphId OR t.graphId = $graphId)
            AND (t.id STARTS WITH 'adhoc_260120_s01' OR t.task_id STARTS WITH 'adhoc_260120_s01')
          DETACH DELETE t
          RETURN count(t) as count
        `;
        const deleteTaskResult = await runQuery(deleteTasksQuery, { graphId });
        deletedTasks = toNumber(deleteTaskResult[0]?.count);
        console.log(`[Migration 016] Deleted ${deletedTasks} tasks`);
      }

      // Delete sprint
      if (sprintToDelete) {
        const deleteSprintQuery = `
          MATCH (s:Sprint)
          WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
            AND (s.id = 'adhoc_260120_s01' OR s.sprint_id = 'adhoc_260120_s01')
          DETACH DELETE s
          RETURN count(s) as count
        `;
        const deleteSprintResult = await runQuery(deleteSprintQuery, { graphId });
        deletedSprint = toNumber(deleteSprintResult[0]?.count);
        console.log(`[Migration 016] Deleted ${deletedSprint} sprint`);
      }
    } else {
      deletedTasks = tasksToDelete.length;
      deletedSprint = sprintToDelete ? 1 : 0;
    }

    const message = dryRun
      ? `Would delete ${deletedTasks} tasks and ${deletedSprint} sprint`
      : `Deleted ${deletedTasks} tasks and ${deletedSprint} sprint`;

    console.log(`[Migration 016] Complete - ${message}`);

    return NextResponse.json({
      deletedSprint,
      deletedTasks,
      sprint: sprintToDelete,
      tasks: tasksToDelete,
      graphId,
      dryRun,
      message,
      nextStep: 'Run `ginko graph load` to re-upload Sprint 4 with correct task IDs',
    });

  } catch (error) {
    console.error('[Migration 016] Error:', error);
    return NextResponse.json(
      {
        deletedSprint: 0,
        deletedTasks: 0,
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

    // Check current status - sprint
    const sprintQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND (s.id = 'adhoc_260120_s01' OR s.sprint_id = 'adhoc_260120_s01')
      RETURN count(s) as count, s.title as title
    `;
    const sprintResult = await runQuery(sprintQuery, { graphId });
    const sprintCount = toNumber(sprintResult[0]?.count);
    const sprintTitle = sprintResult[0]?.title;

    // Check current status - tasks
    const taskQuery = `
      MATCH (t:Task)
      WHERE (t.graph_id = $graphId OR t.graphId = $graphId)
        AND (t.id STARTS WITH 'adhoc_260120_s01' OR t.task_id STARTS WITH 'adhoc_260120_s01')
      RETURN count(t) as count, collect(t.title)[0..5] as sampleTitles
    `;
    const taskResult = await runQuery(taskQuery, { graphId });
    const taskCount = toNumber(taskResult[0]?.count);
    const sampleTitles = taskResult[0]?.sampleTitles || [];

    const needsCleanup = sprintCount > 0 || taskCount > 0;

    return NextResponse.json({
      migration: '016-cleanup-adhoc-sprint-corruption',
      graphId,
      status: needsCleanup ? 'pending' : 'complete',
      sprint: {
        exists: sprintCount > 0,
        title: sprintTitle,
        corrupted: sprintTitle?.includes('EPIC-016 Sprint 4'),
      },
      tasks: {
        count: taskCount,
        sampleTitles,
      },
      message: needsCleanup
        ? `Found corrupted adhoc_260120_s01 sprint (${taskCount} tasks). Run POST to clean up.`
        : 'No corrupted adhoc_260120_s01 data found.',
    });

  } catch (error) {
    console.error('[Migration 016] Status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
