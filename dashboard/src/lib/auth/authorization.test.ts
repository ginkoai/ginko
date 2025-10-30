/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-29
 * @tags: [auth, authorization, tests, jest, unit-tests]
 * @related: [authorization.ts, middleware.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, @supabase/supabase-js]
 */

/**
 * Authorization Helper Tests
 *
 * These tests validate the multi-tenancy authorization logic.
 * Run with: npm test authorization.test.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  canReadProject,
  canWriteProject,
  canManageProject,
  checkProjectAccess,
  batchCheckProjectAccess,
} from './authorization';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

// Test data
const testData = {
  orgOwner: {
    id: 'user-org-owner',
    organization_id: 'org-1',
    role: 'owner',
    is_active: true,
  },
  orgAdmin: {
    id: 'user-org-admin',
    organization_id: 'org-1',
    role: 'admin',
    is_active: true,
  },
  teamOwner: {
    id: 'user-team-owner',
    organization_id: 'org-1',
    role: 'member',
    is_active: true,
  },
  teamAdmin: {
    id: 'user-team-admin',
    organization_id: 'org-1',
    role: 'member',
    is_active: true,
  },
  teamMember: {
    id: 'user-team-member',
    organization_id: 'org-1',
    role: 'member',
    is_active: true,
  },
  teamViewer: {
    id: 'user-team-viewer',
    organization_id: 'org-1',
    role: 'member',
    is_active: true,
  },
  nonMember: {
    id: 'user-non-member',
    organization_id: 'org-1',
    role: 'member',
    is_active: true,
  },
  otherOrgUser: {
    id: 'user-other-org',
    organization_id: 'org-2',
    role: 'owner',
    is_active: true,
  },
  inactiveUser: {
    id: 'user-inactive',
    organization_id: 'org-1',
    role: 'member',
    is_active: false,
  },
  team1: {
    id: 'team-1',
    organization_id: 'org-1',
    name: 'Engineering',
  },
  project1: {
    id: 'project-1',
    team_id: 'team-1',
    is_active: true,
  },
  inactiveProject: {
    id: 'project-inactive',
    team_id: 'team-1',
    is_active: false,
  },
};

// Mock team memberships
const teamMemberships = {
  'user-team-owner': [{ team_id: 'team-1', role: 'owner' }],
  'user-team-admin': [{ team_id: 'team-1', role: 'admin' }],
  'user-team-member': [{ team_id: 'team-1', role: 'member' }],
  'user-team-viewer': [{ team_id: 'team-1', role: 'viewer' }],
  'user-org-owner': [{ team_id: 'team-1', role: 'member' }],
  'user-org-admin': [{ team_id: 'team-1', role: 'member' }],
};

describe('Authorization Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canReadProject', () => {
    it('should allow organization owner to read any project', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.orgOwner, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-org-owner', 'project-1', mockSupabase as any);
      expect(canRead).toBe(true);
    });

    it('should allow organization admin to read project', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.orgAdmin, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-org-admin', 'project-1', mockSupabase as any);
      expect(canRead).toBe(true);
    });

    it('should allow team member to read project', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamMember, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'member' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-team-member', 'project-1', mockSupabase as any);
      expect(canRead).toBe(true);
    });

    it('should deny non-member access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.nonMember, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-non-member', 'project-1', mockSupabase as any);
      expect(canRead).toBe(false);
    });

    it('should deny access to inactive user', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.inactiveUser, error: null }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-inactive', 'project-1', mockSupabase as any);
      expect(canRead).toBe(false);
    });

    it('should deny access to inactive project', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamMember, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'member' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.inactiveProject,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-team-member', 'project-inactive', mockSupabase as any);
      expect(canRead).toBe(false);
    });

    it('should deny cross-organization access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.otherOrgUser, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canRead = await canReadProject('user-other-org', 'project-1', mockSupabase as any);
      expect(canRead).toBe(false);
    });
  });

  describe('canWriteProject', () => {
    it('should allow organization owner to write', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.orgOwner, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canWrite = await canWriteProject('user-org-owner', 'project-1', mockSupabase as any);
      expect(canWrite).toBe(true);
    });

    it('should allow team admin to write', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamAdmin, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'admin' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canWrite = await canWriteProject('user-team-admin', 'project-1', mockSupabase as any);
      expect(canWrite).toBe(true);
    });

    it('should deny team member write access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamMember, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'member' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canWrite = await canWriteProject('user-team-member', 'project-1', mockSupabase as any);
      expect(canWrite).toBe(false);
    });

    it('should deny team viewer write access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamViewer, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'viewer' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canWrite = await canWriteProject('user-team-viewer', 'project-1', mockSupabase as any);
      expect(canWrite).toBe(false);
    });
  });

  describe('canManageProject', () => {
    it('should allow organization owner to manage', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.orgOwner, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canManage = await canManageProject('user-org-owner', 'project-1', mockSupabase as any);
      expect(canManage).toBe(true);
    });

    it('should allow team owner to manage', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamOwner, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'owner' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canManage = await canManageProject('user-team-owner', 'project-1', mockSupabase as any);
      expect(canManage).toBe(true);
    });

    it('should deny organization admin management access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.orgAdmin, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canManage = await canManageProject('user-org-admin', 'project-1', mockSupabase as any);
      expect(canManage).toBe(false);
    });

    it('should deny team admin management access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamAdmin, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'admin' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: testData.project1,
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const canManage = await canManageProject('user-team-admin', 'project-1', mockSupabase as any);
      expect(canManage).toBe(false);
    });
  });

  describe('checkProjectAccess', () => {
    it('should return detailed authorization result', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: testData.teamMember, error: null }),
              }),
            }),
          };
        }
        if (table === 'team_members') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ team_id: 'team-1', role: 'member' }],
                error: null
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...testData.project1,
                    teams: { organization_id: 'org-1', name: 'Engineering' }
                  },
                  error: null
                }),
              }),
            }),
          };
        }
      });

      const result = await checkProjectAccess('user-team-member', 'project-1', 'write', mockSupabase as any);
      expect(result.authorized).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
