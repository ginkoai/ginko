/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, admin, teams, debug]
 * @related: [../cleanup-test-teams/route.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [supabase]
 */

/**
 * Admin endpoints for team management:
 * - GET: List all teams (for debugging duplicate issues)
 * - DELETE: Delete a specific team by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Admin user IDs
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Admin Teams API] GET called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    const supabase = createServiceRoleClient();

    try {
      // Build query
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          graph_id,
          created_at,
          updated_at,
          team_members (
            user_id,
            role,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by graphId if provided
      if (graphId) {
        query = query.eq('graph_id', graphId);
      }

      const { data: teams, error } = await query;

      if (error) {
        console.error('[Admin Teams API] Error fetching teams:', error);
        return NextResponse.json(
          { error: 'Failed to fetch teams', details: error.message },
          { status: 500 }
        );
      }

      // Transform to include member count
      const teamsWithCounts = teams?.map((team: { team_members?: unknown[]; [key: string]: unknown }) => ({
        ...team,
        member_count: team.team_members?.length || 0,
      })) || [];

      return NextResponse.json({
        teams: teamsWithCounts,
        count: teamsWithCounts.length,
        filter: graphId ? { graphId } : null,
      });

    } catch (error) {
      console.error('[Admin Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Failed to list teams',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Admin Teams API] DELETE called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('id');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID required. Use ?id=<team_id>' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    try {
      // First, get the team to confirm it exists
      const { data: team, error: findError } = await supabase
        .from('teams')
        .select('id, name, graph_id, created_at')
        .eq('id', teamId)
        .single();

      if (findError || !team) {
        return NextResponse.json(
          { error: 'Team not found', teamId },
          { status: 404 }
        );
      }

      // Delete the team (team_members will cascade delete)
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (deleteError) {
        console.error('[Admin Teams API] Error deleting team:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete team', details: deleteError.message },
          { status: 500 }
        );
      }

      console.log(`[Admin Teams API] Deleted team: ${team.name} (${team.id})`);

      return NextResponse.json({
        success: true,
        message: `Deleted team: ${team.name}`,
        deleted: team,
      });

    } catch (error) {
      console.error('[Admin Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Delete failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
