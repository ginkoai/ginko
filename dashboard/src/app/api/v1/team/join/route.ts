/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [teams, join, invitation, rest-api, epic-008]
 * @related: [../invite/route.ts, ../../teams/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/team/join - Accept team invitation via code
 * GET /api/v1/team/join - Validate invitation code (preview before joining)
 *
 * EPIC-008: Team Collaboration Sprint 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface JoinTeamRequest {
  code: string;
}

/**
 * GET /api/v1/team/join
 * Validate invitation code and preview team details (no auth required for preview)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const code = searchParams.get('code');

      if (!code) {
        return NextResponse.json(
          { error: 'Missing required parameter: code' },
          { status: 400 }
        );
      }

      // Look up invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select(`
          code,
          email,
          role,
          status,
          expires_at,
          team_id,
          teams(id, name, created_at)
        `)
        .eq('code', code)
        .single();

      if (inviteError || !invitation) {
        return NextResponse.json(
          { error: 'Invalid invitation code' },
          { status: 404 }
        );
      }

      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          {
            error: `Invitation is no longer valid (status: ${invitation.status})`,
            status: invitation.status,
          },
          { status: 400 }
        );
      }

      // Check expiration
      if (new Date(invitation.expires_at) < new Date()) {
        // Update status to expired
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('code', code);

        return NextResponse.json(
          { error: 'Invitation has expired', status: 'expired' },
          { status: 400 }
        );
      }

      // Check if invitation is for this user's email
      const isForUser = invitation.email.toLowerCase() === user.email.toLowerCase();

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        valid: true,
        invitation: {
          code: invitation.code,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
          is_for_current_user: isForUser,
        },
        team: {
          id: invitation.teams.id,
          name: invitation.teams.name,
          created_at: invitation.teams.created_at,
        },
        already_member: existingMember !== null,
        current_role: existingMember?.role || null,
      });

    } catch (error: any) {
      console.error('[Team Join API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to validate invitation', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/v1/team/join
 * Accept invitation and join team
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: JoinTeamRequest = await request.json();

      if (!body.code) {
        return NextResponse.json(
          { error: 'Missing required field: code' },
          { status: 400 }
        );
      }

      // Look up invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select(`
          code,
          email,
          role,
          status,
          expires_at,
          team_id,
          inviter_id,
          teams(id, name)
        `)
        .eq('code', body.code)
        .single();

      if (inviteError || !invitation) {
        return NextResponse.json(
          { error: 'Invalid invitation code' },
          { status: 404 }
        );
      }

      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          {
            error: `Invitation is no longer valid (status: ${invitation.status})`,
            status: invitation.status,
          },
          { status: 400 }
        );
      }

      // Check expiration
      if (new Date(invitation.expires_at) < new Date()) {
        // Update status to expired
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('code', body.code);

        return NextResponse.json(
          { error: 'Invitation has expired', status: 'expired' },
          { status: 400 }
        );
      }

      // Verify invitation is for this user's email (or allow any authenticated user)
      // For now, we allow any authenticated user to accept any valid invitation
      // This supports scenarios where users sign up with a different email
      const isEmailMatch = invitation.email.toLowerCase() === user.email.toLowerCase();

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          {
            error: 'You are already a member of this team',
            currentRole: existingMember.role,
          },
          { status: 409 }
        );
      }

      // Add user to team
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.inviter_id,
        })
        .select()
        .single();

      if (memberError) {
        console.error('[Team Join API] Add member error:', memberError);
        return NextResponse.json(
          { error: 'Failed to join team', message: memberError.message },
          { status: 500 }
        );
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('code', body.code);

      if (updateError) {
        console.error('[Team Join API] Update invitation error:', updateError);
        // Don't fail - membership was already created
      }

      return NextResponse.json({
        success: true,
        message: `Successfully joined team: ${invitation.teams.name}`,
        membership: {
          team_id: invitation.team_id,
          team_name: invitation.teams.name,
          role: invitation.role,
          joined_at: member.created_at,
        },
        email_matched: isEmailMatch,
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Team Join API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to join team', message: error.message },
        { status: 500 }
      );
    }
  });
}
