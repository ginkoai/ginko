/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, teams, rest-api, task-022, authorization]
 * @related: [../route.ts, [teamId]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/projects/[id]/teams - Grant team access to project (owners only)
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface GrantTeamAccessRequest {
  team_id: string;
}

/**
 * Helper: Check if user is project owner
 */
async function isProjectOwner(
  supabase: any,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return data?.role === 'owner';
}

/**
 * POST /api/v1/projects/[id]/teams
 * Grant team access to project (owners only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const body: GrantTeamAccessRequest = await request.json();

      // Validate required fields
      if (!body.team_id) {
        return NextResponse.json(
          { error: 'Missing required field: team_id' },
          { status: 400 }
        );
      }

      // Check if requester is project owner
      const isOwner = await isProjectOwner(supabase, projectId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only project owners can grant team access' },
          { status: 403 }
        );
      }

      // Verify project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Verify team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', body.team_id)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }

      // Check if team already has access
      const { data: existingAccess } = await supabase
        .from('project_teams')
        .select('*')
        .eq('project_id', projectId)
        .eq('team_id', body.team_id)
        .single();

      if (existingAccess) {
        return NextResponse.json(
          { error: 'Team already has access to this project' },
          { status: 409 }
        );
      }

      // Grant team access
      const { data: projectTeam, error: grantError } = await supabase
        .from('project_teams')
        .insert({
          project_id: projectId,
          team_id: body.team_id,
          granted_by: user.id,
        })
        .select()
        .single();

      if (grantError) {
        console.error('[Project Teams API] Grant access error:', grantError);
        return NextResponse.json(
          { error: 'Failed to grant team access', message: grantError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        project_team: {
          ...projectTeam,
          team: {
            id: team.id,
            name: team.name,
          },
        },
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Project Teams API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to grant team access', message: error.message },
        { status: 500 }
      );
    }
  });
}
