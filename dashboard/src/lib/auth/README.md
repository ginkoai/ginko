# Multi-Tenancy Authorization System

**Location**: `/dashboard/src/lib/auth/authorization.ts`
**Status**: Production Ready
**TASK**: TASK-020 (Multi-tenancy support)

## Overview

This module provides comprehensive authorization helpers for multi-tenancy access control in the Ginko dashboard. It implements role-based access control (RBAC) across three levels:

1. **Organization Level** - owner, admin, member, viewer
2. **Team Level** - owner, admin, member, viewer
3. **Project Level** - inherited from team membership

## Architecture

### Entity Hierarchy

```
Organization
  └── Teams
      └── Projects
          └── Resources (contexts, sessions, etc.)

Users
  └── Organization Membership (role: owner/admin/member/viewer)
  └── Team Memberships (role: owner/admin/member/viewer per team)
```

### Access Control Rules

#### Read Access (`canReadProject`)

User can read a project if:
- ✅ User is organization owner or admin
- ✅ User is a member of the project's team (any role)
- ❌ User is not a team member
- ❌ Project is inactive
- ❌ User is inactive

#### Write Access (`canWriteProject`)

User can write to a project if:
- ✅ User is organization owner or admin
- ✅ User is team owner or admin
- ❌ User is team member or viewer (read-only)
- ❌ User is not a team member

#### Manage Access (`canManageProject`)

User can manage (delete, transfer) a project if:
- ✅ User is organization owner
- ✅ User is team owner
- ❌ User is organization admin (can write but not manage)
- ❌ User is team admin (can write but not manage)

## API Reference

### Core Functions

#### `canReadProject(userId, projectId, supabase?): Promise<boolean>`

Check if user can read a project.

```typescript
import { canReadProject } from '@/lib/auth/authorization';

const hasAccess = await canReadProject(user.id, project.id);
if (!hasAccess) {
  return new Response('Forbidden', { status: 403 });
}
```

#### `canWriteProject(userId, projectId, supabase?): Promise<boolean>`

Check if user can write to a project.

```typescript
import { canWriteProject } from '@/lib/auth/authorization';

const canWrite = await canWriteProject(user.id, project.id);
if (!canWrite) {
  return new Response('Forbidden', { status: 403 });
}
```

#### `canManageProject(userId, projectId, supabase?): Promise<boolean>`

Check if user can manage (delete/transfer) a project.

```typescript
import { canManageProject } from '@/lib/auth/authorization';

const canManage = await canManageProject(user.id, project.id);
if (!canManage) {
  return new Response('Forbidden', { status: 403 });
}
```

### Advanced Functions

#### `checkProjectAccess(userId, projectId, action, supabase?): Promise<AuthorizationResult>`

Get detailed authorization result with reason and role information.

```typescript
import { checkProjectAccess } from '@/lib/auth/authorization';

const result = await checkProjectAccess(user.id, project.id, 'write');
if (!result.authorized) {
  return new Response(
    JSON.stringify({
      error: 'Access denied',
      reason: result.reason
    }),
    { status: 403 }
  );
}
```

**Returns**:
```typescript
interface AuthorizationResult {
  authorized: boolean;
  reason?: string;          // Human-readable reason if denied
  role?: OrganizationRole | TeamRole;  // User's role if authorized
}
```

#### `batchCheckProjectAccess(userId, projectIds, supabase?): Promise<Map<string, boolean>>`

Efficiently check access to multiple projects at once.

```typescript
import { batchCheckProjectAccess } from '@/lib/auth/authorization';

const projectIds = ['proj-1', 'proj-2', 'proj-3'];
const accessMap = await batchCheckProjectAccess(user.id, projectIds);

// Filter to accessible projects
const accessible = projectIds.filter(id => accessMap.get(id));
```

**Performance**: Single database query for all projects vs N queries for individual checks.

#### `withProjectAccess(projectId, action, request, handler): Promise<Response>`

Middleware wrapper that handles authentication and authorization.

```typescript
import { withProjectAccess } from '@/lib/auth/authorization';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return withProjectAccess(
    params.projectId,
    'write',
    request,
    async (userId, projectId, supabase) => {
      // Your logic here - only runs if authorized
      const body = await request.json();
      const { data } = await supabase
        .from('projects')
        .update(body)
        .eq('id', projectId)
        .select()
        .single();

      return NextResponse.json({ project: data });
    }
  );
}
```

## Usage Patterns

### Pattern 1: Simple API Route Authorization

```typescript
// app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { canReadProject } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await canReadProject(user.id, params.projectId, supabase);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch and return project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single();

  return NextResponse.json({ project });
}
```

### Pattern 2: Middleware Wrapper (Recommended)

```typescript
// app/api/projects/[projectId]/route.ts
import { withProjectAccess } from '@/lib/auth/authorization';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return withProjectAccess(
    params.projectId,
    'write',
    request,
    async (userId, projectId, supabase) => {
      const body = await request.json();
      // Update project logic
      return NextResponse.json({ success: true });
    }
  );
}
```

### Pattern 3: Server Component Authorization

```typescript
// app/projects/[projectId]/page.tsx
import { canReadProject } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProjectPage({
  params
}: {
  params: { projectId: string }
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const hasAccess = await canReadProject(user.id, params.projectId, supabase);
  if (!hasAccess) redirect('/dashboard');

  // Render project
  return <div>Project content</div>;
}
```

### Pattern 4: Conditional UI Rendering

```typescript
// components/project-actions.tsx
import { canWriteProject, canManageProject } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export async function ProjectActions({ projectId }: { projectId: string }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const canWrite = await canWriteProject(user.id, projectId, supabase);
  const canManage = await canManageProject(user.id, projectId, supabase);

  return (
    <div>
      {canWrite && <button>Edit Settings</button>}
      {canManage && <button>Delete Project</button>}
    </div>
  );
}
```

### Pattern 5: Batch Operations

```typescript
// app/api/projects/route.ts - List accessible projects
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all projects in organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, team_id, teams!inner(organization_id)')
    .eq('teams.organization_id', userData.organization_id);

  // Batch check access
  const projectIds = projects.map(p => p.id);
  const accessMap = await batchCheckProjectAccess(user.id, projectIds, supabase);

  // Filter accessible projects
  const accessible = projects.filter(p => accessMap.get(p.id));

  return NextResponse.json({ projects: accessible });
}
```

## Performance Optimization

### Caching User Context

The authorization system internally caches user context to minimize database queries:

```typescript
// Single query fetches:
// - User's organization role
// - All team memberships
// - Project ownerships

const authContext = await getUserAuthContext(supabase, userId);
// {
//   userId: 'user-123',
//   organizationId: 'org-456',
//   organizationRole: 'member',
//   teamMemberships: Map { 'team-1' => 'admin', 'team-2' => 'member' },
//   projectOwnerships: Set { 'project-1', 'project-2' }
// }
```

### Reusing Supabase Client

Always pass the Supabase client to avoid creating multiple connections:

```typescript
// ❌ Bad - Creates new client for each call
const canRead = await canReadProject(userId, projectId);
const canWrite = await canWriteProject(userId, projectId);

// ✅ Good - Reuses client
const supabase = await createServerClient();
const canRead = await canReadProject(userId, projectId, supabase);
const canWrite = await canWriteProject(userId, projectId, supabase);
```

## Security Considerations

### 1. Always Verify Organization Membership

The system validates that projects belong to the user's organization before granting access:

```typescript
// Even organization owners can't access other org's projects
if (projectOrgId !== authContext.organizationId) {
  return false;
}
```

### 2. Inactive Users and Projects

Inactive entities are automatically denied access:

```typescript
if (!user.is_active || !project.is_active) {
  return false;
}
```

### 3. Principle of Least Privilege

- **Members**: Read-only by default
- **Admins**: Can write but not delete
- **Owners**: Full control

### 4. Cross-Organization Protection

Users from other organizations are always denied access, even if they somehow know the project ID.

## Error Handling

All functions gracefully handle errors and return `false` on failure:

```typescript
try {
  // Authorization logic
} catch (error) {
  console.error('Error checking access:', error);
  return false; // Fail closed
}
```

**Fail Closed**: On error, deny access rather than allow.

## Testing

Run tests with:

```bash
npm test authorization.test.ts
```

Tests cover:
- ✅ Organization owner permissions
- ✅ Organization admin permissions
- ✅ Team owner permissions
- ✅ Team admin permissions
- ✅ Team member permissions
- ✅ Team viewer permissions
- ✅ Non-member denial
- ✅ Inactive user denial
- ✅ Inactive project denial
- ✅ Cross-organization denial

## Migration Guide

If migrating from simple user-based auth:

```typescript
// Before (simple user check)
if (project.user_id !== user.id) {
  return new Response('Forbidden', { status: 403 });
}

// After (multi-tenancy)
const hasAccess = await canWriteProject(user.id, project.id);
if (!hasAccess) {
  return new Response('Forbidden', { status: 403 });
}
```

## Related Files

- **Schema**: `/database/schema.sql` - Database schema definition
- **Middleware**: `/dashboard/src/lib/auth/middleware.ts` - Authentication middleware
- **Examples**: `/dashboard/src/lib/auth/authorization.examples.ts` - Usage examples
- **Tests**: `/dashboard/src/lib/auth/authorization.test.ts` - Unit tests

## Support

For questions or issues:
1. Check usage examples in `authorization.examples.ts`
2. Review test cases in `authorization.test.ts`
3. Consult the schema in `/database/schema.sql`
4. Check TASK-020 in project planning

---

**Last Updated**: 2025-10-29
**Author**: Claude (chris@watchhill.ai)
**Task**: TASK-020 Multi-tenancy Support
