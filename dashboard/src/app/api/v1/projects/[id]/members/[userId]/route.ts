/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, members, rest-api, task-022, authorization]
 * @related: [../route.ts, ../../route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * PATCH /api/v1/projects/[id]/members/[userId] - Change member role (owners only)
 * DELETE /api/v1/projects/[id]/members/[userId] - Remove member
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface UpdateMemberRequest {
  role: 'owner' | 'member';
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
 * Helper: Count project owners
 */
async function countProjectOwners(
  supabase: any,
  projectId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('project_members')
    .select('user_id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('role', 'owner');

  if (error) {
    console.error('[Project Members API] Count owners error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * PATCH /api/v1/projects/[id]/members/[userId]
 * Change member role (owners only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const targetUserId = params.userId;
      const body: UpdateMemberRequest = await request.json();

      // Validate required fields
      if (!body.role || !['owner', 'member'].includes(body.role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be "owner" or "member"' },
          { status: 400 }
        );
      }

      // Check if requester is project owner
      const isOwner = await isProjectOwner(supabase, projectId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only project owners can change member roles' },
          { status: 403 }
        );
      }

      // Get current member role
      const { data: currentMember, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .single();

      if (memberError || !currentMember) {
        return NextResponse.json(
          { error: 'Member not found in project' },
          { status: 404 }
        );
      }

      // If demoting from owner to member, ensure at least one owner remains
      if (currentMember.role === 'owner' && body.role === 'member') {
        const ownerCount = await countProjectOwners(supabase, projectId);
        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot demote the last owner. Project must have at least one owner.' },
            { status: 400 }
          );
        }
      }

      // Update member role
      const { data: updatedMember, error: updateError } = await supabase
        .from('project_members')
        .update({ role: body.role })
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (updateError) {
        console.error('[Project Members API] Update role error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update member role', message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        member: updatedMember,
      });

    } catch (error: any) {
      console.error('[Project Members API] PATCH error:', error);
      return NextResponse.json(
        { error: 'Failed to update member role', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/v1/projects/[id]/members/[userId]
 * Remove member from project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const projectId = params.id;
      const targetUserId = params.userId;

      // Check if requester is project owner
      const isOwner = await isProjectOwner(supabase, projectId, user.id);

      // User can remove themselves, or owners can remove others
      const isSelfRemoval = targetUserId === user.id;
      if (!isOwner && !isSelfRemoval) {
        return NextResponse.json(
          { error: 'Only project owners can remove other members' },
          { status: 403 }
        );
      }

      // Get member to be removed
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'Member not found in project' },
          { status: 404 }
        );
      }

      // If removing an owner, ensure at least one owner remains
      if (member.role === 'owner') {
        const ownerCount = await countProjectOwners(supabase, projectId);
        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner. Project must have at least one owner.' },
            { status: 400 }
          );
        }
      }

      // Remove member
      const { error: deleteError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('[Project Members API] Remove member error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove member', message: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        removedUserId: targetUserId,
      });

    } catch (error: any) {
      console.error('[Project Members API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to remove member', message: error.message },
        { status: 500 }
      );
    }
  });
}
