/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, crud, rest-api, task-022, authorization]
 * @related: [../route.ts, members/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * GET /api/v1/projects/[id] - Get project details
 * PATCH /api/v1/projects/[id] - Update project (owners only)
 * DELETE /api/v1/projects/[id] - Delete project (owners only)
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  github_repo_url?: string;
  github_repo_id?: number;
  visibility?: 'public' | 'private';
  discoverable?: boolean;
}

/**
 * Helper: Check if user has access to project
 */
async function checkProjectAccess(
  supabase: any,
  projectId: string,
  userId: string,
  requiredRole?: 'owner' | 'member'
): Promise<{ hasAccess: boolean; role?: string; project?: any }> {
  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { hasAccess: false };
  }

  // Check if public project (read access)
  if (project.visibility === 'public' && !requiredRole) {
    return { hasAccess: true, role: 'public', project };
  }

  // Check direct membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (membership) {
    if (requiredRole && membership.role !== requiredRole) {
      return { hasAccess: false, role: membership.role, project };
    }
    return { hasAccess: true, role: membership.role, project };
  }

  // Check team access
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  const teamIds = teamMemberships?.map((tm: any) => tm.team_id) || [];

  if (teamIds.length > 0) {
    const { data: teamAccess } = await supabase
      .from('project_teams')
      .select('*')
      .eq('project_id', projectId)
      .in('team_id', teamIds)
      .limit(1);

    if (teamAccess && teamAccess.length > 0) {
      // Team members only get 'member' role
      if (requiredRole === 'owner') {
        return { hasAccess: false, role: 'member', project };
      }
      return { hasAccess: true, role: 'member', project };
    }
  }

  return { hasAccess: false, project };
}

/**
 * GET /api/v1/projects/[id]
 * Get project details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;

      const access = await checkProjectAccess(supabase, projectId, user.id);

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }

      // Get project members
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id, role, granted_at, granted_by')
        .eq('project_id', projectId);

      // Get project teams
      const { data: teams } = await supabase
        .from('project_teams')
        .select('team_id, granted_at, granted_by, teams(id, name)')
        .eq('project_id', projectId);

      return NextResponse.json({
        project: {
          ...access.project,
          user_role: access.role,
        },
        members: members || [],
        teams: teams || [],
      });

    } catch (error: any) {
      console.error('[Projects API] GET by ID error:', error);
      return NextResponse.json(
        { error: 'Failed to get project', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/v1/projects/[id]
 * Update project (owners only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const body: UpdateProjectRequest = await request.json();

      // Validate at least one field to update
      if (Object.keys(body).length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      // Check owner access
      const access = await checkProjectAccess(supabase, projectId, user.id, 'owner');

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: 'Project not found or insufficient permissions' },
          { status: access.role ? 403 : 404 }
        );
      }

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) {
        if (body.name.trim().length === 0) {
          return NextResponse.json(
            { error: 'Project name cannot be empty' },
            { status: 400 }
          );
        }
        updates.name = body.name.trim();
      }
      if (body.description !== undefined) updates.description = body.description;
      if (body.github_repo_url !== undefined) updates.github_repo_url = body.github_repo_url;
      if (body.github_repo_id !== undefined) updates.github_repo_id = body.github_repo_id;
      if (body.visibility !== undefined) updates.visibility = body.visibility;
      if (body.discoverable !== undefined) updates.discoverable = body.discoverable;

      // Update project
      const { data: project, error: updateError } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (updateError) {
        console.error('[Projects API] Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update project', message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        project: {
          ...project,
          user_role: 'owner',
        },
      });

    } catch (error: any) {
      console.error('[Projects API] PATCH error:', error);
      return NextResponse.json(
        { error: 'Failed to update project', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/v1/projects/[id]
 * Delete project (owners only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;

      // Check owner access
      const access = await checkProjectAccess(supabase, projectId, user.id, 'owner');

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: 'Project not found or insufficient permissions' },
          { status: access.role ? 403 : 404 }
        );
      }

      // Delete project (cascades to project_members and project_teams)
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.error('[Projects API] Delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete project', message: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        deletedProjectId: projectId,
      });

    } catch (error: any) {
      console.error('[Projects API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete project', message: error.message },
        { status: 500 }
      );
    }
  });
}
