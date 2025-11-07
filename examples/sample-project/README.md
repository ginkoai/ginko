# Sample OSS Project: TaskFlow - Team Task Management

This example project demonstrates how to use Ginko's knowledge graph for a realistic open-source project.

## Project Overview

**TaskFlow** is a fictional team task management application built with modern web technologies. This sample includes:

- **10 ADRs** - Architecture decisions (database, API, auth, etc.)
- **5 PRDs** - Product requirements (features, user stories)
- **3 Context Modules** - Patterns, gotchas, best practices
- **Relationships** - How knowledge connects

## Knowledge Structure

```
TaskFlow Knowledge Graph
│
├── ADRs (Architecture Decision Records)
│   ├── ADR-001: Use PostgreSQL for Primary Database
│   ├── ADR-002: GraphQL API Architecture
│   ├── ADR-003: Next.js App Router Structure
│   ├── ADR-004: Supabase for Authentication
│   ├── ADR-005: Tailwind CSS for Styling
│   ├── ADR-006: Vercel Deployment Platform
│   ├── ADR-007: Real-time Updates with WebSockets
│   ├── ADR-008: React Query for State Management
│   ├── ADR-009: Zod for Schema Validation
│   └── ADR-010: Sentry for Error Tracking
│
├── PRDs (Product Requirements)
│   ├── PRD-001: User Authentication System
│   ├── PRD-002: Task Creation and Management
│   ├── PRD-003: Team Collaboration Features
│   ├── PRD-004: Real-time Notifications
│   └── PRD-005: Project Dashboard Analytics
│
└── Context Modules (Patterns & Gotchas)
    ├── MODULE-001: GraphQL N+1 Query Prevention
    ├── MODULE-002: React Query Optimistic Updates
    └── MODULE-003: WebSocket Connection Management

```

## Relationships

**IMPLEMENTS:**
- ADR-002 (GraphQL API) → implements → PRD-002 (Task Management)
- ADR-004 (Supabase Auth) → implements → PRD-001 (User Auth)
- ADR-007 (WebSockets) → implements → PRD-004 (Notifications)

**REFERENCES:**
- ADR-002 (GraphQL API) → references → ADR-001 (PostgreSQL)
- MODULE-001 (N+1 Prevention) → references → ADR-002 (GraphQL)
- PRD-003 (Collaboration) → references → PRD-001 (Auth)

**TAGGED_WITH:**
- All ADRs tagged with "architecture"
- Database-related: tagged with "database"
- Frontend: tagged with "frontend"
- Backend: tagged with "backend"

## Seeding into Ginko

### Prerequisites

```bash
# Install Ginko CLI
npm install -g @ginko/cli

# Authenticate
ginko login

# Create project
ginko project create taskflow \
  --repo github.com/example/taskflow \
  --visibility public \
  --description "Team task management application"
```

### Seed All Knowledge

**Option 1: Automated Script**

```bash
# Run the seed script
cd examples/sample-project
npm install
ts-node seed-example.ts
```

**Option 2: Manual Sync**

```bash
# Sync ADRs
ginko knowledge sync docs/adr/ --type ADR

# Sync PRDs
ginko knowledge sync docs/prd/ --type PRD

# Sync Modules
ginko knowledge sync docs/modules/ --type ContextModule
```

### Verify

```bash
# Search all knowledge
ginko knowledge search "" --limit 100

# Search by type
ginko knowledge search "database" --type ADR

# Visualize relationships
ginko knowledge graph <adr-id>
```

## Knowledge Node Examples

### ADR Example

See [docs/adr/ADR-001-postgresql-database.md](docs/adr/ADR-001-postgresql-database.md)

### PRD Example

See [docs/prd/PRD-001-user-authentication.md](docs/prd/PRD-001-user-authentication.md)

### Context Module Example

See [docs/modules/MODULE-001-graphql-n1-prevention.md](docs/modules/MODULE-001-graphql-n1-prevention.md)

## Learning Objectives

Use this sample project to:

1. **Understand Node Types** - See real examples of ADRs, PRDs, modules
2. **Learn Relationships** - How knowledge connects
3. **Practice Semantic Search** - Try different queries
4. **Visualize Graphs** - Use `ginko knowledge graph`
5. **Test Migration** - Practice syncing local files to cloud

## Extending the Example

Add your own knowledge:

```bash
# Add a new ADR
ginko knowledge create \
  --type ADR \
  --title "Use Redis for Session Storage" \
  --content "We will use Redis for session caching..." \
  --tags database,cache,redis \
  --status active

# Add a new PRD
ginko knowledge create \
  --type PRD \
  --title "Advanced Search Feature" \
  --content "Users can search tasks using filters..." \
  --tags search,feature,ui
```

## Tech Stack

This sample demonstrates decisions for:

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** GraphQL (Apollo/Yoga), PostgreSQL, Supabase
- **Deployment:** Vercel, Supabase Cloud
- **State:** React Query, Zustand
- **Validation:** Zod
- **Monitoring:** Sentry

## Questions to Explore

Try these searches to explore the knowledge graph:

```bash
# How did we choose the database?
ginko knowledge search "database decision" --type ADR

# What authentication method do we use?
ginko knowledge search "authentication" --type PRD

# What patterns exist for GraphQL?
ginko knowledge search "graphql patterns" --type ContextModule

# What features are we building?
ginko knowledge search "features" --type PRD

# How do we handle real-time updates?
ginko knowledge search "real-time" --type ADR
```

## Contributing

This is a sample project. Feel free to fork and modify for your own examples!

## License

MIT License - Free to use and modify
