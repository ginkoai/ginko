/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, members, rest-api, task-022, authorization]
 * @related: [../route.ts, [userId]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/projects/[id]/members - Add member (owners only)
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface AddMemberRequest {
  user_id: string;
  role?: 'owner' | 'member';
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
 * POST /api/v1/projects/[id]/members
 * Add member to project (owners only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const body: AddMemberRequest = await request.json();

      // Validate required fields
      if (!body.user_id) {
        return NextResponse.json(
          { error: 'Missing required field: user_id' },
          { status: 400 }
        );
      }

      // Check if requester is project owner
      const isOwner = await isProjectOwner(supabase, projectId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only project owners can add members' },
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

      // Verify target user exists
      const { data: targetUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email, github_username')
        .eq('id', body.user_id)
        .single();

      if (userError || !targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', body.user_id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a project member', currentRole: existingMember.role },
          { status: 409 }
        );
      }

      // Add member
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: body.user_id,
          role: body.role || 'member',
          granted_by: user.id,
        })
        .select()
        .single();

      if (memberError) {
        console.error('[Project Members API] Add member error:', memberError);
        return NextResponse.json(
          { error: 'Failed to add member', message: memberError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        member: {
          ...member,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            github_username: targetUser.github_username,
          },
        },
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Project Members API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to add member', message: error.message },
        { status: 500 }
      );
    }
  });
}
