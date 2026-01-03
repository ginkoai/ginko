/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [graph, membership, team, sync, EPIC-008]
 * @related: [sync/route.ts, ../../teams/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * GET /api/v1/graph/membership - Get current user's team membership for a graph
 *
 * Returns the user's team membership status including:
 * - Team info (id, name)
 * - Role (owner, admin, member)
 * - Last sync timestamp
 *
 * EPIC-008: Team Collaboration - Sprint 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface MembershipResponse {
  isMember: boolean;
  membership: {
    team_id: string;
    team_name: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
    last_sync_at: string | null;
  } | null;
}

/**
 * GET /api/v1/graph/membership
 * Get current user's team membership for a graph
 */
export async function GET(request: NextRequest) {
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

      // Find teams associated with this graph
      // Graph -> Team relationship via team's graph_id
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, graph_id')
        .eq('graph_id', graphId);

      if (teamsError) {
        console.error('[Membership API] Error fetching teams:', teamsError);
        return NextResponse.json(
          { error: 'Failed to fetch team data', message: teamsError.message },
          { status: 500 }
        );
      }

      if (!teams || teams.length === 0) {
        // No team exists for this graph - user works alone
        const response: MembershipResponse = {
          isMember: false,
          membership: null,
        };
        return NextResponse.json(response);
      }

      // Check if user is a member of any of these teams
      const teamIds = teams.map((t: any) => t.id);

      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          created_at,
          last_sync_at,
          teams!team_members_team_id_fkey(id, name)
        `)
        .eq('user_id', user.id)
        .in('team_id', teamIds)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected if not a member
        console.error('[Membership API] Error fetching membership:', memberError);
        return NextResponse.json(
          { error: 'Failed to fetch membership data', message: memberError.message },
          { status: 500 }
        );
      }

      if (!membership) {
        // User is not a member of any team for this graph
        const response: MembershipResponse = {
          isMember: false,
          membership: null,
        };
        return NextResponse.json(response);
      }

      // User is a team member
      const team = membership.teams as any;
      const response: MembershipResponse = {
        isMember: true,
        membership: {
          team_id: membership.team_id,
          team_name: team?.name || 'Unknown Team',
          role: membership.role as 'owner' | 'admin' | 'member',
          joined_at: membership.created_at,
          last_sync_at: membership.last_sync_at || null,
        },
      };

      return NextResponse.json(response);

    } catch (error: any) {
      console.error('[Membership API] GET error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}
