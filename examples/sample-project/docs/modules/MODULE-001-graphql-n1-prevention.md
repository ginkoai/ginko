---
title: GraphQL N+1 Query Prevention
status: active
tags: [graphql, performance, pattern, backend]
created: 2025-09-25
updated: 2025-10-10
author: engineering@example.com
---

# MODULE-001: GraphQL N+1 Query Prevention

## Context

The **N+1 query problem** is a common performance issue in GraphQL APIs. It occurs when:
1. You fetch a list of items (1 query)
2. For each item, you fetch related data (N queries)

**Example:** Fetching 100 tasks with their creators results in 101 database queries:
- 1 query: Fetch 100 tasks
- 100 queries: Fetch each task's creator

This kills performance at scale.

## The Problem

### Naive Implementation (❌ N+1 Queries)

```typescript
// GraphQL resolver - BAD
const resolvers = {
  Query: {
    tasks: () => {
      // 1 query: Get all tasks
      return prisma.task.findMany({ take: 100 })
    },
  },

  Task: {
    createdBy: (task) => {
      // This runs 100 times! (N queries)
      return prisma.user.findUnique({
        where: { id: task.createdById }
      })
    },
  },
}
```

**Result:** 101 database queries for 100 tasks!

```sql
-- Query 1: Get tasks
SELECT * FROM tasks LIMIT 100;

-- Queries 2-101: Get each creator (N+1 problem!)
SELECT * FROM users WHERE id = 'user_1';
SELECT * FROM users WHERE id = 'user_2';
SELECT * FROM users WHERE id = 'user_3';
-- ... 97 more queries
```

### Performance Impact

- **100 tasks:** 101 queries (~500ms)
- **1000 tasks:** 1001 queries (~5000ms = 5 seconds!)
- **10000 tasks:** 10001 queries (timeout!)

## The Solution: DataLoader

**DataLoader** batches and caches database requests:
1. Collects all requested IDs
2. Fetches them in a single query
3. Caches results for current request

### Implementation (✅ 2 Queries)

```typescript
import DataLoader from 'dataloader'

// Create DataLoader for batching user fetches
const createUserLoader = () => {
  return new DataLoader(async (userIds: readonly string[]) => {
    // Single query for all user IDs!
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } }
    })

    // Return users in same order as requested IDs
    const userMap = new Map(users.map(user => [user.id, user]))
    return userIds.map(id => userMap.get(id) || null)
  })
}

// GraphQL resolver - GOOD
const resolvers = {
  Query: {
    tasks: () => {
      // 1 query: Get all tasks
      return prisma.task.findMany({ take: 100 })
    },
  },

  Task: {
    createdBy: (task, _args, context) => {
      // Batched into single query!
      return context.loaders.user.load(task.createdById)
    },
  },
}
```

**Result:** Only 2 database queries!

```sql
-- Query 1: Get tasks
SELECT * FROM tasks LIMIT 100;

-- Query 2: Get all creators in one go!
SELECT * FROM users WHERE id IN ('user_1', 'user_2', 'user_3', ...);
```

### Performance Improvement

- **100 tasks:** 2 queries (~50ms) - **10x faster!**
- **1000 tasks:** 2 queries (~100ms) - **50x faster!**
- **10000 tasks:** 2 queries (~500ms) - **Still fast!**

## How DataLoader Works

### Step 1: Request Collection

```
GraphQL resolver calls:
  - loader.load('user_1')
  - loader.load('user_2')
  - loader.load('user_3')
  ...
```

### Step 2: Batching

DataLoader collects all IDs within a single tick:
```javascript
const batchedIds = ['user_1', 'user_2', 'user_3', ...]
```

### Step 3: Single Batch Query

Executes batch function with all IDs:
```typescript
const users = await prisma.user.findMany({
  where: { id: { in: batchedIds } }
})
```

### Step 4: Distribution

Returns each user to the corresponding resolver:
```
loader.load('user_1') → User { id: 'user_1', name: 'Alice' }
loader.load('user_2') → User { id: 'user_2', name: 'Bob' }
...
```

## Setup with GraphQL Yoga

### Context Creation

```typescript
// app/api/graphql/context.ts
import { PrismaClient } from '@prisma/client'
import DataLoader from 'dataloader'

const prisma = new PrismaClient()

export type Context = {
  prisma: PrismaClient
  userId: string | null
  loaders: {
    user: DataLoader<string, User | null>
    project: DataLoader<string, Project | null>
    team: DataLoader<string, Team | null>
  }
}

export function createContext(request: Request): Context {
  // Get user from auth header
  const userId = getUserIdFromRequest(request)

  // Create fresh loaders per request (important!)
  return {
    prisma,
    userId,
    loaders: {
      user: new DataLoader(async (ids) => {
        const users = await prisma.user.findMany({
          where: { id: { in: [...ids] } }
        })
        return ids.map(id => users.find(u => u.id === id) || null)
      }),

      project: new DataLoader(async (ids) => {
        const projects = await prisma.project.findMany({
          where: { id: { in: [...ids] } }
        })
        return ids.map(id => projects.find(p => p.id === id) || null)
      }),

      team: new DataLoader(async (ids) => {
        const teams = await prisma.team.findMany({
          where: { id: { in: [...ids] } }
        })
        return ids.map(id => teams.find(t => t.id === id) || null)
      }),
    },
  }
}
```

### GraphQL Yoga Integration

```typescript
// app/api/graphql/route.ts
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
import { createContext } from './context'

const { handleRequest } = createYoga({
  schema,
  context: ({ request }) => createContext(request),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
})

export { handleRequest as GET, handleRequest as POST }
```

### Resolver Usage

```typescript
// app/api/graphql/resolvers.ts
export const resolvers = {
  Query: {
    tasks: (_parent, args, context) => {
      return context.prisma.task.findMany({
        where: { projectId: args.projectId },
        take: args.limit,
      })
    },
  },

  Task: {
    // Use loader instead of direct Prisma call
    createdBy: (task, _args, context) => {
      return context.loaders.user.load(task.createdById)
    },

    project: (task, _args, context) => {
      return context.loaders.project.load(task.projectId)
    },

    assignees: async (task, _args, context) => {
      // Get task-assignee relationships
      const assignments = await context.prisma.taskAssignment.findMany({
        where: { taskId: task.id }
      })

      // Batch load all assignees
      return context.loaders.user.loadMany(
        assignments.map(a => a.userId)
      )
    },
  },
}
```

## Common Gotchas

### 1. ❌ Don't Reuse Loaders Across Requests

```typescript
// BAD - Loaders cached between requests!
const userLoader = new DataLoader(...)

export function createContext() {
  return { loaders: { user: userLoader } }  // ❌ Same instance
}
```

```typescript
// GOOD - Fresh loaders per request
export function createContext() {
  return {
    loaders: {
      user: new DataLoader(...)  // ✅ New instance
    }
  }
}
```

**Why?** Loaders cache results. Sharing across requests leaks data between users!

### 2. ❌ Don't Forget to Return in Correct Order

```typescript
// BAD - Returns in database order!
new DataLoader(async (ids) => {
  return prisma.user.findMany({
    where: { id: { in: [...ids] } }
  })
  // ❌ Order doesn't match requested IDs!
})
```

```typescript
// GOOD - Returns in requested order
new DataLoader(async (ids) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } }
  })

  const userMap = new Map(users.map(u => [u.id, u]))
  return ids.map(id => userMap.get(id) || null)
  // ✅ Correct order guaranteed
})
```

### 3. ❌ Don't Use Loaders for Mutations

```typescript
// BAD - Loader invalidation issues
const createTask = async (input, context) => {
  const task = await context.prisma.task.create({ data: input })

  // ❌ Loader still has old data cached!
  return context.loaders.task.load(task.id)
}
```

```typescript
// GOOD - Direct query for mutations
const createTask = async (input, context) => {
  return context.prisma.task.create({ data: input })
  // ✅ Fresh data
}
```

## Monitoring Performance

### Enable Query Logging

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}

// app/api/graphql/context.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

### Check for N+1 in Logs

Look for repeated similar queries:
```
[Query] SELECT * FROM users WHERE id = 'user_1';  ← N+1 detected!
[Query] SELECT * FROM users WHERE id = 'user_2';
[Query] SELECT * FROM users WHERE id = 'user_3';
...
```

Should see batched queries:
```
[Query] SELECT * FROM users WHERE id IN ('user_1', 'user_2', ...);  ← Good!
```

## Performance Checklist

- [ ] All relationship resolvers use DataLoader
- [ ] Loaders created fresh per request
- [ ] Loader batch functions return correct order
- [ ] Query logging enabled in development
- [ ] No N+1 patterns in logs
- [ ] Response times <500ms for typical queries

## Related Documents

- **ADR-002: GraphQL API Architecture** - Why we use GraphQL
- **ADR-001: PostgreSQL Database** - Database performance tuning
- **ADR-008: React Query** - Client-side caching

## References

- [DataLoader GitHub](https://github.com/graphql/dataloader)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Pattern Type:** Performance Optimization
**Complexity:** Medium
**Impact:** Critical (10x-50x faster queries)
**Last Updated:** 2025-10-10
