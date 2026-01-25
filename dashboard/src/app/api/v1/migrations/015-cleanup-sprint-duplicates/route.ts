/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-23
 * @tags: [migration, sprint, cleanup, duplicates]
 * @related: [../../graph/_neo4j.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/migrations/015-cleanup-sprint-duplicates
 *
 * Migration 015: Clean up duplicate Sprint nodes
 *
 * This migration:
 * 1. Deletes Sprint nodes with IDs starting with "SPRINT-2026"
 *    (duplicate naming convention that was replaced by e{NNN}_s{NN} format)
 *
 * Non-destructive to actual data: Only removes duplicates with wrong naming.
 * Uses DETACH DELETE to remove any orphan relationships.
 *
 * Query Parameters:
 * - graphId (required): The graph to clean up
 * - dryRun: boolean (optional) - If true, reports what would be deleted
 *
 * Returns:
 * - deleted: number
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

    console.log(`[Migration 015] Starting cleanup for graphId=${graphId}${dryRun ? ' (dry run)' : ''}`);

    // First, get list of nodes that will be deleted (for logging)
    const listQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND s.id STARTS WITH 'SPRINT-2026'
      RETURN s.id as id
    `;
    const listResult = await runQuery(listQuery, { graphId });
    const nodesToDelete = listResult.map((r: any) => r.id);

    console.log(`[Migration 015] Found ${nodesToDelete.length} nodes to delete:`, nodesToDelete);

    let deleted = 0;
    if (!dryRun && nodesToDelete.length > 0) {
      // Delete the duplicate nodes
      const deleteQuery = `
        MATCH (s:Sprint)
        WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
          AND s.id STARTS WITH 'SPRINT-2026'
        DETACH DELETE s
        RETURN count(s) as count
      `;
      const deleteResult = await runQuery(deleteQuery, { graphId });
      deleted = toNumber(deleteResult[0]?.count);
    } else if (dryRun) {
      deleted = nodesToDelete.length;
    }

    console.log(`[Migration 015] Complete - ${dryRun ? 'Would delete' : 'Deleted'}: ${deleted} nodes`);

    return NextResponse.json({
      deleted,
      nodes: nodesToDelete,
      graphId,
      dryRun,
      message: dryRun
        ? `Would delete ${deleted} duplicate Sprint nodes`
        : `Deleted ${deleted} duplicate Sprint nodes`,
    });

  } catch (error) {
    console.error('[Migration 015] Error:', error);
    return NextResponse.json(
      {
        deleted: 0,
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
    const statusQuery = `
      MATCH (s:Sprint)
      WHERE (s.graph_id = $graphId OR s.graphId = $graphId)
        AND s.id STARTS WITH 'SPRINT-2026'
      RETURN count(s) as duplicateCount, collect(s.id) as duplicateIds
    `;
    const result = await runQuery(statusQuery, { graphId });
    const data = result[0] || {};

    return NextResponse.json({
      migration: '015-cleanup-sprint-duplicates',
      graphId,
      status: toNumber(data.duplicateCount) > 0 ? 'pending' : 'complete',
      duplicateCount: toNumber(data.duplicateCount),
      duplicateIds: data.duplicateIds || [],
    });

  } catch (error) {
    console.error('[Migration 015] Status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
