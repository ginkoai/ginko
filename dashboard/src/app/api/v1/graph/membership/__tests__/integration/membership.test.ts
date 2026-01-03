/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-03
 * @tags: [test, integration, rest-api, membership, sync, staleness, EPIC-008]
 * @related: [../../route.ts, ../../sync/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Graph Membership REST API (EPIC-008)
 *
 * Tests membership and sync tracking:
 * - GET /api/v1/graph/membership - Get user's team membership for a graph
 * - POST /api/v1/graph/membership/sync - Update last sync timestamp
 */

import { NextRequest } from 'next/server';
import { GET as GetMembership } from '../../route';
import { POST as UpdateSync } from '../../sync/route';

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

describe('Graph Membership API - Integration Tests (EPIC-008)', () => {
  const mockGraphId = 'gin_test_graph_123';
  const mockTeamId = 'team-456';
  const mockTeamName = 'Test Team';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chainable mock
    mockSupabaseTable = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };
  });

  describe('GET /api/v1/graph/membership - Get Membership', () => {
    it('should return membership for team member', async () => {
      const mockTeams = [{ id: mockTeamId, name: mockTeamName, graph_id: mockGraphId }];
      const mockMembership = {
        team_id: mockTeamId,
        role: 'member',
        created_at: '2026-01-01T00:00:00Z',
        last_sync_at: '2026-01-02T00:00:00Z',
        teams: { id: mockTeamId, name: mockTeamName },
      };

      // Mock teams query
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockMembership,
          error: null,
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isMember).toBe(true);
      expect(data.membership).toBeDefined();
      expect(data.membership.team_id).toBe(mockTeamId);
      expect(data.membership.role).toBe('member');
    });

    it('should return non-member status when no team exists for graph', async () => {
      // Mock empty teams response
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: [],
        error: null,
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isMember).toBe(false);
      expect(data.membership).toBeNull();
    });

    it('should return non-member status when user not in team', async () => {
      const mockTeams = [{ id: mockTeamId, name: mockTeamName, graph_id: mockGraphId }];

      // Mock teams exist but user not member
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows found
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isMember).toBe(false);
      expect(data.membership).toBeNull();
    });

    it('should return 400 for missing graphId', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/graph/membership', {
        method: 'GET',
      });

      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });

    it('should include last_sync_at in membership response', async () => {
      const lastSyncAt = '2026-01-02T12:00:00Z';
      const mockTeams = [{ id: mockTeamId, name: mockTeamName, graph_id: mockGraphId }];
      const mockMembership = {
        team_id: mockTeamId,
        role: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        last_sync_at: lastSyncAt,
        teams: { id: mockTeamId, name: mockTeamName },
      };

      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockMembership,
          error: null,
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.membership.last_sync_at).toBe(lastSyncAt);
    });
  });

  describe('POST /api/v1/graph/membership/sync - Update Sync Timestamp', () => {
    it('should update last_sync_at for team member', async () => {
      const mockTeams = [{ id: mockTeamId }];
      const updatedMembership = {
        team_id: mockTeamId,
        last_sync_at: new Date().toISOString(),
      };

      // Mock teams query
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
      });

      // Mock membership update
      mockSupabaseTable.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValueOnce({
          data: [updatedMembership],
          error: null,
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership/sync');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await UpdateSync(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.teams_updated).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom syncedAt timestamp', async () => {
      const customTimestamp = '2026-01-03T15:00:00Z';
      const mockTeams = [{ id: mockTeamId }];

      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
      });

      mockSupabaseTable.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValueOnce({
          data: [{ team_id: mockTeamId, last_sync_at: customTimestamp }],
          error: null,
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership/sync');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ syncedAt: customTimestamp }),
      });

      const response = await UpdateSync(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.synced_at).toBe(customTimestamp);
    });

    it('should return success even if no team exists', async () => {
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: [],
        error: null,
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership/sync');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'POST',
      });

      const response = await UpdateSync(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('No team membership');
    });

    it('should return 400 for missing graphId', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/graph/membership/sync', {
        method: 'POST',
      });

      const response = await UpdateSync(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership/sync');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'POST',
      });

      const response = await UpdateSync(request);
      const data = await response.json();

      // Should still succeed since no team = nothing to update
      expect(response.status).toBe(200);
    });
  });

  describe('Staleness Detection Integration', () => {
    it('should return null last_sync_at for never-synced member', async () => {
      const mockTeams = [{ id: mockTeamId, name: mockTeamName, graph_id: mockGraphId }];
      const mockMembership = {
        team_id: mockTeamId,
        role: 'member',
        created_at: '2026-01-01T00:00:00Z',
        last_sync_at: null, // Never synced
        teams: { id: mockTeamId, name: mockTeamName },
      };

      mockSupabaseTable.eq = jest.fn().mockReturnValue({
        data: mockTeams,
        error: null,
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockMembership,
          error: null,
        }),
      });

      const url = new URL('http://localhost:3000/api/v1/graph/membership');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetMembership(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isMember).toBe(true);
      expect(data.membership.last_sync_at).toBeNull();
    });

    it('should support different team roles', async () => {
      const testCases = ['owner', 'admin', 'member'];

      for (const role of testCases) {
        jest.clearAllMocks();

        const mockTeams = [{ id: mockTeamId, name: mockTeamName, graph_id: mockGraphId }];
        const mockMembership = {
          team_id: mockTeamId,
          role,
          created_at: '2026-01-01T00:00:00Z',
          last_sync_at: '2026-01-02T00:00:00Z',
          teams: { id: mockTeamId, name: mockTeamName },
        };

        mockSupabaseTable.eq = jest.fn().mockReturnValue({
          data: mockTeams,
          error: null,
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({
            data: mockMembership,
            error: null,
          }),
        });

        const url = new URL('http://localhost:3000/api/v1/graph/membership');
        url.searchParams.set('graphId', mockGraphId);

        const request = new NextRequest(url, { method: 'GET' });
        const response = await GetMembership(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.membership.role).toBe(role);
      }
    });
  });
});
