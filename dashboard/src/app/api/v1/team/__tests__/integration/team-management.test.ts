/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-03
 * @tags: [test, integration, rest-api, team, invite, join, EPIC-008]
 * @related: [../../invite/route.ts, ../../join/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Team Management REST API (EPIC-008)
 *
 * Tests invite and join flows:
 * - POST /api/v1/team/invite - Create invitation
 * - GET /api/v1/team/invite - List pending invitations
 * - DELETE /api/v1/team/invite - Revoke invitation
 * - POST /api/v1/team/join - Accept invitation
 */

import { NextRequest } from 'next/server';
import {
  POST as CreateInvite,
  GET as ListInvites,
  DELETE as RevokeInvite,
} from '../../invite/route';
import { POST as JoinTeam } from '../../join/route';

// Mock auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (request: any, handler: Function) => {
    const mockUser = {
      id: 'user-owner-123',
      email: 'owner@example.com',
      github_username: 'teamowner',
    };
    const mockSupabase = {
      from: jest.fn((table: string) => mockSupabaseTable),
    };
    return handler(mockUser, mockSupabase);
  },
}));

let mockSupabaseTable: any;

describe('Team Management API - Integration Tests (EPIC-008)', () => {
  const mockTeamId = 'team-456';
  const mockInviteCode = 'abc123def456';
  const mockInviteeEmail = 'newuser@example.com';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chainable mock
    mockSupabaseTable = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
  });

  describe('POST /api/v1/team/invite - Create Invitation', () => {
    it('should create invitation as team owner', async () => {
      const mockInvitation = {
        code: mockInviteCode,
        team_id: mockTeamId,
        email: mockInviteeEmail,
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // canManageTeam
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Test Team' }, error: null }) // team exists
        .mockResolvedValueOnce({ data: null, error: null }) // user lookup for existing member check
        .mockResolvedValueOnce({ data: null, error: null }) // no existing invitation
        .mockResolvedValueOnce({ data: mockInvitation, error: null }); // create invitation

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: mockInviteeEmail,
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.invitation.email).toBe(mockInviteeEmail);
      expect(data.invitation.role).toBe('member');
    });

    it('should return 400 for missing team_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: mockInviteeEmail,
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('team_id');
    });

    it('should return 400 for invalid email', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: 'invalid-email',
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('should return 403 for non-owner/admin', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }); // canManageTeam - not owner

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: mockInviteeEmail,
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });

    it('should return 404 for non-existent team', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: mockInviteeEmail,
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Team not found');
    });

    it('should return 409 if user already a member', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Test Team' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'existing-user' }, error: null }) // user exists
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }); // already a member

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: 'existing@example.com',
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already');
    });

    it('should return 409 if invitation already pending', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Test Team' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }) // user lookup
        .mockResolvedValueOnce({ data: { code: 'existing-code' }, error: null }); // existing invitation

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: mockInviteeEmail,
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('pending');
    });

    it('should prevent admins from inviting owners', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null }) // canManageTeam - admin
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Test Team' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          team_id: mockTeamId,
          email: mockInviteeEmail,
          role: 'owner',
        }),
      });

      const response = await CreateInvite(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Admins cannot invite');
    });
  });

  describe('GET /api/v1/team/invite - List Invitations', () => {
    it('should list pending invitations for team owner', async () => {
      const mockInvitations = [
        {
          code: 'invite1',
          email: 'user1@example.com',
          role: 'member',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          inviter_id: 'user-owner-123',
          user_profiles: { email: 'owner@example.com', github_username: 'owner' },
        },
      ];

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // canManageTeam

      // For the order() call that returns the invitations
      mockSupabaseTable.order = jest.fn().mockResolvedValueOnce({
        data: mockInvitations,
        error: null,
      });

      const url = new URL('http://localhost:3000/api/v1/team/invite');
      url.searchParams.set('team_id', mockTeamId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await ListInvites(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toBeDefined();
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 for missing team_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'GET',
      });

      const response = await ListInvites(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('team_id');
    });

    it('should return 403 for non-owner/admin', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const url = new URL('http://localhost:3000/api/v1/team/invite');
      url.searchParams.set('team_id', mockTeamId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await ListInvites(request);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/team/invite - Revoke Invitation', () => {
    it('should revoke pending invitation as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { team_id: mockTeamId, status: 'pending' }, error: null }) // get invitation
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // canManageTeam

      mockSupabaseTable.eq = jest.fn().mockReturnThis();
      mockSupabaseTable.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: mockInviteCode }),
      });

      const response = await RevokeInvite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for missing code', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RevokeInvite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('code');
    });

    it('should return 404 for non-existent invitation', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'nonexistent' }),
      });

      const response = await RevokeInvite(request);
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('should return 400 for non-pending invitation', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { team_id: mockTeamId, status: 'accepted' }, error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/team/invite', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: mockInviteCode }),
      });

      const response = await RevokeInvite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot be revoked');
    });
  });

  describe('POST /api/v1/team/join - Accept Invitation', () => {
    it('should join team with valid invitation code', async () => {
      const mockInvitation = {
        code: mockInviteCode,
        team_id: mockTeamId,
        email: 'owner@example.com',
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockMembership = {
        team_id: mockTeamId,
        user_id: 'user-owner-123',
        role: 'member',
        created_at: new Date().toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockInvitation, error: null }) // get invitation
        .mockResolvedValueOnce({ data: null, error: null }) // check existing membership
        .mockResolvedValueOnce({ data: mockMembership, error: null }) // create membership
        .mockResolvedValueOnce({ data: null, error: null }); // update invitation status

      const request = new NextRequest('http://localhost:3000/api/v1/team/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: mockInviteCode }),
      });

      const response = await JoinTeam(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.membership.team_id).toBe(mockTeamId);
    });

    it('should return 400 for missing code', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/team/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await JoinTeam(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('code');
    });

    it('should return 404 for invalid invitation code', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest('http://localhost:3000/api/v1/team/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'invalid-code' }),
      });

      const response = await JoinTeam(request);
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('should return 410 for expired invitation', async () => {
      const expiredInvitation = {
        code: mockInviteCode,
        team_id: mockTeamId,
        email: 'owner@example.com',
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() - 1000).toISOString(), // expired
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: expiredInvitation, error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/team/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: mockInviteCode }),
      });

      const response = await JoinTeam(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toContain('expired');
    });

    it('should return 409 if already a member', async () => {
      const mockInvitation = {
        code: mockInviteCode,
        team_id: mockTeamId,
        email: 'owner@example.com',
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockInvitation, error: null })
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }); // already member

      const request = new NextRequest('http://localhost:3000/api/v1/team/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: mockInviteCode }),
      });

      const response = await JoinTeam(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already');
    });
  });
});
