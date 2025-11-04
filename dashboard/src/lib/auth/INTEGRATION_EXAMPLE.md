# Complete Integration Example

This document shows a complete example of integrating the authorization system into a Next.js API route for managing projects.

## File: `app/api/projects/[projectId]/route.ts`

```typescript
/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-29
 * @tags: [api, projects, authorization, multi-tenancy]
 * @related: [authorization.ts, middleware.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, @supabase/ssr]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  canReadProject,
  canWriteProject,
  canManageProject,
  checkProjectAccess,
  withProjectAccess,
} from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/projects/[projectId]
 * Read project details
 *
 * Authorization: Requires read access (any team member)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check read access
    const hasAccess = await canReadProject(user.id, params.projectId, supabase);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Fetch project with related data
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        slug,
        repository_url,
        repository_provider,
        is_active,
        created_at,
        updated_at,
        team:teams (
          id,
          name,
          slug,
          organization:organizations (
            id,
            name,
            slug,
            plan_tier
          )
        )
      `)
      .eq('id', params.projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]
 * Update project settings
 *
 * Authorization: Requires write access (team owner/admin or org owner/admin)
 *
 * Example using withProjectAccess middleware (recommended)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return withProjectAccess(
    params.projectId,
    'write',
    request,
    async (userId, projectId, supabase) => {
      try {
        // Parse and validate request body
        const body = await request.json();

        const allowedFields = [
          'name',
          'repository_url',
          'repository_provider',
          'webhook_secret',
          'settings',
        ];

        const updates: any = {
          updated_at: new Date().toISOString(),
        };

        // Only include allowed fields from request
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updates[field] = body[field];
          }
        });

        // Update project
        const { data: project, error: updateError } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating project:', updateError);
          return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
          );
        }

        // Log activity
        await supabase.from('team_activities').insert({
          team_id: project.team_id,
          project_id: projectId,
          user_id: userId,
          activity_type: 'project_update',
          activity_data: { fields: Object.keys(updates) },
        });

        return NextResponse.json({ project });

      } catch (error) {
        console.error('Error in PATCH handler:', error);
        return NextResponse.json(
          { error: 'Invalid request' },
          { status: 400 }
        );
      }
    }
  );
}

/**
 * DELETE /api/projects/[projectId]
 * Delete (soft delete) a project
 *
 * Authorization: Requires manage access (team owner or org owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check manage access with detailed result
    const authResult = await checkProjectAccess(
      user.id,
      params.projectId,
      'manage',
      supabase
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          error: 'Access denied',
          reason: authResult.reason,
          requiredPermission: 'Only project owners and organization owners can delete projects'
        },
        { status: 403 }
      );
    }

    // Get project for logging
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, name')
      .eq('id', params.projectId)
      .single();

    // Soft delete project
    const { error: deleteError } = await supabase
      .from('projects')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    // Log deletion activity
    if (project) {
      await supabase.from('team_activities').insert({
        team_id: project.team_id,
        project_id: params.projectId,
        user_id: user.id,
        activity_type: 'project_delete',
        activity_data: { project_name: project.name },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/restore
 * Restore a soft-deleted project
 *
 * Authorization: Requires manage access
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return withProjectAccess(
    params.projectId,
    'manage',
    request,
    async (userId, projectId, supabase) => {
      try {
        // Restore project
        const { data: project, error: restoreError } = await supabase
          .from('projects')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId)
          .select()
          .single();

        if (restoreError) {
          return NextResponse.json(
            { error: 'Failed to restore project' },
            { status: 500 }
          );
        }

        // Log restoration
        await supabase.from('team_activities').insert({
          team_id: project.team_id,
          project_id: projectId,
          user_id: userId,
          activity_type: 'project_restore',
          activity_data: { project_name: project.name },
        });

        return NextResponse.json({
          success: true,
          project
        });

      } catch (error) {
        console.error('Error restoring project:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  );
}
```

## File: `app/api/projects/route.ts`

```typescript
/**
 * List all projects accessible to the user
 */
import { NextRequest, NextResponse } from 'next/server';
import { batchCheckProjectAccess } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all active projects in user's organization
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        slug,
        repository_url,
        repository_provider,
        created_at,
        updated_at,
        team:teams!inner (
          id,
          name,
          slug,
          organization_id
        )
      `)
      .eq('teams.organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Batch check access for all projects
    const projectIds = projects.map(p => p.id);
    const accessMap = await batchCheckProjectAccess(user.id, projectIds, supabase);

    // Filter to only accessible projects
    const accessibleProjects = projects.filter(p => accessMap.get(p.id));

    return NextResponse.json({
      projects: accessibleProjects,
      total: accessibleProjects.length,
    });

  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## File: `app/api/projects/[projectId]/permissions/route.ts`

```typescript
/**
 * Get user's permissions for a specific project
 * Useful for client-side UI conditional rendering
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  canReadProject,
  canWriteProject,
  canManageProject,
} from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check all permission levels in parallel
    const [canRead, canWrite, canManage] = await Promise.all([
      canReadProject(user.id, params.projectId, supabase),
      canWriteProject(user.id, params.projectId, supabase),
      canManageProject(user.id, params.projectId, supabase),
    ]);

    if (!canRead) {
      return NextResponse.json(
        { error: 'Project not found or no access' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      projectId: params.projectId,
      permissions: {
        read: canRead,
        write: canWrite,
        manage: canManage,
      },
    });

  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing the API

```bash
# List all accessible projects
curl https://app.ginko.ai/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific project
curl https://app.ginko.ai/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update project (requires write access)
curl -X PATCH https://app.ginko.ai/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Project Name"}'

# Delete project (requires manage access)
curl -X DELETE https://app.ginko.ai/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check permissions
curl https://app.ginko.ai/api/projects/PROJECT_ID/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Client-Side Integration

```typescript
// app/projects/[projectId]/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/projects/${params.projectId}/permissions`)
      .then(res => res.json())
      .then(data => setPermissions(data.permissions));
  }, [params.projectId]);

  if (!permissions) return <div>Loading...</div>;

  return (
    <div>
      <h1>Project Details</h1>
      {permissions.write && <button>Edit Settings</button>}
      {permissions.manage && <button>Delete Project</button>}
    </div>
  );
}
```

---

This example demonstrates:
- ✅ Complete CRUD operations with authorization
- ✅ Both manual checks and middleware wrapper patterns
- ✅ Detailed error messages for unauthorized access
- ✅ Activity logging for audit trail
- ✅ Batch operations for listing projects
- ✅ Permission checking endpoint for client-side UI
