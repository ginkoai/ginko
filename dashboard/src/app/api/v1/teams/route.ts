/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [teams, crud, rest-api, task-022, multi-tenancy]
 * @related: [projects/route.ts, middleware.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/teams - Create team
 * GET /api/v1/teams - List user's teams
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
  graph_id?: string;
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * POST /api/v1/teams
 * Create a new team
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: CreateTeamRequest = await request.json();

      // Validate required fields
      if (!body.name || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Missing required field: name' },
          { status: 400 }
        );
      }

      // Generate slug if not provided
      const slug = body.slug?.trim() || generateSlug(body.name);

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: body.name.trim(),
          slug,
          description: body.description?.trim() || null,
          graph_id: body.graph_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) {
        console.error('[Teams API] Create team error:', teamError);
        return NextResponse.json(
          { error: 'Failed to create team', message: teamError.message },
          { status: 500 }
        );
      }

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('[Teams API] Add owner error:', memberError);
        // Rollback team creation
        await supabase.from('teams').delete().eq('id', team.id);
        return NextResponse.json(
          { error: 'Failed to add team owner', message: memberError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          graph_id: team.graph_id,
          created_by: team.created_by,
          created_at: team.created_at,
          updated_at: team.updated_at,
          role: 'owner',
        },
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Teams API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create team', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/teams
 * List user's teams
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      // Get teams where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', user.id)
        .limit(Math.min(limit, 100))
        .range(offset, offset + Math.min(limit, 100) - 1);

      if (memberError) {
        console.error('[Teams API] List teams error:', memberError);
        return NextResponse.json(
          { error: 'Failed to list teams', message: memberError.message },
          { status: 500 }
        );
      }

      // Get team IDs for counting members
      const teamIds = memberships?.map((m: any) => m.team_id) || [];

      // Get member counts for all teams in one query
      let memberCounts: Record<string, number> = {};
      if (teamIds.length > 0) {
        const { data: counts } = await supabase
          .from('team_members')
          .select('team_id')
          .in('team_id', teamIds);

        // Count members per team
        if (counts) {
          memberCounts = counts.reduce((acc: Record<string, number>, row: any) => {
            acc[row.team_id] = (acc[row.team_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // Transform response with member counts
      const teams = memberships?.map((m: any) => ({
        ...m.teams,
        role: m.role,
        member_count: memberCounts[m.team_id] || 0,
      })) || [];

      // Sort by updated_at descending
      teams.sort((a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return NextResponse.json({
        teams,
        totalCount: teams.length,
        filters: {
          limit: Math.min(limit, 100),
          offset,
        },
      });

    } catch (error: any) {
      console.error('[Teams API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to list teams', message: error.message },
        { status: 500 }
      );
    }
  });
}
