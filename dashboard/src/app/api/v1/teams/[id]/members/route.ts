/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [teams, members, rest-api, epic-008, authorization, oauth-fallback]
 * @related: [../route.ts, [userId]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * GET /api/v1/teams/[id]/members - List team members
 * POST /api/v1/teams/[id]/members - Add team member (owners only)
 *
 * EPIC-008: Team Collaboration Sprint 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface AddTeamMemberRequest {
  user_id: string;
  role?: 'owner' | 'member';
}

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
 * POST /api/v1/teams/[id]/members
 * Add member to team (owners only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const teamId = params.id;
      const body: AddTeamMemberRequest = await request.json();

      // Validate required fields
      if (!body.user_id) {
        return NextResponse.json(
          { error: 'Missing required field: user_id' },
          { status: 400 }
        );
      }

      // Check if requester is team owner
      const isOwner = await isTeamOwner(supabase, teamId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only team owners can add members' },
          { status: 403 }
        );
      }

      // Verify team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: 'Team not found' },
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
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', body.user_id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a team member', currentRole: existingMember.role },
          { status: 409 }
        );
      }

      // Add member
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: body.user_id,
          role: body.role || 'member',
        })
        .select()
        .single();

      if (memberError) {
        console.error('[Team Members API] Add member error:', memberError);
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
      console.error('[Team Members API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to add member', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * Helper: Check if user is team member
 */
async function isTeamMember(
  supabase: any,
  teamId: string,
  userId: string
): Promise<{ isMember: boolean; role?: string }> {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return { isMember: !!data, role: data?.role };
}

/**
 * GET /api/v1/teams/[id]/members
 * List team members (members can view, includes status)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (user, supabase) => {
    try {
      const teamId = params.id;

      // Check if requester is team member
      const { isMember } = await isTeamMember(supabase, teamId, user.id);
      if (!isMember) {
        return NextResponse.json(
          { error: 'Only team members can view the member list' },
          { status: 403 }
        );
      }

      // Get team members
      const { data: members, error: memberError } = await supabase
        .from('team_members')
        .select('user_id, role, created_at, invited_by')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (memberError) {
        console.error('[Team Members API] List members error:', memberError);
        return NextResponse.json(
          { error: 'Failed to list members', message: memberError.message },
          { status: 500 }
        );
      }

      // Get user profiles for all members
      const userIds = members?.map((m: any) => m.user_id) || [];
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('user_profiles')
            .select('id, email, github_username, full_name')
            .in('id', userIds)
        : { data: [] };

      // Create lookup map
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      // Find users with missing profile data (no profile, or missing github_username/full_name)
      const usersWithMissingData = userIds.filter((id: string) => {
        const profile = profileMap.get(id);
        // No profile at all, or profile missing key fields
        return !profile || !profile.github_username || !profile.full_name;
      });

      // Fetch auth.users metadata for users with missing data (service role required)
      let authUserMap = new Map<string, any>();
      if (usersWithMissingData.length > 0) {
        try {
          const serviceClient = createServiceRoleClient();
          const { data: authUsers } = await serviceClient.auth.admin.listUsers();

          // Build lookup map for users we need
          const needsDataSet = new Set(usersWithMissingData);
          authUsers?.users?.forEach((authUser: any) => {
            if (needsDataSet.has(authUser.id)) {
              authUserMap.set(authUser.id, authUser.user_metadata || {});
            }
          });
        } catch (authError) {
          // Log but don't fail - profile data is preferred anyway
          console.error('[Team Members API] Auth users fallback error:', authError);
        }
      }

      // Transform response with fallback to auth.users metadata
      const formattedMembers = members?.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        const authMetadata = authUserMap.get(m.user_id) || {};

        // Prefer profile data, fall back to auth metadata
        const githubUsername = profile?.github_username || authMetadata.user_name;
        const fullName = profile?.full_name || authMetadata.full_name || authMetadata.name;
        const email = profile?.email || authMetadata.email;

        // Construct GitHub avatar URL if username available
        const avatarUrl = githubUsername
          ? `https://github.com/${githubUsername}.png`
          : null;

        // Always return user object if we have any data (profile or auth metadata)
        const hasAnyData = profile || Object.keys(authMetadata).length > 0;

        return {
          user_id: m.user_id,
          role: m.role,
          joined_at: m.created_at,
          invited_by: m.invited_by,
          user: hasAnyData ? {
            id: profile?.id || m.user_id,
            email: email,
            github_username: githubUsername,
            full_name: fullName,
            avatar_url: avatarUrl,
          } : null,
        };
      }) || [];

      return NextResponse.json({
        members: formattedMembers,
        count: formattedMembers.length,
      });

    } catch (error: any) {
      console.error('[Team Members API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to list members', message: error.message },
        { status: 500 }
      );
    }
  });
}
