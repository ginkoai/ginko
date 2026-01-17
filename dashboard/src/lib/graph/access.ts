/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-17
 * @tags: [graph, access-control, security, multi-tenant, adhoc_260117_s01]
 * @related: [resolve-user.ts, _neo4j.ts, ../supabase/server.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, @supabase/supabase-js]
 */

/**
 * Graph Access Verification Helper
 *
 * Provides multi-tenant access control for graph operations.
 * Prevents data leakage between projects by verifying user ownership
 * or team membership before allowing graph access.
 *
 * Access Rules:
 * 1. User is graph owner (graph.userId === userId) -> owner access
 * 2. User belongs to team that owns graph (teams.graph_id === graphId) -> member access
 * 3. Graph is public and request is read-only -> public access
 * 4. None of above -> denied
 *
 * @example
 * ```typescript
 * const access = await verifyGraphAccess(token, graphId);
 * if (!access.hasAccess) {
 *   return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
 * }
 * ```
 */

import { resolveUserId, ResolvedUser, ResolutionError } from '@/lib/auth/resolve-user';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runQuery } from '@/app/api/v1/graph/_neo4j';

export type AccessRole = 'owner' | 'admin' | 'member' | 'viewer' | 'public';

export interface GraphAccessResult {
  hasAccess: boolean;
  role?: AccessRole;
  userId?: string;
  graphOwnerId?: string;
  teamId?: string;
  teamName?: string;
  error?: string;
}

interface GraphNode {
  userId: string;
  graphId: string;
  visibility?: 'private' | 'organization' | 'public';
  projectName?: string;
}

/**
 * Verify user has access to a graph
 *
 * @param token - Bearer token (gk_* API key or OAuth JWT)
 * @param graphId - The graph namespace to check access for
 * @param requiredAccess - Minimum access level required ('read' | 'write')
 * @returns GraphAccessResult with access decision and context
 */
export async function verifyGraphAccess(
  token: string,
  graphId: string,
  requiredAccess: 'read' | 'write' = 'read'
): Promise<GraphAccessResult> {
  // 1. Resolve token to userId
  const userResult = await resolveUserId(token);

  if ('error' in userResult) {
    return {
      hasAccess: false,
      error: userResult.error,
    };
  }

  const { userId } = userResult;

  // 2. Query Neo4j for graph ownership and visibility
  let graph: GraphNode | null = null;
  try {
    const results = await runQuery<{ p: GraphNode }>(
      `
      MATCH (p:Project {graphId: $graphId})
      RETURN p { .userId, .graphId, .visibility, .projectName } as p
      LIMIT 1
      `,
      { graphId }
    );

    if (results.length > 0 && results[0].p) {
      graph = results[0].p;
    }
  } catch (error) {
    console.error('[verifyGraphAccess] Neo4j query error:', error);
    return {
      hasAccess: false,
      error: 'Failed to verify graph access',
    };
  }

  // Graph doesn't exist
  if (!graph) {
    return {
      hasAccess: false,
      error: 'Graph not found',
    };
  }

  // 3. Check direct ownership
  if (graph.userId === userId) {
    return {
      hasAccess: true,
      role: 'owner',
      userId,
      graphOwnerId: graph.userId,
    };
  }

  // 4. Check team membership via Supabase
  const teamAccess = await checkTeamAccess(userId, graphId);
  if (teamAccess.hasAccess) {
    return {
      hasAccess: true,
      role: teamAccess.role,
      userId,
      graphOwnerId: graph.userId,
      teamId: teamAccess.teamId,
      teamName: teamAccess.teamName,
    };
  }

  // 5. Check public visibility (read-only access)
  if (graph.visibility === 'public' && requiredAccess === 'read') {
    return {
      hasAccess: true,
      role: 'public',
      userId,
      graphOwnerId: graph.userId,
    };
  }

  // 6. No access
  return {
    hasAccess: false,
    userId,
    graphOwnerId: graph.userId,
    error: 'User does not have access to this graph',
  };
}

/**
 * Check if user has team-based access to a graph
 */
async function checkTeamAccess(
  userId: string,
  graphId: string
): Promise<{
  hasAccess: boolean;
  role?: AccessRole;
  teamId?: string;
  teamName?: string;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Find team that owns this graph
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('graph_id', graphId)
      .single();

    if (teamError || !team) {
      // No team owns this graph, that's OK - fall through to other checks
      return { hasAccess: false };
    }

    // Check if user is a member of this team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team.id)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return { hasAccess: false };
    }

    // Map team role to access role
    const role = membership.role as AccessRole;

    return {
      hasAccess: true,
      role,
      teamId: team.id,
      teamName: team.name,
    };
  } catch (error) {
    console.error('[checkTeamAccess] Error checking team membership:', error);
    return { hasAccess: false };
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove 'Bearer ' prefix
}

/**
 * Verify graph access from a NextRequest
 * Convenience wrapper for API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const access = await verifyGraphAccessFromRequest(request, graphId);
 *   if (!access.hasAccess) {
 *     return NextResponse.json(
 *       { error: { code: 'ACCESS_DENIED', message: access.error } },
 *       { status: access.error === 'Graph not found' ? 404 : 403 }
 *     );
 *   }
 *   // proceed with operation...
 * }
 * ```
 */
export async function verifyGraphAccessFromRequest(
  request: { headers: { get(name: string): string | null } },
  graphId: string,
  requiredAccess: 'read' | 'write' = 'read'
): Promise<GraphAccessResult> {
  const token = extractBearerToken(request.headers.get('authorization'));

  if (!token) {
    return {
      hasAccess: false,
      error: 'Authentication required',
    };
  }

  return verifyGraphAccess(token, graphId, requiredAccess);
}
