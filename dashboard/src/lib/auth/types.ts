/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-29
 * @tags: [types, auth, authorization, rbac, multi-tenancy]
 * @related: [authorization.ts, middleware.ts, database.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Organization-level role definitions
 *
 * Hierarchy (highest to lowest):
 * - owner: Full organization control, can manage billing, delete org
 * - admin: Can manage teams and projects, cannot delete org
 * - member: Standard user, limited to assigned teams
 * - viewer: Read-only access to assigned teams
 */
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Team-level role definitions
 *
 * Hierarchy (highest to lowest):
 * - owner: Full team control, can delete team and manage all projects
 * - admin: Can manage team projects and members
 * - member: Standard team member with read/write to assigned projects
 * - viewer: Read-only access to team projects
 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Supported authorization actions
 */
export type AuthorizationAction = 'read' | 'write' | 'manage';

/**
 * Authorization check result with optional metadata
 */
export interface AuthorizationResult {
  /** Whether the user is authorized for the requested action */
  authorized: boolean;

  /** Human-readable reason if authorization failed */
  reason?: string;

  /** User's effective role for the resource (if authorized) */
  role?: OrganizationRole | TeamRole;

  /** Additional context about the authorization decision */
  metadata?: {
    /** Whether access is granted via organization-level permissions */
    viaOrganization?: boolean;

    /** Whether access is granted via team-level permissions */
    viaTeam?: boolean;

    /** Team ID if access is team-based */
    teamId?: string;

    /** Organization ID for context */
    organizationId?: string;
  };
}

/**
 * User's complete authorization context
 * Internal structure for caching authorization state
 */
export interface UserAuthContext {
  /** User ID */
  userId: string;

  /** User's organization ID */
  organizationId: string;

  /** User's organization-level role */
  organizationRole: OrganizationRole;

  /** Map of team IDs to team roles */
  teamMemberships: Map<string, TeamRole>;

  /** Set of project IDs where user has owner-level access */
  projectOwnerships: Set<string>;

  /** Whether the user account is active */
  isActive: boolean;

  /** When this context was loaded (for cache invalidation) */
  loadedAt: Date;
}

/**
 * Organization entity from database
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: 'free' | 'pro' | 'enterprise';
  plan_status: 'active' | 'past_due' | 'canceled' | 'trialing';
  created_at: string;
  updated_at: string;
}

/**
 * Team entity from database
 */
export interface Team {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

/**
 * Project entity from database
 */
export interface Project {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  repository_url?: string;
  repository_provider?: 'github' | 'gitlab' | 'bitbucket';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User entity from database
 */
export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: OrganizationRole;
  is_active: boolean;
  last_active?: string;
  created_at: string;
}

/**
 * Team membership relationship
 */
export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  last_active?: string;
}

/**
 * Permission matrix for role-based access control
 *
 * Defines what actions each role can perform
 */
export const ROLE_PERMISSIONS = {
  organization: {
    owner: {
      canRead: true,
      canWrite: true,
      canManage: true,
      canDelete: true,
      canManageBilling: true,
      canInviteUsers: true,
    },
    admin: {
      canRead: true,
      canWrite: true,
      canManage: false, // Cannot delete organization
      canDelete: false,
      canManageBilling: false,
      canInviteUsers: true,
    },
    member: {
      canRead: true, // Only assigned teams
      canWrite: false, // No org-level writes
      canManage: false,
      canDelete: false,
      canManageBilling: false,
      canInviteUsers: false,
    },
    viewer: {
      canRead: true, // Only assigned teams
      canWrite: false,
      canManage: false,
      canDelete: false,
      canManageBilling: false,
      canInviteUsers: false,
    },
  },
  team: {
    owner: {
      canRead: true,
      canWrite: true,
      canManage: true,
      canDelete: true,
      canInviteMembers: true,
      canManageProjects: true,
    },
    admin: {
      canRead: true,
      canWrite: true,
      canManage: false, // Cannot delete team
      canDelete: false,
      canInviteMembers: true,
      canManageProjects: true,
    },
    member: {
      canRead: true,
      canWrite: true, // Can write to projects
      canManage: false,
      canDelete: false,
      canInviteMembers: false,
      canManageProjects: false,
    },
    viewer: {
      canRead: true,
      canWrite: false, // Read-only
      canManage: false,
      canDelete: false,
      canInviteMembers: false,
      canManageProjects: false,
    },
  },
} as const;

/**
 * Helper type for extracting role from ROLE_PERMISSIONS
 */
export type RolePermissions<Level extends 'organization' | 'team', Role extends string> =
  Level extends 'organization'
    ? Role extends OrganizationRole
      ? typeof ROLE_PERMISSIONS.organization[Role]
      : never
    : Level extends 'team'
    ? Role extends TeamRole
      ? typeof ROLE_PERMISSIONS.team[Role]
      : never
    : never;

/**
 * Authorization error types
 */
export enum AuthorizationError {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_INACTIVE = 'PROJECT_INACTIVE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NOT_TEAM_MEMBER = 'NOT_TEAM_MEMBER',
  WRONG_ORGANIZATION = 'WRONG_ORGANIZATION',
  INVALID_ACTION = 'INVALID_ACTION',
}

/**
 * Authorization error with details
 */
export class AuthError extends Error {
  constructor(
    public code: AuthorizationError,
    public details?: Record<string, any>
  ) {
    super(code);
    this.name = 'AuthorizationError';
  }
}

/**
 * Type guard to check if user has specific role or higher
 */
export function hasOrganizationRole(
  userRole: OrganizationRole,
  requiredRole: OrganizationRole
): boolean {
  const roleHierarchy: OrganizationRole[] = ['viewer', 'member', 'admin', 'owner'];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Type guard to check if user has specific team role or higher
 */
export function hasTeamRole(
  userRole: TeamRole,
  requiredRole: TeamRole
): boolean {
  const roleHierarchy: TeamRole[] = ['viewer', 'member', 'admin', 'owner'];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Get permissions for a specific role
 */
export function getOrganizationPermissions(role: OrganizationRole) {
  return ROLE_PERMISSIONS.organization[role];
}

/**
 * Get permissions for a specific team role
 */
export function getTeamPermissions(role: TeamRole) {
  return ROLE_PERMISSIONS.team[role];
}
