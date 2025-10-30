/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-29
 * @tags: [types, multi-tenancy, teams, projects, database, supabase]
 * @related: [auth/authorization.ts, lib/supabase/client.ts, lib/supabase/server.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * User role within a team
 */
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * User role within a specific project
 */
export enum ProjectRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

/**
 * Project visibility settings
 */
export enum ProjectVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/**
 * Repository providers for git integrations
 */
export enum RepositoryProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
}

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

/**
 * Team - Top-level collaboration unit
 */
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: Record<string, any>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team Member - User membership in a team with role
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  permissions: Record<string, any>;
  joinedAt: Date;
  lastActive: Date | null;
}

/**
 * Project - Repository/codebase entity owned by a team
 */
export interface Project {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  description: string | null;
  repositoryUrl: string | null;
  repositoryProvider: RepositoryProvider | null;
  visibility: ProjectVisibility;
  githubRepoId: number | null;
  discoverable: boolean;
  webhookSecret: string | null;
  settings: Record<string, any>;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project Member - Individual user access to a project
 */
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  grantedAt: Date;
  grantedBy: string | null;
}

/**
 * Project Team - Team-based access grant to a project
 */
export interface ProjectTeam {
  id: string;
  projectId: string;
  teamId: string;
  grantedAt: Date;
  grantedBy: string | null;
}

// ============================================================================
// DATABASE ROW TYPES (Supabase snake_case conventions)
// ============================================================================

/**
 * Database row types following Supabase conventions
 * Used for direct database queries and inserts
 */
export namespace Database {
  export interface TeamRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: any;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }

  export interface TeamMemberRow {
    id: string;
    team_id: string;
    user_id: string;
    role: string;
    permissions: any;
    joined_at: string;
    last_active: string | null;
  }

  export interface ProjectRow {
    id: string;
    team_id: string;
    name: string;
    slug: string;
    description: string | null;
    repository_url: string | null;
    repository_provider: string | null;
    visibility: string;
    github_repo_id: number | null;
    discoverable: boolean;
    webhook_secret: string | null;
    settings: any;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }

  export interface ProjectMemberRow {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    granted_at: string;
    granted_by: string | null;
  }

  export interface ProjectTeamRow {
    id: string;
    project_id: string;
    team_id: string;
    granted_at: string;
    granted_by: string | null;
  }
}

// ============================================================================
// TYPE CONVERSION HELPERS
// ============================================================================

/**
 * Convert database row to TypeScript entity (snake_case → camelCase)
 */
export namespace Convert {
  export function toTeam(row: Database.TeamRow): Team {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      settings: row.settings || {},
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  export function toTeamMember(row: Database.TeamMemberRow): TeamMember {
    return {
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      role: row.role as TeamRole,
      permissions: row.permissions || {},
      joinedAt: new Date(row.joined_at),
      lastActive: row.last_active ? new Date(row.last_active) : null,
    };
  }

  export function toProject(row: Database.ProjectRow): Project {
    return {
      id: row.id,
      teamId: row.team_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      repositoryUrl: row.repository_url,
      repositoryProvider: row.repository_provider as RepositoryProvider | null,
      visibility: row.visibility as ProjectVisibility,
      githubRepoId: row.github_repo_id,
      discoverable: row.discoverable,
      webhookSecret: row.webhook_secret,
      settings: row.settings || {},
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  export function toProjectMember(row: Database.ProjectMemberRow): ProjectMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role as ProjectRole,
      grantedAt: new Date(row.granted_at),
      grantedBy: row.granted_by,
    };
  }

  export function toProjectTeam(row: Database.ProjectTeamRow): ProjectTeam {
    return {
      id: row.id,
      projectId: row.project_id,
      teamId: row.team_id,
      grantedAt: new Date(row.granted_at),
      grantedBy: row.granted_by,
    };
  }
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

/**
 * User profile extended with team memberships
 */
export interface UserWithMemberships {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  teamMemberships: Array<TeamMember & { team: Team }>;
}

/**
 * Team with expanded member information
 */
export interface TeamWithMembers extends Team {
  members: Array<TeamMember & {
    user: {
      id: string;
      email: string;
      fullName: string | null;
      avatarUrl: string | null;
    };
  }>;
  memberCount: number;
}

/**
 * Project with expanded information
 */
export interface ProjectWithDetails extends Project {
  team: Team;
  members: Array<ProjectMember & {
    user: {
      id: string;
      email: string;
      fullName: string | null;
      avatarUrl: string | null;
    };
  }>;
  teams: Array<ProjectTeam & { team: Team }>;
  memberCount: number;
}

// ============================================================================
// AUTHORIZATION TYPES
// ============================================================================

/**
 * Permission check result with detailed information
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  role?: TeamRole | ProjectRole;
}

/**
 * Authorization context for permission checks
 */
export interface AuthContext {
  userId: string;
  teamMemberships: TeamMember[];
  projectMemberships: ProjectMember[];
}

/**
 * Resource access level
 */
export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  MANAGE = 'manage',
  OWNER = 'owner',
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create team request
 */
export interface CreateTeamRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: Record<string, any>;
}

/**
 * Update team request
 */
export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

/**
 * Create project request
 */
export interface CreateProjectRequest {
  teamId: string;
  name: string;
  slug: string;
  description?: string;
  repositoryUrl?: string;
  repositoryProvider?: RepositoryProvider;
  visibility?: ProjectVisibility;
  discoverable?: boolean;
  settings?: Record<string, any>;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  visibility?: ProjectVisibility;
  discoverable?: boolean;
  settings?: Record<string, any>;
}

/**
 * Add team member request
 */
export interface AddTeamMemberRequest {
  userId: string;
  role: TeamRole;
  permissions?: Record<string, any>;
}

/**
 * Update team member request
 */
export interface UpdateTeamMemberRequest {
  role?: TeamRole;
  permissions?: Record<string, any>;
}

/**
 * Add project member request
 */
export interface AddProjectMemberRequest {
  userId: string;
  role: ProjectRole;
}

/**
 * Grant team access to project request
 */
export interface GrantTeamAccessRequest {
  teamId: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial update type for any entity
 */
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

/**
 * Query filter options
 */
export interface QueryFilters {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a role is a valid team role
 */
export function isTeamRole(role: string): role is TeamRole {
  return Object.values(TeamRole).includes(role as TeamRole);
}

/**
 * Check if a role is a valid project role
 */
export function isProjectRole(role: string): role is ProjectRole {
  return Object.values(ProjectRole).includes(role as ProjectRole);
}

/**
 * Check if visibility is valid
 */
export function isProjectVisibility(visibility: string): visibility is ProjectVisibility {
  return Object.values(ProjectVisibility).includes(visibility as ProjectVisibility);
}

// ============================================================================
// ROLE HIERARCHY HELPERS
// ============================================================================

/**
 * Team role hierarchy (higher number = more permissions)
 */
export const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
  [TeamRole.OWNER]: 4,
  [TeamRole.ADMIN]: 3,
  [TeamRole.MEMBER]: 2,
  [TeamRole.VIEWER]: 1,
};

/**
 * Project role hierarchy (higher number = more permissions)
 */
export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 2,
  [ProjectRole.MEMBER]: 1,
};

/**
 * Check if a team role has at least the required level
 */
export function hasTeamRoleLevel(
  userRole: TeamRole,
  requiredRole: TeamRole
): boolean {
  return TEAM_ROLE_HIERARCHY[userRole] >= TEAM_ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a project role has at least the required level
 */
export function hasProjectRoleLevel(
  userRole: ProjectRole,
  requiredRole: ProjectRole
): boolean {
  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[requiredRole];
}
