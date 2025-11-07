/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, teams, rest-api, task-022, authorization]
 * @related: [../route.ts, ../../route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * DELETE /api/v1/projects/[id]/teams/[teamId] - Revoke team access (owners only)
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

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
 * DELETE /api/v1/projects/[id]/teams/[teamId]
 * Revoke team access from project (owners only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; teamId: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const teamId = params.teamId;

      // Check if requester is project owner
      const isOwner = await isProjectOwner(supabase, projectId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only project owners can revoke team access' },
          { status: 403 }
        );
      }

      // Verify project-team relationship exists
      const { data: projectTeam, error: projectTeamError } = await supabase
        .from('project_teams')
        .select('*')
        .eq('project_id', projectId)
        .eq('team_id', teamId)
        .single();

      if (projectTeamError || !projectTeam) {
        return NextResponse.json(
          { error: 'Team does not have access to this project' },
          { status: 404 }
        );
      }

      // Revoke team access
      const { error: deleteError } = await supabase
        .from('project_teams')
        .delete()
        .eq('project_id', projectId)
        .eq('team_id', teamId);

      if (deleteError) {
        console.error('[Project Teams API] Revoke access error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to revoke team access', message: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        revokedTeamId: teamId,
      });

    } catch (error: any) {
      console.error('[Project Teams API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to revoke team access', message: error.message },
        { status: 500 }
      );
    }
  });
}
