---
title: Use PostgreSQL for Primary Database
status: accepted
tags: [database, architecture, postgres]
created: 2025-09-15
updated: 2025-09-15
author: engineering@example.com
---

# ADR-001: Use PostgreSQL for Primary Database

## Status

**Accepted** (2025-09-15)

## Context

TaskFlow requires a relational database to store:
- User accounts and authentication data
- Tasks, projects, and teams
- Activity logs and audit trails
- Relationships between entities (many-to-many)

We evaluated three primary options:
1. **PostgreSQL** - Open-source relational database
2. **MySQL** - Popular open-source database
3. **MongoDB** - NoSQL document database

### Requirements

- **ACID Guarantees** - Financial data and task state must be consistent
- **JSON Support** - Store flexible metadata without schema changes
- **Scalability** - Handle 100k+ users and millions of tasks
- **Cost** - Affordable hosting on Supabase or similar
- **Developer Experience** - Good TypeScript/ORM integration

## Decision

We will use **PostgreSQL 15+** as our primary database.

### Key Reasons

1. **Strong ACID Guarantees**
   - Full transactional support for critical operations
   - Prevents data corruption during concurrent updates
   - Essential for task state transitions

2. **Excellent JSON Support**
   - Native `jsonb` type with indexing
   - Allows flexible task metadata without migrations
   - Query JSON fields with SQL (e.g., tags, custom fields)

3. **Proven Scalability**
   - GitHub, Instagram, Notion all use PostgreSQL
   - Handles billions of rows with proper indexing
   - Read replicas for horizontal scaling

4. **Rich Ecosystem**
   - Mature ORMs (Prisma, Drizzle, TypeORM)
   - Full-text search with `pg_trgm`
   - Extensions for specialized features (PostGIS, pgvector)

5. **Supabase Integration**
   - Managed PostgreSQL with backups
   - Auto-generated REST/GraphQL APIs
   - Built-in auth and real-time subscriptions
   - Free tier for early development

## Alternatives Considered

### MySQL
**Pros:**
- Slightly faster for simple queries
- More widespread hosting options

**Cons:**
- Weaker JSON support (no `jsonb` equivalent)
- Less strict ACID compliance by default
- Fewer advanced features (e.g., window functions)

**Decision:** PostgreSQL's JSON support and stricter guarantees outweigh MySQL's minor performance edge.

### MongoDB
**Pros:**
- Flexible schema (no migrations)
- Horizontal scaling built-in

**Cons:**
- No ACID transactions across documents (critical for us)
- Difficult to model complex relationships
- Higher memory usage
- Less mature TypeScript ORMs

**Decision:** Relational model better fits our task/project/team structure. PostgreSQL's `jsonb` provides flexibility where needed.

## Consequences

### Positive

- ✅ Strong data consistency for task state
- ✅ Flexible metadata storage with `jsonb`
- ✅ Easy to add full-text search
- ✅ Excellent Supabase integration
- ✅ Future-proof for scaling (read replicas, partitioning)

### Negative

- ⚠️ Requires schema migrations (Prisma makes this manageable)
- ⚠️ Vertical scaling more expensive than horizontal
- ⚠️ Learning curve for complex queries (JOINs, window functions)

### Mitigations

- Use Prisma for type-safe migrations
- Design schema carefully upfront to minimize breaking changes
- Use `jsonb` for experimental/flexible fields
- Implement caching (Redis) to reduce database load

## Implementation

### Schema Example

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id)
);

-- Index for fast filtering
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project_id);

-- Index for JSON queries
CREATE INDEX idx_tasks_metadata ON tasks USING GIN(metadata);
```

### ORM Configuration (Prisma)

```prisma
model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      TaskStatus
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String

  @@index([status])
  @@index([projectId])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}
```

## Related Decisions

- **ADR-002: GraphQL API Architecture** - Uses PostgreSQL via Prisma
- **ADR-004: Supabase for Authentication** - Leverages Supabase's PostgreSQL
- **PRD-002: Task Creation and Management** - Implemented with PostgreSQL schema

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

## Review History

- **2025-09-15** - Initial decision (accepted)
- **2025-10-01** - Validated with 10k test records (performance excellent)

---

**Decision Made By:** Engineering Team
**Implementation Status:** ✅ Complete
**Next Review:** 2026-03-15 (6 months)
