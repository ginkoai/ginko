---
title: GraphQL API Architecture
status: accepted
tags: [api, graphql, architecture, backend]
created: 2025-09-20
updated: 2025-09-20
author: engineering@example.com
---

# ADR-002: GraphQL API Architecture

## Status

**Accepted** (2025-09-20)

## Context

TaskFlow needs a robust API for:
- Web frontend (Next.js)
- Mobile apps (future)
- Third-party integrations
- Internal tools

We evaluated three API architectures:
1. **REST API** - Traditional HTTP endpoints
2. **GraphQL API** - Query-based graph API
3. **tRPC** - Type-safe RPC for TypeScript monorepos

### Requirements

- **Type Safety** - End-to-end TypeScript types
- **Efficient Queries** - Avoid over-fetching and under-fetching
- **Real-time Support** - Live task updates
- **Developer Experience** - Easy to query and maintain
- **Third-party Access** - Public API for integrations

## Decision

We will use **GraphQL with GraphQL Yoga** as our primary API.

### Key Reasons

1. **Solves Over/Under-fetching**
   - Clients request exactly what they need
   - Single query can fetch nested relationships
   - Reduces bandwidth and improves performance

2. **Excellent Type Safety**
   - GraphQL schema → TypeScript types (codegen)
   - Compile-time validation of queries
   - Auto-generated documentation

3. **Built-in Subscriptions**
   - WebSocket support for real-time updates
   - Task changes broadcast to connected clients
   - No additional infrastructure needed

4. **Self-Documenting**
   - GraphiQL playground for exploration
   - Schema introspection for tools
   - Easy third-party integration

5. **GraphQL Yoga Benefits**
   - Works seamlessly with Next.js App Router
   - Lightweight (no Apollo server overhead)
   - File upload support built-in
   - Excellent error handling

## Alternatives Considered

### REST API
**Pros:**
- Widely understood
- Simple caching with HTTP headers
- Easy to version (`/api/v1`, `/api/v2`)

**Cons:**
- Over-fetching (get entire task object when only need title)
- Under-fetching (need multiple requests for related data)
- No real-time without additional setup (SSE, WebSockets)
- Manual type generation

**Decision:** GraphQL's query flexibility and built-in subscriptions are worth the learning curve.

### tRPC
**Pros:**
- Perfect end-to-end TypeScript types
- RPC-style calls (simple)
- Very fast (no schema overhead)

**Cons:**
- TypeScript-only (no third-party integrations easily)
- No standard tooling (GraphiQL, etc.)
- Less mature ecosystem
- Harder to expose public API

**Decision:** We want to support third-party integrations eventually, so GraphQL's language-agnostic nature wins.

## Consequences

### Positive

- ✅ Efficient queries (no over/under-fetching)
- ✅ Real-time subscriptions built-in
- ✅ Self-documenting schema
- ✅ Excellent developer experience
- ✅ Third-party integration friendly

### Negative

- ⚠️ Slightly steeper learning curve for team
- ⚠️ N+1 query problem (requires DataLoader)
- ⚠️ Caching more complex than REST
- ⚠️ Schema design requires upfront planning

### Mitigations

- Use DataLoader to prevent N+1 queries
- Implement query depth limiting (prevent abuse)
- Add response caching with Redis
- Document GraphQL best practices (see MODULE-001)

## Implementation

### GraphQL Schema

```graphql
type Query {
  # Get current user's tasks
  myTasks(
    status: TaskStatus
    projectId: ID
    limit: Int = 20
    offset: Int = 0
  ): [Task!]!

  # Get task by ID
  task(id: ID!): Task

  # Search tasks
  searchTasks(query: String!, limit: Int = 10): [Task!]!
}

type Mutation {
  # Create task
  createTask(input: CreateTaskInput!): Task!

  # Update task
  updateTask(id: ID!, input: UpdateTaskInput!): Task!

  # Delete task
  deleteTask(id: ID!): Boolean!
}

type Subscription {
  # Subscribe to task updates
  taskUpdated(projectId: ID!): Task!

  # Subscribe to new tasks
  taskCreated(projectId: ID!): Task!
}

type Task {
  id: ID!
  title: String!
  description: String
  status: TaskStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  project: Project!
  assignees: [User!]!
  comments: [Comment!]!
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

input CreateTaskInput {
  title: String!
  description: String
  projectId: ID!
  assigneeIds: [ID!]
}
```

### GraphQL Yoga Setup (Next.js App Router)

```typescript
// app/api/graphql/route.ts
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
})

export { handleRequest as GET, handleRequest as POST }
```

### Resolver Example with DataLoader

```typescript
// app/api/graphql/resolvers.ts
import DataLoader from 'dataloader'

// Prevent N+1 queries
const userLoader = new DataLoader(async (userIds: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } }
  })
  return userIds.map(id => users.find(u => u.id === id))
})

export const resolvers = {
  Query: {
    myTasks: async (_parent, args, context) => {
      const { userId } = context
      return prisma.task.findMany({
        where: {
          createdById: userId,
          status: args.status,
          projectId: args.projectId,
        },
        take: args.limit,
        skip: args.offset,
      })
    },
  },

  Task: {
    // Use DataLoader to batch user fetches
    createdBy: (task, _args, context) => {
      return context.loaders.user.load(task.createdById)
    },
  },

  Mutation: {
    createTask: async (_parent, { input }, context) => {
      return prisma.task.create({
        data: {
          ...input,
          createdById: context.userId,
        },
      })
    },
  },

  Subscription: {
    taskUpdated: {
      subscribe: (_parent, { projectId }, context) => {
        return context.pubsub.subscribe(`task.updated.${projectId}`)
      },
    },
  },
}
```

### Client Usage (React)

```typescript
// Using @apollo/client
import { gql, useQuery, useMutation } from '@apollo/client'

const MY_TASKS_QUERY = gql`
  query MyTasks($projectId: ID!) {
    myTasks(projectId: $projectId, status: IN_PROGRESS) {
      id
      title
      status
      createdBy {
        name
        avatar
      }
    }
  }
`

function TaskList({ projectId }) {
  const { data, loading } = useQuery(MY_TASKS_QUERY, {
    variables: { projectId },
  })

  if (loading) return <Spinner />

  return (
    <ul>
      {data.myTasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      status
    }
  }
`

function CreateTaskForm() {
  const [createTask] = useMutation(CREATE_TASK_MUTATION)

  const handleSubmit = async (e) => {
    await createTask({
      variables: {
        input: {
          title: 'New Task',
          projectId: 'proj_123',
        },
      },
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

## Related Decisions

- **ADR-001: PostgreSQL Database** - GraphQL queries use Prisma → PostgreSQL
- **ADR-007: Real-time with WebSockets** - GraphQL subscriptions use WebSockets
- **ADR-008: React Query** - Client-side state management works with GraphQL
- **MODULE-001: GraphQL N+1 Prevention** - Best practices for DataLoader usage

## References

- [GraphQL Yoga Documentation](https://the-guild.dev/graphql/yoga-server)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [DataLoader Pattern](https://github.com/graphql/dataloader)

## Review History

- **2025-09-20** - Initial decision (accepted)
- **2025-10-15** - Validated with production load (performance excellent)

---

**Decision Made By:** Engineering Team
**Implementation Status:** ✅ Complete
**Next Review:** 2026-03-20 (6 months)
