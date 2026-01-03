/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [graph, membership, sync, timestamp, EPIC-008]
 * @related: [../route.ts, ../../../teams/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/graph/membership/sync - Update last sync timestamp
 *
 * Called after a successful ginko sync to track when user last synced.
 * Used for staleness detection.
 *
 * EPIC-008: Team Collaboration - Sprint 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface UpdateSyncRequest {
  syncedAt?: string;
}

/**
 * POST /api/v1/graph/membership/sync
 * Update last sync timestamp for current user
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const { searchParams } = new URL(request.url);
      const graphId = searchParams.get('graphId');

      if (!graphId) {
        return NextResponse.json(
          { error: 'Missing required parameter: graphId' },
          { status: 400 }
        );
      }

      // Parse optional body
      let syncedAt = new Date().toISOString();
      try {
        const body: UpdateSyncRequest = await request.json();
        if (body.syncedAt) {
          syncedAt = body.syncedAt;
        }
      } catch {
        // No body provided, use current timestamp
      }

      // Find teams associated with this graph
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('graph_id', graphId);

      if (teamsError || !teams || teams.length === 0) {
        // No team for this graph - nothing to update
        return NextResponse.json({
          success: true,
          message: 'No team membership to update',
        });
      }

      const teamIds = teams.map((t: any) => t.id);

      // Update last_sync_at for user's membership
      const { data: updated, error: updateError } = await supabase
        .from('team_members')
        .update({ last_sync_at: syncedAt })
        .eq('user_id', user.id)
        .in('team_id', teamIds)
        .select('team_id, last_sync_at');

      if (updateError) {
        console.error('[Membership Sync API] Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update sync timestamp', message: updateError.message },
          { status: 500 }
        );
      }

      if (!updated || updated.length === 0) {
        // User is not a member of any team for this graph
        return NextResponse.json({
          success: true,
          message: 'No team membership found',
        });
      }

      return NextResponse.json({
        success: true,
        synced_at: syncedAt,
        teams_updated: updated.length,
      });

    } catch (error: any) {
      console.error('[Membership Sync API] POST error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}
