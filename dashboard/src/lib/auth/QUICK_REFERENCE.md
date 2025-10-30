# Authorization Quick Reference

**TL;DR**: Use these helpers to check if users can access projects in the multi-tenant system.

## Common Use Cases

### 1. API Route - Read Access

```typescript
import { canReadProject } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req, { params }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await canReadProject(user.id, params.projectId, supabase)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Your logic here
}
```

### 2. API Route - Write Access

```typescript
import { canWriteProject } from '@/lib/auth/authorization';

export async function PATCH(req, { params }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await canWriteProject(user.id, params.projectId, supabase)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Your logic here
}
```

### 3. API Route - Delete/Manage Access

```typescript
import { canManageProject } from '@/lib/auth/authorization';

export async function DELETE(req, { params }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await canManageProject(user.id, params.projectId, supabase)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Your logic here
}
```

### 4. Using Middleware Wrapper (Easiest)

```typescript
import { withProjectAccess } from '@/lib/auth/authorization';

export async function PATCH(req, { params }) {
  return withProjectAccess(
    params.projectId,
    'write',
    req,
    async (userId, projectId, supabase) => {
      // Your logic - only runs if authorized
      const body = await req.json();
      // ... update project
      return NextResponse.json({ success: true });
    }
  );
}
```

### 5. Server Component

```typescript
import { canReadProject } from '@/lib/auth/authorization';
import { createServerClient } from '@/lib/supabase/server';

export default async function ProjectPage({ params }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await canReadProject(user.id, params.projectId, supabase)) {
    redirect('/dashboard');
  }

  return <div>Project content</div>;
}
```

### 6. Conditional UI

```typescript
const canWrite = await canWriteProject(user.id, project.id, supabase);
const canManage = await canManageProject(user.id, project.id, supabase);

return (
  <>
    {canWrite && <EditButton />}
    {canManage && <DeleteButton />}
  </>
);
```

### 7. List Projects (Batch Check)

```typescript
import { batchCheckProjectAccess } from '@/lib/auth/authorization';

const { data: projects } = await supabase.from('projects').select('*');
const projectIds = projects.map(p => p.id);
const accessMap = await batchCheckProjectAccess(user.id, projectIds, supabase);

const accessible = projects.filter(p => accessMap.get(p.id));
```

### 8. Detailed Error Messages

```typescript
import { checkProjectAccess } from '@/lib/auth/authorization';

const result = await checkProjectAccess(user.id, project.id, 'write', supabase);

if (!result.authorized) {
  return NextResponse.json(
    { error: result.reason },
    { status: 403 }
  );
}
```

## Role Hierarchy

### Organization Roles
- `owner` - Can manage everything (including delete org)
- `admin` - Can manage teams and projects (cannot delete org)
- `member` - Standard user access to assigned teams
- `viewer` - Read-only access to assigned teams

### Team Roles
- `owner` - Full team control
- `admin` - Can manage projects and members
- `member` - Read/write to projects
- `viewer` - Read-only

## Permission Matrix

| Action | Org Owner | Org Admin | Team Owner | Team Admin | Team Member | Team Viewer |
|--------|-----------|-----------|------------|------------|-------------|-------------|
| Read   | ✅        | ✅        | ✅         | ✅         | ✅          | ✅          |
| Write  | ✅        | ✅        | ✅         | ✅         | ❌          | ❌          |
| Manage | ✅        | ❌        | ✅         | ❌         | ❌          | ❌          |

## Performance Tips

### ✅ DO: Reuse Supabase Client

```typescript
const supabase = await createServerClient();
const canRead = await canReadProject(userId, projectId, supabase);
const canWrite = await canWriteProject(userId, projectId, supabase);
```

### ❌ DON'T: Create Multiple Clients

```typescript
const canRead = await canReadProject(userId, projectId);  // Creates client
const canWrite = await canWriteProject(userId, projectId); // Creates another client
```

### ✅ DO: Use Batch Operations

```typescript
const accessMap = await batchCheckProjectAccess(userId, projectIds, supabase);
```

### ❌ DON'T: Loop Individual Checks

```typescript
for (const projectId of projectIds) {
  const canRead = await canReadProject(userId, projectId); // N queries
}
```

## Files Reference

- **Main Implementation**: `authorization.ts` (601 lines)
- **Usage Examples**: `authorization.examples.ts` (388 lines)
- **Tests**: `authorization.test.ts` (731 lines)
- **Types**: `types.ts` (type definitions)
- **Full Documentation**: `README.md`

## When to Use Each Function

- **`canReadProject`** - Viewing project, fetching data
- **`canWriteProject`** - Updating settings, adding content
- **`canManageProject`** - Deleting project, transferring ownership
- **`checkProjectAccess`** - Need detailed error messages
- **`batchCheckProjectAccess`** - Listing multiple projects
- **`withProjectAccess`** - API routes (easiest, recommended)

## Common Patterns

### API Route Pattern

```typescript
export async function [METHOD](request, { params }) {
  return withProjectAccess(
    params.projectId,
    '[read|write|manage]',
    request,
    async (userId, projectId, supabase) => {
      // Your logic here
    }
  );
}
```

### Server Component Pattern

```typescript
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user || !await can[Read|Write|Manage]Project(user.id, projectId, supabase)) {
  redirect('/dashboard');
}
```

### Conditional Rendering Pattern

```typescript
const [canWrite, canManage] = await Promise.all([
  canWriteProject(user.id, projectId, supabase),
  canManageProject(user.id, projectId, supabase),
]);

return (
  <>
    {canWrite && <EditUI />}
    {canManage && <DeleteUI />}
  </>
);
```

---

**Need more details?** See `README.md` or `authorization.examples.ts`
