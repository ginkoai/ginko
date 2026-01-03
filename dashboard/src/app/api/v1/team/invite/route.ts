/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [teams, invitation, rest-api, epic-008, authorization]
 * @related: [../join/route.ts, ../../teams/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase, crypto]
 */

/**
 * POST /api/v1/team/invite - Create team invitation
 * GET /api/v1/team/invite - List pending invitations for a team
 * DELETE /api/v1/team/invite - Revoke an invitation
 *
 * EPIC-008: Team Collaboration Sprint 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { randomBytes } from 'crypto';

interface CreateInviteRequest {
  team_id: string;
  email: string;
  role?: 'owner' | 'admin' | 'member';
  expires_in_days?: number;
}

interface RevokeInviteRequest {
  code: string;
}

/**
 * Generate a secure invite code
 */
function generateInviteCode(): string {
  return randomBytes(6).toString('hex'); // 12-char hex code
}

/**
 * Helper: Check if user is team owner or admin
 */
async function canManageTeam(
  supabase: any,
  teamId: string,
  userId: string
): Promise<{ canManage: boolean; role?: string }> {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  const role = data?.role;
  const canManage = role === 'owner' || role === 'admin';
  return { canManage, role };
}

/**
 * POST /api/v1/team/invite
 * Create a new invitation (team owners/admins only)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: CreateInviteRequest = await request.json();

      // Validate required fields
      if (!body.team_id) {
        return NextResponse.json(
          { error: 'Missing required field: team_id' },
          { status: 400 }
        );
      }

      if (!body.email || !body.email.includes('@')) {
        return NextResponse.json(
          { error: 'Missing or invalid required field: email' },
          { status: 400 }
        );
      }

      // Check if requester can manage team
      const { canManage, role: userRole } = await canManageTeam(supabase, body.team_id, user.id);
      if (!canManage) {
        return NextResponse.json(
          { error: 'Only team owners and admins can invite members' },
          { status: 403 }
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

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', body.team_id)
        .eq('user_id', (
          await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', body.email.toLowerCase())
            .single()
        ).data?.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a team member', currentRole: existingMember.role },
          { status: 409 }
        );
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('team_invitations')
        .select('code, expires_at, status')
        .eq('team_id', body.team_id)
        .eq('email', body.email.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return NextResponse.json(
          {
            error: 'An invitation is already pending for this email',
            existing_code: existingInvite.code,
            expires_at: existingInvite.expires_at
          },
          { status: 409 }
        );
      }

      // Generate invite code
      const code = generateInviteCode();
      const expiresInDays = body.expires_in_days || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Admins can only invite members, not owners
      let inviteRole = body.role || 'member';
      if (userRole === 'admin' && inviteRole === 'owner') {
        return NextResponse.json(
          { error: 'Admins cannot invite new owners. Only owners can do that.' },
          { status: 403 }
        );
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          code,
          team_id: body.team_id,
          email: body.email.toLowerCase(),
          role: inviteRole,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          inviter_id: user.id,
        })
        .select()
        .single();

      if (inviteError) {
        console.error('[Team Invite API] Create invitation error:', inviteError);
        return NextResponse.json(
          { error: 'Failed to create invitation', message: inviteError.message },
          { status: 500 }
        );
      }

      // TODO: Send email notification (defer to Phase 2)

      return NextResponse.json({
        success: true,
        invitation: {
          code: invitation.code,
          team_id: invitation.team_id,
          team_name: team.name,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          inviter: {
            id: user.id,
            email: user.email,
          },
        },
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Team Invite API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create invitation', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/team/invite
 * List pending invitations for a team (owners/admins only)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const teamId = searchParams.get('team_id');

      if (!teamId) {
        return NextResponse.json(
          { error: 'Missing required parameter: team_id' },
          { status: 400 }
        );
      }

      // Check if requester can manage team
      const { canManage } = await canManageTeam(supabase, teamId, user.id);
      if (!canManage) {
        return NextResponse.json(
          { error: 'Only team owners and admins can view invitations' },
          { status: 403 }
        );
      }

      // Get pending invitations
      const { data: invitations, error: inviteError } = await supabase
        .from('team_invitations')
        .select(`
          code,
          email,
          role,
          status,
          expires_at,
          created_at,
          inviter_id,
          user_profiles!team_invitations_inviter_id_fkey(email, github_username)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (inviteError) {
        console.error('[Team Invite API] List invitations error:', inviteError);
        return NextResponse.json(
          { error: 'Failed to list invitations', message: inviteError.message },
          { status: 500 }
        );
      }

      // Transform response
      const formattedInvitations = invitations?.map((inv: any) => ({
        code: inv.code,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        inviter: inv.user_profiles ? {
          email: inv.user_profiles.email,
          github_username: inv.user_profiles.github_username,
        } : null,
      })) || [];

      return NextResponse.json({
        invitations: formattedInvitations,
        count: formattedInvitations.length,
      });

    } catch (error: any) {
      console.error('[Team Invite API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to list invitations', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/v1/team/invite
 * Revoke an invitation (owners/admins only)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: RevokeInviteRequest = await request.json();

      if (!body.code) {
        return NextResponse.json(
          { error: 'Missing required field: code' },
          { status: 400 }
        );
      }

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('team_id, status')
        .eq('code', body.code)
        .single();

      if (inviteError || !invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        );
      }

      if (invitation.status !== 'pending') {
        return NextResponse.json(
          { error: `Invitation cannot be revoked (status: ${invitation.status})` },
          { status: 400 }
        );
      }

      // Check if requester can manage team
      const { canManage } = await canManageTeam(supabase, invitation.team_id, user.id);
      if (!canManage) {
        return NextResponse.json(
          { error: 'Only team owners and admins can revoke invitations' },
          { status: 403 }
        );
      }

      // Revoke invitation
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('code', body.code);

      if (updateError) {
        console.error('[Team Invite API] Revoke invitation error:', updateError);
        return NextResponse.json(
          { error: 'Failed to revoke invitation', message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation revoked',
      });

    } catch (error: any) {
      console.error('[Team Invite API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to revoke invitation', message: error.message },
        { status: 500 }
      );
    }
  });
}
