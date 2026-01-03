/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-29
 * @tags: [auth, authorization, examples, documentation, api-routes]
 * @related: [authorization.ts, middleware.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [next]
 */

/**
 * Authorization Helper Usage Examples
 *
 * This file demonstrates common patterns for using the authorization helpers
 * in different contexts (API routes, server components, middleware).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  canReadProject,
  canWriteProject,
  canManageProject,
  checkProjectAccess,
  batchCheckProjectAccess,
  withProjectAccess,
} from './authorization';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Example 1: Simple authorization check in API route
 */
export async function exampleReadProjectEndpoint(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user can read project
  const hasAccess = await canReadProject(user.id, params.projectId, supabase);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch project data
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single();

  return NextResponse.json({ project });
}

/**
 * Example 2: Write operation with detailed error messages
 */
export async function exampleUpdateProjectEndpoint(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check write access with detailed result
  const authResult = await checkProjectAccess(user.id, params.projectId, 'write', supabase);
  if (!authResult.authorized) {
    return NextResponse.json(
      {
        error: 'Access denied',
        reason: authResult.reason,
        requiredRole: 'admin or owner'
      },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await request.json();

  // Update project
  const { data: project, error: updateError } = await supabase
    .from('projects')
    .update({
      name: body.name,
      settings: body.settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.projectId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ project });
}

/**
 * Example 3: Management operation (delete project)
 */
export async function exampleDeleteProjectEndpoint(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check manage access (highest permission level)
  const canManage = await canManageProject(user.id, params.projectId, supabase);
  if (!canManage) {
    return NextResponse.json(
      {
        error: 'Access denied',
        reason: 'Only project owners and organization owners can delete projects'
      },
      { status: 403 }
    );
  }

  // Soft delete project
  const { error: deleteError } = await supabase
    .from('projects')
    .update({ is_active: false })
    .eq('id', params.projectId);

  if (deleteError) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Example 4: Using middleware wrapper (recommended pattern)
 */
export async function exampleWithMiddlewareWrapper(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  // All auth and authorization handled by middleware
  return withProjectAccess(
    params.projectId,
    'write',
    request,
    async (userId, projectId, supabase) => {
      // This code only runs if user is authenticated and authorized

      // Parse request body
      const body = await request.json();

      // Update project
      const { data: project, error } = await supabase
        .from('projects')
        .update(body)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }

      return NextResponse.json({ project });
    }
  );
}

/**
 * Example 5: Batch checking multiple projects (for listing endpoints)
 */
export async function exampleListProjectsEndpoint(request: NextRequest) {
  const supabase = await createServerClient();

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all projects in organization
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, team_id, teams!inner(organization_id)')
    .eq('teams.organization_id', userData.organization_id)
    .eq('is_active', true);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  // Batch check access for all projects
  const projectIds = projects.map(p => p.id);
  const accessMap = await batchCheckProjectAccess(user.id, projectIds, supabase);

  // Filter to only accessible projects
  const accessibleProjects = projects.filter(p => accessMap.get(p.id));

  return NextResponse.json({ projects: accessibleProjects });
}

/**
 * Example 6: Server component pattern
 */
export async function exampleServerComponent({ projectId }: { projectId: string }) {
  const supabase = await createServerClient();

  // Get authenticated user (in server component)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in</div>;
  }

  // Check access
  const hasAccess = await canReadProject(user.id, projectId, supabase);

  if (!hasAccess) {
    return <div>Access denied</div>;
  }

  // Fetch and display project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  return (
    <div>
      <h1>{project?.name}</h1>
      {/* Rest of component */}
    </div>
  );
}

/**
 * Example 7: Conditional UI rendering based on permissions
 */
export async function exampleConditionalUI({ projectId }: { projectId: string }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Check different permission levels
  const canRead = await canReadProject(user.id, projectId, supabase);
  const canWrite = await canWriteProject(user.id, projectId, supabase);
  const canManage = await canManageProject(user.id, projectId, supabase);

  return (
    <div>
      {canRead && <div>View project details</div>}
      {canWrite && <button>Edit Project</button>}
      {canManage && <button>Delete Project</button>}
    </div>
  );
}

/**
 * Example 8: API route for checking permissions (client-side)
 */
export async function exampleCheckPermissionsEndpoint(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all permission levels
  const [canRead, canWrite, canManage] = await Promise.all([
    canReadProject(user.id, params.projectId, supabase),
    canWriteProject(user.id, params.projectId, supabase),
    canManageProject(user.id, params.projectId, supabase),
  ]);

  return NextResponse.json({
    projectId: params.projectId,
    permissions: {
      read: canRead,
      write: canWrite,
      manage: canManage,
    }
  });
}

/**
 * Example 9: Webhook endpoint with authorization
 */
export async function exampleWebhookEndpoint(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();

  // Webhooks might use API key auth instead of session
  const apiKey = request.headers.get('x-api-key');

  // Verify API key and get user
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('api_key_hash', apiKey)
    .eq('is_active', true)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Check write access (webhooks modify data)
  const canWrite = await canWriteProject(userData.id, params.projectId, supabase);
  if (!canWrite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Process webhook
  const payload = await request.json();

  // Store git event
  await supabase.from('git_events').insert({
    project_id: params.projectId,
    event_type: payload.type,
    webhook_payload: payload,
  });

  return NextResponse.json({ success: true });
}

/**
 * Example 10: Team context - checking team-level permissions
 */
export async function exampleTeamPermissions(
  userId: string,
  teamId: string
) {
  const supabase = await createServerClient();

  // Get user's role in team
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();

  if (!membership) {
    return { canViewTeam: false, canManageTeam: false };
  }

  // Team permissions
  const canViewTeam = true; // Any member can view
  const canManageTeam = membership.role === 'owner';

  return { canViewTeam, canManageTeam };
}
