/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-07
 * @tags: [test, integration, rest-api, teams, task-022]
 * @related: [../../route.ts, ../../[id]/members/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Teams REST API
 *
 * Tests all CRUD endpoints:
 * - POST /api/v1/teams - Create team
 * - GET /api/v1/teams - List teams
 * - POST /api/v1/teams/[id]/members - Add team member
 * - DELETE /api/v1/teams/[id]/members/[userId] - Remove team member
 */

import { NextRequest } from 'next/server';
import { POST as CreateTeam, GET as ListTeams } from '../../route';
import { POST as AddTeamMember } from '../../[id]/members/route';
import { DELETE as RemoveTeamMember } from '../../[id]/members/[userId]/route';

// Mock auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (request: any, handler: Function) => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      github_username: 'testuser',
    };
    const mockSupabase = {
      from: jest.fn((table: string) => mockSupabaseTable),
    };
    return handler(mockUser, mockSupabase);
  },
}));

let mockSupabaseTable: any;

describe('Teams REST API - Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };
  const mockTeamId = 'team-456';
  const mockUserId2 = 'user-999';

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
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };
  });

  describe('POST /api/v1/teams - Create Team', () => {
    it('should create a new team successfully', async () => {
      const mockTeam = {
        id: mockTeamId,
        name: 'Engineering Team',
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockTeam, error: null }) // team insert
        .mockResolvedValueOnce({ data: {}, error: null }); // member insert

      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Engineering Team',
        }),
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.team.name).toBe('Engineering Team');
      expect(data.team.role).toBe('owner');
    });

    it('should return 400 for missing name', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('should return 400 for empty name', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '   ' }),
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('should handle database errors during creation', async () => {
      mockSupabaseTable.single
        .mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test Team' }),
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create team');
    });
  });

  describe('GET /api/v1/teams - List Teams', () => {
    it('should list user teams', async () => {
      const mockTeams = [
        {
          team_id: 'team-1',
          role: 'owner',
          teams: { id: 'team-1', name: 'Team Alpha', updated_at: new Date().toISOString() },
        },
        {
          team_id: 'team-2',
          role: 'member',
          teams: { id: 'team-2', name: 'Team Beta', updated_at: new Date().toISOString() },
        },
      ];

      mockSupabaseTable.single.mockResolvedValueOnce({ data: mockTeams, error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'GET',
      });

      const response = await ListTeams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.teams).toBeDefined();
      expect(data.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array if user has no teams', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: [], error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'GET',
      });

      const response = await ListTeams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.teams).toEqual([]);
      expect(data.totalCount).toBe(0);
    });

    it('should support pagination', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: [], error: null });

      const url = new URL('http://localhost:3000/api/v1/teams');
      url.searchParams.set('limit', '10');
      url.searchParams.set('offset', '20');

      const request = new NextRequest(url, { method: 'GET' });
      const response = await ListTeams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.limit).toBe(10);
      expect(data.filters.offset).toBe(20);
    });

    it('should cap limit at 100', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: [], error: null });

      const url = new URL('http://localhost:3000/api/v1/teams');
      url.searchParams.set('limit', '500');

      const request = new NextRequest(url, { method: 'GET' });
      const response = await ListTeams(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.limit).toBe(100);
    });
  });

  describe('POST /api/v1/teams/[id]/members - Add Team Member', () => {
    it('should add member as team owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Test Team' }, error: null }) // verify team
        .mockResolvedValueOnce({ data: { id: mockUserId2, email: 'user2@example.com' }, error: null }) // verify user
        .mockResolvedValueOnce({ data: null, error: null }) // check existing
        .mockResolvedValueOnce({ data: { team_id: mockTeamId, user_id: mockUserId2, role: 'member' }, error: null }); // insert

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.member.user_id).toBe(mockUserId2);
    });

    it('should return 400 for missing user_id', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('user_id');
    });

    it('should return 403 for non-owner', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });

    it('should return 404 for non-existent team', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Team not found' } });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Team not found');
    });

    it('should return 404 for non-existent user', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockTeamId }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'User not found' } });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('User not found');
    });

    it('should return 409 if user already member', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockTeamId }, error: null })
        .mockResolvedValueOnce({ data: { id: mockUserId2 }, error: null })
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }); // existing member

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already');
    });

    it('should allow adding member with owner role', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockTeamId }, error: null })
        .mockResolvedValueOnce({ data: { id: mockUserId2 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { team_id: mockTeamId, user_id: mockUserId2, role: 'owner' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2, role: 'owner' }),
      });

      const response = await AddTeamMember(request, { params: { id: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.member.role).toBe('owner');
    });
  });

  describe('DELETE /api/v1/teams/[id]/members/[userId] - Remove Team Member', () => {
    it('should remove member as team owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // get member
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUserId2}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUserId2 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.removedUserId).toBe(mockUserId2);
    });

    it('should allow self-removal', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // check membership (not owner)
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // get member
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUser.id}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUser.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 403 for non-owner removing others', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUserId2}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUserId2 } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });

    it('should return 404 for non-existent member', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUserId2}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUserId2 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should prevent removing last owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // member is owner

      mockSupabaseTable.single.mockResolvedValueOnce({ data: [{ user_id: mockUser.id }], error: null }); // count = 1

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUser.id}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUser.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('last owner');
    });

    it('should verify owner count before allowing removal', async () => {
      // This test verifies the logic exists, even if mocking is complex
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // member is owner

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: [{ user_id: mockUser.id }], error: null }); // count = 1 (last owner)

      const request = new NextRequest(`http://localhost:3000/api/v1/teams/${mockTeamId}/members/${mockUser.id}`, {
        method: 'DELETE',
      });

      const response = await RemoveTeamMember(request, { params: { id: mockTeamId, userId: mockUser.id } });
      const data = await response.json();

      // Should reject removal of last owner
      expect(response.status).toBe(400);
      expect(data.error).toContain('last owner');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseTable.single.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test Team' }),
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create team');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await CreateTeam(request);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
