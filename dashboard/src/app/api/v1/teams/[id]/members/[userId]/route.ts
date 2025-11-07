/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [teams, members, rest-api, task-022, authorization]
 * @related: [../route.ts, ../../route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * DELETE /api/v1/teams/[id]/members/[userId] - Remove team member
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

/**
 * Helper: Check if user is team owner
 */
async function isTeamOwner(
  supabase: any,
  teamId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return data?.role === 'owner';
}

/**
 * Helper: Count team owners
 */
async function countTeamOwners(
  supabase: any,
  teamId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id', { count: 'exact' })
    .eq('team_id', teamId)
    .eq('role', 'owner');

  if (error) {
    console.error('[Team Members API] Count owners error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * DELETE /api/v1/teams/[id]/members/[userId]
 * Remove member from team
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const teamId = params.id;
      const targetUserId = params.userId;

      // Check if requester is team owner
      const isOwner = await isTeamOwner(supabase, teamId, user.id);

      // User can remove themselves, or owners can remove others
      const isSelfRemoval = targetUserId === user.id;
      if (!isOwner && !isSelfRemoval) {
        return NextResponse.json(
          { error: 'Only team owners can remove other members' },
          { status: 403 }
        );
      }

      // Get member to be removed
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', targetUserId)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'Member not found in team' },
          { status: 404 }
        );
      }

      // If removing an owner, ensure at least one owner remains
      if (member.role === 'owner') {
        const ownerCount = await countTeamOwners(supabase, teamId);
        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner. Team must have at least one owner.' },
            { status: 400 }
          );
        }
      }

      // Remove member
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('[Team Members API] Remove member error:', deleteError);
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
      console.error('[Team Members API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to remove member', message: error.message },
        { status: 500 }
      );
    }
  });
}
