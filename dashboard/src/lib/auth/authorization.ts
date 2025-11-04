/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-29
 * @tags: [auth, authorization, multi-tenancy, rbac, access-control]
 * @related: [middleware.ts, server.ts, database.ts, types/multi-tenancy.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@supabase/ssr]
 */

import { createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamRole, OrganizationRole, UserAuthContext } from './types';

/**
 * Authorization result with optional error details
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  role?: TeamRole;
}

/**
 * IMPORTANT: This authorization layer uses the database-level functions
 * created in migration 004_authorization_functions.sql:
 * - can_read_project(user_uuid, project_uuid)
 * - can_write_project(user_uuid, project_uuid)
 * - can_manage_project(user_uuid, project_uuid)
 *
 * These functions enforce consistent authorization logic at the database level
 * and automatically handle team membership, project ownership, and public/private visibility.
 */

/**
 * Check if user can read a project
 *
 * Uses the database function can_read_project() which checks:
 * - Public projects
 * - Direct project membership
 * - Team membership with project access
 * - Team owner/admin of owning team
 *
 * @param userId - User ID to check authorization for
 * @param projectId - Project ID to check access to
 * @param supabase - Optional Supabase client (creates new one if not provided)
 * @returns Promise resolving to boolean indicating read access
 *
 * @example
 * ```typescript
 * const canRead = await canReadProject(user.id, project.id);
 * if (!canRead) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export async function canReadProject(
  userId: string,
  projectId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const client = supabase || await createServerClient();

    // Call database-level authorization function
    const { data, error } = await client.rpc('can_read_project', {
      user_uuid: userId,
      project_uuid: projectId,
    });

    if (error) {
      console.error('[Authorization] Error checking read access:', error);
      return false; // Fail closed
    }

    return data === true;
  } catch (error) {
    console.error('[Authorization] Exception checking read access:', error);
    return false; // Fail closed
  }
}

/**
 * Check if user can write to a project
 *
 * Uses the database function can_write_project() which checks:
 * - Direct project membership (any role)
 * - Team owner/admin of owning team
 *
 * @param userId - User ID to check authorization for
 * @param projectId - Project ID to check access to
 * @param supabase - Optional Supabase client (creates new one if not provided)
 * @returns Promise resolving to boolean indicating write access
 *
 * @example
 * ```typescript
 * const canWrite = await canWriteProject(user.id, project.id);
 * if (!canWrite) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export async function canWriteProject(
  userId: string,
  projectId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const client = supabase || await createServerClient();

    // Call database-level authorization function
    const { data, error } = await client.rpc('can_write_project', {
      user_uuid: userId,
      project_uuid: projectId,
    });

    if (error) {
      console.error('[Authorization] Error checking write access:', error);
      return false; // Fail closed
    }

    return data === true;
  } catch (error) {
    console.error('[Authorization] Exception checking write access:', error);
    return false; // Fail closed
  }
}

/**
 * Check if user can manage a project (delete, transfer, change settings)
 *
 * Uses the database function can_manage_project() which checks:
 * - Project owner
 * - Team owner of owning team
 *
 * @param userId - User ID to check authorization for
 * @param projectId - Project ID to check access to
 * @param supabase - Optional Supabase client (creates new one if not provided)
 * @returns Promise resolving to boolean indicating management access
 *
 * @example
 * ```typescript
 * const canManage = await canManageProject(user.id, project.id);
 * if (!canManage) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export async function canManageProject(
  userId: string,
  projectId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const client = supabase || await createServerClient();

    // Call database-level authorization function
    const { data, error } = await client.rpc('can_manage_project', {
      user_uuid: userId,
      project_uuid: projectId,
    });

    if (error) {
      console.error('[Authorization] Error checking manage access:', error);
      return false; // Fail closed
    }

    return data === true;
  } catch (error) {
    console.error('[Authorization] Exception checking manage access:', error);
    return false; // Fail closed
  }
}

/**
 * Get user's complete authorization context
 * Internal helper that loads user's organization, team memberships, and permissions
 *
 * @param supabase - Supabase client
 * @param userId - User ID to load context for
 * @returns Promise resolving to UserAuthContext or null if user not found
 */
async function getUserAuthContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAuthContext | null> {
  try {
    // Fetch user data with organization role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role, is_active')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.is_active) {
      return null;
    }

    // Fetch all team memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('[Authorization] Error fetching team memberships:', membershipsError);
      return null;
    }

    // Build team memberships map
    const teamMemberships = new Map<string, TeamRole>();
    (memberships || []).forEach((membership: any) => {
      teamMemberships.set(membership.team_id, membership.role as TeamRole);
    });

    // Return complete auth context
    return {
      userId: user.id,
      organizationId: user.organization_id,
      organizationRole: user.role as OrganizationRole,
      teamMemberships,
      projectOwnerships: new Set(), // Projects are owned by teams, not individual users
      isActive: user.is_active,
      loadedAt: new Date(),
    };
  } catch (error) {
    console.error('[Authorization] Exception loading user auth context:', error);
    return null;
  }
}

/**
 * Get detailed authorization result with reason
 * Useful for debugging and providing user-friendly error messages
 *
 * @param userId - User ID to check authorization for
 * @param projectId - Project ID to check access to
 * @param action - Action to check: 'read', 'write', or 'manage'
 * @param supabase - Optional Supabase client
 * @returns Promise resolving to AuthorizationResult with details
 *
 * @example
 * ```typescript
 * const result = await checkProjectAccess(user.id, project.id, 'write');
 * if (!result.authorized) {
 *   return new Response(result.reason, { status: 403 });
 * }
 * ```
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string,
  action: 'read' | 'write' | 'manage',
  supabase?: SupabaseClient
): Promise<AuthorizationResult> {
  try {
    const client = supabase || await createServerClient();

    // Get user auth context
    const authContext = await getUserAuthContext(client, userId);
    if (!authContext) {
      return {
        authorized: false,
        reason: 'User not found or inactive',
      };
    }

    // Get project details
    const { data: project, error: projectError } = await client
      .from('projects')
      .select('team_id, is_active, teams!inner(organization_id, name)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return {
        authorized: false,
        reason: 'Project not found',
      };
    }

    if (!project.is_active) {
      return {
        authorized: false,
        reason: 'Project is inactive',
      };
    }

    // Check if project belongs to user's organization
    const projectOrgId = (project as any).teams.organization_id;
    if (projectOrgId !== authContext.organizationId) {
      return {
        authorized: false,
        reason: 'Project belongs to different organization',
      };
    }

    // Check team membership
    const teamRole = authContext.teamMemberships.get(project.team_id);

    // Organization-level permissions
    const isOrgOwner = authContext.organizationRole === 'owner';
    const isOrgAdmin = authContext.organizationRole === 'admin';

    switch (action) {
      case 'read':
        // Can read if: org owner/admin OR team member
        if (isOrgOwner || isOrgAdmin || teamRole) {
          return {
            authorized: true,
            role: teamRole || authContext.organizationRole,
          };
        }
        return {
          authorized: false,
          reason: 'Not a member of project team',
        };

      case 'write':
        // Can write if: org owner/admin OR team owner/admin
        if (isOrgOwner || isOrgAdmin || teamRole === 'owner' || teamRole === 'admin') {
          return {
            authorized: true,
            role: teamRole || authContext.organizationRole,
          };
        }
        return {
          authorized: false,
          reason: teamRole ? 'Insufficient team permissions (requires owner or admin)' : 'Not a member of project team',
        };

      case 'manage':
        // Can manage if: org owner OR team owner
        if (isOrgOwner || teamRole === 'owner') {
          return {
            authorized: true,
            role: teamRole || authContext.organizationRole,
          };
        }
        return {
          authorized: false,
          reason: isOrgAdmin ? 'Org admins cannot manage projects (requires org owner or project owner)' :
                  teamRole ? 'Insufficient team permissions (requires team owner)' :
                  'Not a member of project team',
        };

      default:
        return {
          authorized: false,
          reason: 'Invalid action',
        };
    }
  } catch (error) {
    console.error('Error checking project access:', error);
    return {
      authorized: false,
      reason: 'Internal error checking permissions',
    };
  }
}

/**
 * Batch check project access for multiple projects
 * More efficient than calling canReadProject multiple times
 *
 * @param userId - User ID to check authorization for
 * @param projectIds - Array of project IDs to check
 * @param supabase - Optional Supabase client
 * @returns Promise resolving to Map of projectId -> boolean
 *
 * @example
 * ```typescript
 * const accessMap = await batchCheckProjectAccess(user.id, [proj1, proj2, proj3]);
 * const accessibleProjects = projectIds.filter(id => accessMap.get(id));
 * ```
 */
export async function batchCheckProjectAccess(
  userId: string,
  projectIds: string[],
  supabase?: SupabaseClient
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  if (projectIds.length === 0) {
    return result;
  }

  try {
    const client = supabase || await createServerClient();

    // Get user auth context once
    const authContext = await getUserAuthContext(client, userId);
    if (!authContext) {
      projectIds.forEach(id => result.set(id, false));
      return result;
    }

    // Get all projects at once
    const { data: projects, error } = await client
      .from('projects')
      .select('id, team_id, is_active, teams!inner(organization_id)')
      .in('id', projectIds);

    if (error || !projects) {
      projectIds.forEach(id => result.set(id, false));
      return result;
    }

    // Check each project
    projects.forEach(project => {
      const projectOrgId = (project as any).teams.organization_id;

      // Organization owners and admins can read all projects in their org
      if (projectOrgId === authContext.organizationId &&
          (authContext.organizationRole === 'owner' || authContext.organizationRole === 'admin')) {
        result.set(project.id, true);
        return;
      }

      // Check team membership
      const hasTeamAccess = authContext.teamMemberships.has(project.team_id);
      result.set(project.id, project.is_active && hasTeamAccess);
    });

    // Set false for any projects not found
    projectIds.forEach(id => {
      if (!result.has(id)) {
        result.set(id, false);
      }
    });

    return result;
  } catch (error) {
    console.error('Error in batch check:', error);
    projectIds.forEach(id => result.set(id, false));
    return result;
  }
}

/**
 * Middleware wrapper for API routes requiring project access
 *
 * @example
 * ```typescript
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { projectId: string } }
 * ) {
 *   return withProjectAccess(
 *     params.projectId,
 *     'read',
 *     request,
 *     async (user, project, supabase) => {
 *       // Your authenticated and authorized route logic here
 *       return NextResponse.json({ data: project });
 *     }
 *   );
 * }
 * ```
 */
export async function withProjectAccess(
  projectId: string,
  action: 'read' | 'write' | 'manage',
  request: Request,
  handler: (userId: string, projectId: string, supabase: SupabaseClient) => Promise<Response>
): Promise<Response> {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const authResult = await checkProjectAccess(user.id, projectId, action, supabase);

    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          reason: authResult.reason
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute handler with authorized context
    return handler(user.id, projectId, supabase);

  } catch (error) {
    console.error('Error in withProjectAccess:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
