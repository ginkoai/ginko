/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-17
 * @tags: [test, integration, data-isolation, security, adhoc_260117_s01]
 * @related: [../../nodes/route.ts, ../../status/route.ts, ../../../lib/graph/access.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Data Isolation (ADR-060)
 *
 * Task: adhoc_260117_s01_t08
 *
 * Tests that verify:
 * 1. User A cannot query User B's graphId (returns 403)
 * 2. User A cannot see User B's team activity (returns 403)
 * 3. Unauthenticated requests are rejected (returns 401)
 */

import { NextRequest } from 'next/server';
import { GET as GetNodes } from '../../nodes/route';
import { GET as GetStatus } from '../../status/route';

// Mock resolveUserId to simulate different users
const mockResolveUserId = jest.fn();
jest.mock('@/lib/auth/resolve-user', () => ({
  resolveUserId: (token: string) => mockResolveUserId(token),
}));

// Mock Neo4j queries
const mockRunQuery = jest.fn();
const mockVerifyConnection = jest.fn().mockResolvedValue(true);
const mockGetSession = jest.fn();

jest.mock('../../_neo4j', () => ({
  runQuery: (...args: any[]) => mockRunQuery(...args),
  verifyConnection: () => mockVerifyConnection(),
  getSession: () => mockGetSession(),
}));

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

describe('Data Isolation Integration Tests (ADR-060)', () => {
  const USER_A = {
    userId: 'user-a-123',
    email: 'user-a@example.com',
  };

  const USER_B = {
    userId: 'user-b-456',
    email: 'user-b@example.com',
  };

  const GRAPH_A = {
    graphId: 'gin_project_a_123',
    userId: USER_A.userId,
    projectName: 'Project A',
    visibility: 'private',
  };

  const GRAPH_B = {
    graphId: 'gin_project_b_456',
    userId: USER_B.userId,
    projectName: 'Project B',
    visibility: 'private',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Neo4j is connected
    mockVerifyConnection.mockResolvedValue(true);
  });

  // =========================================================================
  // Test: Unauthenticated requests are rejected
  // =========================================================================
  describe('Unauthenticated Requests', () => {
    it('should reject requests without Authorization header (401)', async () => {
      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', GRAPH_A.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        // No Authorization header
      });

      const response = await GetNodes(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should reject requests with invalid Bearer token (401)', async () => {
      mockResolveUserId.mockResolvedValue({ error: 'Invalid or expired token' });

      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', GRAPH_A.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token-xyz',
        },
      });

      const response = await GetNodes(request);
      const data = await response.json();

      // verifyGraphAccessFromRequest should return error for invalid token
      expect([401, 403]).toContain(response.status);
    });
  });

  // =========================================================================
  // Test: User A cannot query User B's graph
  // =========================================================================
  describe('Cross-Project Access Prevention', () => {
    beforeEach(() => {
      // User A is authenticated
      mockResolveUserId.mockResolvedValue({ userId: USER_A.userId });

      // Graph B exists and is owned by User B
      mockRunQuery.mockImplementation((query: string, params: any) => {
        if (query.includes('MATCH (p:Project') && params.graphId === GRAPH_B.graphId) {
          return [{ p: GRAPH_B }];
        }
        return [];
      });

      // No team membership for User A in Graph B
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });
    });

    it('should deny User A access to User B graph nodes (403)', async () => {
      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', GRAPH_B.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-a-token',
        },
      });

      const response = await GetNodes(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('ACCESS_DENIED');
      expect(data.error.message).toContain('do not have access');
    });

    it('should deny User A access to User B graph status (403)', async () => {
      const url = new URL('http://localhost:3000/api/v1/graph/status');
      url.searchParams.set('graphId', GRAPH_B.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-a-token',
        },
      });

      const response = await GetStatus(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent graph', async () => {
      // No graph exists
      mockRunQuery.mockResolvedValue([]);

      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', 'gin_nonexistent_999');

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-a-token',
        },
      });

      const response = await GetNodes(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('GRAPH_NOT_FOUND');
    });
  });

  // =========================================================================
  // Test: User A can access their own graph
  // =========================================================================
  describe('Own Project Access', () => {
    beforeEach(() => {
      // User A is authenticated
      mockResolveUserId.mockResolvedValue({ userId: USER_A.userId });

      // Graph A exists and is owned by User A
      mockRunQuery.mockImplementation((query: string, params: any) => {
        if (query.includes('MATCH (p:Project') && params.graphId === GRAPH_A.graphId) {
          return [{ p: GRAPH_A }];
        }
        // Return empty for node queries to simulate empty graph
        return [];
      });

      // Mock Neo4j session for status endpoint
      mockGetSession.mockReturnValue({
        executeRead: jest.fn().mockResolvedValue({
          records: [],
        }),
        close: jest.fn(),
      });
    });

    it('should allow User A to query their own graph nodes (200)', async () => {
      // Mock the session for nodes query
      const mockSession = {
        executeRead: jest.fn().mockResolvedValue({
          records: [],
        }),
        close: jest.fn(),
      };
      mockGetSession.mockReturnValue(mockSession);

      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', GRAPH_A.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-a-token',
        },
      });

      const response = await GetNodes(request);

      // Should succeed (200) even if no nodes found
      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Test: Team member access
  // =========================================================================
  describe('Team Member Access', () => {
    beforeEach(() => {
      // User A is authenticated
      mockResolveUserId.mockResolvedValue({ userId: USER_A.userId });

      // Graph B exists and is owned by User B
      mockRunQuery.mockImplementation((query: string, params: any) => {
        if (query.includes('MATCH (p:Project') && params.graphId === GRAPH_B.graphId) {
          return [{ p: GRAPH_B }];
        }
        return [];
      });
    });

    it('should allow team member access to shared graph (200)', async () => {
      // User A is a member of the team that owns Graph B
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'team-shared', name: 'Shared Team' },
              error: null,
            }),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const mockSession = {
        executeRead: jest.fn().mockResolvedValue({
          records: [],
        }),
        close: jest.fn(),
      };
      mockGetSession.mockReturnValue(mockSession);

      const url = new URL('http://localhost:3000/api/v1/graph/nodes');
      url.searchParams.set('graphId', GRAPH_B.graphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-a-token',
        },
      });

      const response = await GetNodes(request);

      // Team member should have access
      expect(response.status).toBe(200);
    });
  });
});
