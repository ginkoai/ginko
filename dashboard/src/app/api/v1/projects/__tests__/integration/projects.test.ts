/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-07
 * @tags: [test, integration, rest-api, projects, task-022]
 * @related: [../../route.ts, ../../[id]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Projects REST API
 *
 * Tests all CRUD endpoints:
 * - POST /api/v1/projects - Create project
 * - GET /api/v1/projects - List projects
 * - GET /api/v1/projects/[id] - Get single project
 * - PATCH /api/v1/projects/[id] - Update project
 * - DELETE /api/v1/projects/[id] - Delete project
 * - POST /api/v1/projects/[id]/members - Add member
 * - PATCH /api/v1/projects/[id]/members/[userId] - Change member role
 * - DELETE /api/v1/projects/[id]/members/[userId] - Remove member
 * - POST /api/v1/projects/[id]/teams - Grant team access
 * - DELETE /api/v1/projects/[id]/teams/[teamId] - Revoke team access
 */

import { NextRequest } from 'next/server';
import { POST as CreateProject, GET as ListProjects } from '../../route';
import { GET as GetProject, PATCH as UpdateProject, DELETE as DeleteProject } from '../../[id]/route';
import { POST as AddMember } from '../../[id]/members/route';
import { PATCH as UpdateMemberRole, DELETE as RemoveMember } from '../../[id]/members/[userId]/route';
import { POST as GrantTeamAccess } from '../../[id]/teams/route';
import { DELETE as RevokeTeamAccess } from '../../[id]/teams/[teamId]/route';

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

describe('Projects REST API - Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };
  const mockProjectId = 'project-456';
  const mockTeamId = 'team-789';
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

  describe('POST /api/v1/projects - Create Project', () => {
    it('should create a new project successfully', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: 'A test project',
        visibility: 'private',
        discoverable: false,
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // project insert
        .mockResolvedValueOnce({ data: {}, error: null }); // member insert

      const request = new NextRequest('http://localhost:3000/api/v1/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'A test project',
        }),
      });

      const response = await CreateProject(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.project.name).toBe('Test Project');
      expect(data.project.role).toBe('owner');
    });

    it('should return 400 for missing name', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await CreateProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('should create project with default values', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Minimal Project',
        visibility: 'private',
        discoverable: false,
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: {}, error: null });

      const request = new NextRequest('http://localhost:3000/api/v1/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Minimal Project' }),
      });

      const response = await CreateProject(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.project.visibility).toBe('private');
      expect(data.project.discoverable).toBe(false);
    });
  });

  describe('GET /api/v1/projects - List Projects', () => {
    it('should list user projects', async () => {
      const mockProjects = [
        {
          project_id: 'proj-1',
          role: 'owner',
          projects: { id: 'proj-1', name: 'Project 1', visibility: 'private', updated_at: new Date().toISOString() },
        },
        {
          project_id: 'proj-2',
          role: 'member',
          projects: { id: 'proj-2', name: 'Project 2', visibility: 'public', updated_at: new Date().toISOString() },
        },
      ];

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProjects, error: null })
        .mockResolvedValueOnce({ data: [], error: null }); // team memberships

      const request = new NextRequest('http://localhost:3000/api/v1/projects', {
        method: 'GET',
      });

      const response = await ListProjects(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toBeDefined();
      expect(data.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should filter by visibility', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const url = new URL('http://localhost:3000/api/v1/projects');
      url.searchParams.set('visibility', 'public');

      const request = new NextRequest(url, { method: 'GET' });
      const response = await ListProjects(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.visibility).toBe('public');
    });
  });

  describe('GET /api/v1/projects/[id] - Get Project', () => {
    it('should get project details for owner', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        visibility: 'private',
      };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // project
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // membership
        .mockResolvedValueOnce({ data: [], error: null }) // members
        .mockResolvedValueOnce({ data: [], error: null }); // teams

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'GET',
      });

      const response = await GetProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project).toBeDefined();
      expect(data.project.user_role).toBe('owner');
    });

    it('should return 404 for non-existent project', async () => {
      mockSupabaseTable.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/invalid`, {
        method: 'GET',
      });

      const response = await GetProject(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('PATCH /api/v1/projects/[id] - Update Project', () => {
    it('should update project as owner', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project', visibility: 'private' };
      const updatedProject = { ...mockProject, name: 'Updated Project' };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // check project
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: null, error: null }) // team memberships check
        .mockResolvedValueOnce({ data: updatedProject, error: null }); // update

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Project' }),
      });

      const response = await UpdateProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.project).toBeDefined();
    });

    it('should return 403 for non-owner', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // check project
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // check membership
        .mockResolvedValueOnce({ data: [], error: null }); // team check

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Project' }),
      });

      const response = await UpdateProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('permissions');
    });

    it('should return 400 for empty name', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const response = await UpdateProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('empty');
    });
  });

  describe('DELETE /api/v1/projects/[id] - Delete Project', () => {
    it('should delete project as owner', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // check project
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: [], error: null }) // team check
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'DELETE',
      });

      const response = await DeleteProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedProjectId).toBe(mockProjectId);
    });

    it('should return 403 for non-owner', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };

      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}`, {
        method: 'DELETE',
      });

      const response = await DeleteProject(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('permissions');
    });
  });

  describe('POST /api/v1/projects/[id]/members - Add Member', () => {
    it('should add member as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { id: mockProjectId }, error: null }) // verify project
        .mockResolvedValueOnce({ data: { id: mockUserId2, email: 'user2@example.com' }, error: null }) // verify user
        .mockResolvedValueOnce({ data: null, error: null }) // check existing
        .mockResolvedValueOnce({ data: { user_id: mockUserId2, role: 'member' }, error: null }); // insert

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddMember(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 403 for non-owner', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddMember(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });

    it('should return 409 if user already member', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        .mockResolvedValueOnce({ data: { id: mockProjectId }, error: null })
        .mockResolvedValueOnce({ data: { id: mockUserId2 }, error: null })
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }); // existing member

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: mockUserId2 }),
      });

      const response = await AddMember(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already');
    });
  });

  describe('PATCH /api/v1/projects/[id]/members/[userId] - Update Member Role', () => {
    it('should update member role as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // get current member
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // update

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members/${mockUserId2}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'owner' }),
      });

      const response = await UpdateMemberRole(request, { params: { id: mockProjectId, userId: mockUserId2 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should prevent demoting last owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // current member is owner

      mockSupabaseTable.single.mockResolvedValueOnce({ data: [{ user_id: mockUser.id }], error: null }); // count = 1

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members/${mockUser.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });

      const response = await UpdateMemberRole(request, { params: { id: mockProjectId, userId: mockUser.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('last owner');
    });
  });

  describe('DELETE /api/v1/projects/[id]/members/[userId] - Remove Member', () => {
    it('should remove member as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // get member
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members/${mockUserId2}`, {
        method: 'DELETE',
      });

      const response = await RemoveMember(request, { params: { id: mockProjectId, userId: mockUserId2 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow self-removal', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // check membership
        .mockResolvedValueOnce({ data: { role: 'member' }, error: null }) // get member
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members/${mockUser.id}`, {
        method: 'DELETE',
      });

      const response = await RemoveMember(request, { params: { id: mockProjectId, userId: mockUser.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should prevent removing last owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }); // member is owner

      mockSupabaseTable.single.mockResolvedValueOnce({ data: [{ user_id: mockUser.id }], error: null }); // count = 1

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/members/${mockUser.id}`, {
        method: 'DELETE',
      });

      const response = await RemoveMember(request, { params: { id: mockProjectId, userId: mockUser.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('last owner');
    });
  });

  describe('POST /api/v1/projects/[id]/teams - Grant Team Access', () => {
    it('should grant team access as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { id: mockProjectId }, error: null }) // verify project
        .mockResolvedValueOnce({ data: { id: mockTeamId, name: 'Team A' }, error: null }) // verify team
        .mockResolvedValueOnce({ data: null, error: null }) // check existing
        .mockResolvedValueOnce({ data: { project_id: mockProjectId, team_id: mockTeamId }, error: null }); // insert

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/teams`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ team_id: mockTeamId }),
      });

      const response = await GrantTeamAccess(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 403 for non-owner', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/teams`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ team_id: mockTeamId }),
      });

      const response = await GrantTeamAccess(request, { params: { id: mockProjectId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });
  });

  describe('DELETE /api/v1/projects/[id]/teams/[teamId] - Revoke Team Access', () => {
    it('should revoke team access as owner', async () => {
      mockSupabaseTable.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // check ownership
        .mockResolvedValueOnce({ data: { project_id: mockProjectId, team_id: mockTeamId }, error: null }) // verify access
        .mockResolvedValueOnce({ data: null, error: null }); // delete

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/teams/${mockTeamId}`, {
        method: 'DELETE',
      });

      const response = await RevokeTeamAccess(request, { params: { id: mockProjectId, teamId: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.revokedTeamId).toBe(mockTeamId);
    });

    it('should return 403 for non-owner', async () => {
      mockSupabaseTable.single.mockResolvedValueOnce({ data: { role: 'member' }, error: null });

      const request = new NextRequest(`http://localhost:3000/api/v1/projects/${mockProjectId}/teams/${mockTeamId}`, {
        method: 'DELETE',
      });

      const response = await RevokeTeamAccess(request, { params: { id: mockProjectId, teamId: mockTeamId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owners');
    });
  });
});
