# SPRINT-2025-10-27: Detailed Task Specifications

**Sprint:** Cloud-First Knowledge Graph Platform
**Duration:** 2025-10-27 to 2025-11-24

This document contains the complete technical specifications for all sprint tasks. For current status and progress, see the main sprint file.

---

## Week 1: Research & Foundation (Oct 27 - Nov 2)

### Goal
Select graph database technology, implement GitHub OAuth, design database schema

### Tasks

#### TASK-018: Graph Database Evaluation
**Priority**: Critical
**Effort**: L (20 hours)

**Objective**: Evaluate and select graph database for MVP

**Options to Prototype**:
1. PostgreSQL + Apache AGE (leverage existing Supabase)
2. Neo4j self-hosted (Hetzner/Digital Ocean)
3. DGraph (GraphQL-native)
4. EdgeDB (modern, TypeScript-friendly)

**Evaluation Criteria**:
- Query performance (<50ms for complex graph traversals)
- Cost (<$100/mo for 100 projects, 10K nodes)
- Multi-tenancy support (data isolation per project)
- Developer experience (TypeScript SDK, error messages)
- Self-hosting capability (Hetzner/DO/Linode)

**Prototype Requirements**:
- Create sample knowledge graph (100 nodes: ADRs, PRDs, modules)
- Implement 3 core queries: search, nodesByTag, nodeGraph
- Benchmark query latency (p50, p95, p99)
- Estimate costs at scale (1K, 10K, 100K nodes)

**Deliverables**:
- [ ] Technical comparison doc (Markdown table)
- [ ] Performance benchmarks (query latency charts)
- [ ] Cost projections (spreadsheet)
- [ ] **Decision**: Selected graph DB documented with rationale
- [ ] Proof-of-concept deployment (staging environment)

**Acceptance Criteria**:
- ✅ All 4 options prototyped with sample data
- ✅ Query performance benchmarked (<50ms p95 requirement validated)
- ✅ Cost estimates documented for 3 scale tiers
- ✅ Decision documented in `docs/decisions/graph-db-selection.md`
- ✅ Selected DB deployed to staging environment

---

#### TASK-019: GitHub OAuth Implementation
**Priority**: Critical
**Effort**: M (12 hours)

**Objective**: Implement GitHub OAuth authentication flow

**Requirements**:
- GitHub OAuth app created (production + staging)
- OAuth scopes: `read:user`, `user:email`, `read:org`
- Token storage and refresh
- User creation on first login
- Logout functionality

**Technical Approach**:
```typescript
// OAuth flow
GET /auth/github          → Redirect to GitHub OAuth
GET /auth/github/callback → Exchange code for token
POST /auth/logout         → Invalidate session

// Token verification middleware
async function verifyGitHubToken(token: string): Promise<User> {
  // Verify with GitHub API
  // Create/update user in database
  // Return user object
}
```

**Database Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  github_email VARCHAR(255),
  github_avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Deliverables**:
- [ ] GitHub OAuth app configured (production + staging)
- [ ] OAuth endpoints implemented (`/auth/github`, `/auth/github/callback`)
- [ ] Token storage and verification
- [ ] User creation on first login
- [ ] CLI: `ginko login` command (opens browser, saves token)
- [ ] CLI: Token stored in `~/.ginko/auth.json`

**Acceptance Criteria**:
- ✅ User can authenticate via `ginko login`
- ✅ Token saved locally and used for API requests
- ✅ Token refresh works (handles expiration)
- ✅ Logout invalidates token
- ✅ Error handling for OAuth failures

---

#### TASK-020: Multi-Tenancy Database Schema
**Priority**: High
**Effort**: M (10 hours)

**Objective**: Design and implement database schema for teams, projects, authorization

**Schema Design**:
```sql
-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team membership
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',  -- 'owner' | 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Projects (knowledge scopes)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  github_repo_url VARCHAR(500),
  github_repo_id INTEGER,
  visibility VARCHAR(20) DEFAULT 'private',  -- 'public' | 'private'
  discoverable BOOLEAN DEFAULT FALSE,  -- Opt-in for public catalog
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project access (owners + members)
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',  -- 'owner' | 'member'
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  PRIMARY KEY (project_id, user_id),
  -- Constraint: At least one owner per project (enforced in app logic)
);

-- Project team access
CREATE TABLE project_teams (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  PRIMARY KEY (project_id, team_id)
);

-- Indexes for performance
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_github_repo ON projects(github_repo_url);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

**Authorization Helper Functions**:
```typescript
async function canReadProject(userId: UUID, projectId: UUID): Promise<boolean> {
  // Public projects: anyone can read
  // Private projects: must be member or team member
}

async function canWriteProject(userId: UUID, projectId: UUID): Promise<boolean> {
  // Must be project member (owner or member role)
}

async function canManageProject(userId: UUID, projectId: UUID): Promise<boolean> {
  // Must be project owner
}
```

**Deliverables**:
- [ ] SQL migration scripts (up/down)
- [ ] Database schema deployed to staging
- [ ] Authorization helper functions implemented
- [ ] Unit tests for authorization logic

**Acceptance Criteria**:
- ✅ Schema supports individuals, teams, projects
- ✅ Authorization rules enforced at database level (RLS)
- ✅ Can create project, add members, assign owners
- ✅ At-least-one-owner constraint working
- ✅ Public/private visibility working
- ✅ All tables have proper indexes

---

#### TASK-018.5: Graph Retrieval Architecture & Planning
**Priority**: Critical
**Effort**: M (8 hours)
**Status**: ✅ COMPLETE

**Objective**: Design comprehensive migration plan from file-based to cloud graph retrieval

**Deliverables**:
- [x] Graph retrieval migration plan (docs/planning/graph-retrieval-migration.md)
- [x] Cloud-first architecture design (docs/planning/cloud-graph-architecture.md)
- [x] Vector embeddings pipeline design
- [x] Hetzner deployment plan
- [x] 14-day aggressive implementation roadmap

**Outcomes**:
- ✅ Validated <100ms query performance (10-20x faster than file-based)
- ✅ Designed CloudGraphClient with API key authentication
- ✅ Planned vector embeddings using OpenAI (text-embedding-3-large)
- ✅ Estimated costs: $7/month hosting, $0.013 initial embeddings
- ✅ Created Jest test suite (46 tests passing)

**Related**: ADR-039, PRD-010, TASK-018

---

### Week 1 Deliverables
- ✅ Graph database selected and deployed (staging) - **Neo4j 5.15**
- ✅ Graph retrieval architecture designed - **COMPLETE**
- ✅ Neo4j schema with vector embeddings - **COMPLETE (7 node types, 39 indexes)**
- ✅ Jest test suite - **COMPLETE (46 tests)**
- [ ] GitHub OAuth working end-to-end
- [ ] Multi-tenancy schema implemented
- [ ] User can authenticate via CLI (`ginko login`)

---

## Week 2: Vector Embeddings + Core CRUD (Nov 3 - Nov 9)

### Goal
Implement vector embeddings, CloudGraphClient, knowledge node CRUD, project management

### Tasks

#### TASK-020.5: Vector Embeddings Pipeline
**Priority**: Critical
**Effort**: L (12 hours)
**Status**: PLANNED

**Objective**: Implement server-side vector embeddings for semantic search

**Technical Approach**:
- OpenAI API: `text-embedding-3-large` (3072 dimensions)
- Batch processing: 60 ADRs + 29 PRDs = ~103.5k tokens
- Cost: $0.013 for initial batch
- Storage: Neo4j vector index
- Similarity search: <15ms (estimated)

**Implementation**:
```typescript
// Generate embeddings
async function embedDocument(docId: string, content: string): Promise<void> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: content,
    dimensions: 3072
  });

  const embedding = response.data[0].embedding;

  await neo4j.query(`
    MATCH (doc {id: $docId})
    SET doc.embedding = $embedding
  `, { docId, embedding });
}
```

**Deliverables**:
- [ ] OpenAI integration service
- [ ] Batch embedding generation script
- [ ] Vector index in Neo4j
- [ ] Similarity search query (`findSimilar()`)
- [ ] CLI command: `ginko context similar <doc-id>`

**Acceptance Criteria**:
- ✅ All 89 documents embedded
- ✅ Similarity search returns relevant results
- ✅ Query performance <50ms
- ✅ Cost tracked and documented

---

#### TASK-020.6: CloudGraphClient Implementation ✅
**Priority**: Critical
**Effort**: M (10 hours)
**Status**: COMPLETE (2025-11-06)

**Objective**: Create cloud-enabled Neo4j client with API key authentication

**Features**:
- Extends existing Neo4jClient
- Bearer token authentication
- Multi-tenant project scoping
- Connection pooling (lower limits for cloud)
- Graceful error handling

**Implementation**:
Fully implemented in three locations:
- `src/graph/cloud-graph-client.ts` (566 lines, production)
- `api/v1/graph/_cloud-graph-client.ts` (988 lines, API)
- `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts` (988 lines, dashboard)

**Deliverables**:
- [x] CloudGraphClient class (production-ready)
- [x] API key configuration (bearer token auth)
- [x] Connection tests (e2e tests passing)
- [x] Migration from local to cloud client (integrated with ADR-043)

**Acceptance Criteria**:
- ✅ Connects to cloud Neo4j with bearer token
- ✅ All queries scoped to organizationId/projectId (auto-injected)
- ✅ Compatible with existing ContextLoader interface
- ✅ Tests passing (local + cloud)
- ✅ Event stream integration complete
- ✅ Vector search capability included

**Commit**: `9024159` - feat: Implement CloudGraphClient and GitHub Actions lifecycle automation

---

#### TASK-021: Knowledge Node CRUD Operations
**Priority**: Critical
**Effort**: L (16 hours)

**Objective**: Store and retrieve knowledge nodes in graph database

**Node Types** (per ADR-039):
- `ADR` - Architecture Decision Records
- `PRD` - Product Requirements Documents
- `ContextModule` - Patterns, gotchas, insights
- `Session` - Development session logs
- `CodeFile` - Source file metadata (frontmatter)

**Operations**:
```typescript
// Create node
async function createNode(projectId: UUID, node: KnowledgeNode): Promise<Node> {
  // Validate user has write access to project
  // Insert node into graph database
  // Create relationships (tags, references, implements)
  // Return created node with ID
}

// Read node
async function getNode(nodeId: UUID, userId: UUID): Promise<Node | null> {
  // Check user has read access to node's project
  // Fetch node from graph
  // Return node or null
}

// Update node
async function updateNode(nodeId: UUID, updates: Partial<Node>): Promise<Node> {
  // Validate user has write access
  // Update node in graph
  // Update relationships if changed
  // Return updated node
}

// Delete node
async function deleteNode(nodeId: UUID): Promise<boolean> {
  // Validate user is project owner
  // Delete node and orphaned relationships
  // Return success
}

// List nodes by project
async function listNodes(projectId: UUID, filters?: Filters): Promise<Node[]> {
  // Check read access
  // Query graph with filters (type, tags, status)
  // Return paginated results
}
```

**Graph Schema** (example for Neo4j):
```cypher
// ADR node
CREATE (adr:ADR {
  id: $id,
  projectId: $projectId,
  number: $number,
  title: $title,
  status: $status,
  content: $content,
  created: $created,
  updated: $updated
})

// Relationships
CREATE (adr)-[:IMPLEMENTS]->(prd:PRD)
CREATE (adr)-[:REFERENCES]->(other:ADR)
CREATE (adr)-[:TAGGED_WITH]->(tag:Tag)
```

**Deliverables**:
- [ ] CRUD functions implemented for all node types
- [ ] Graph schema defined (Cypher/AGE/DGraph QL)
- [ ] Authorization enforced on all operations
- [ ] Unit tests for CRUD operations
- [ ] Integration tests with staging database

**Acceptance Criteria**:
- ✅ Can create ADR, PRD, Module nodes
- ✅ Nodes have proper relationships (implements, references, tags)
- ✅ Authorization prevents unauthorized access
- ✅ Updates preserve existing relationships
- ✅ Delete cascades properly (orphaned relationships cleaned)

---

#### TASK-022: Project Management API
**Priority**: High
**Effort**: M (12 hours)

**Objective**: API endpoints for creating/managing projects, teams, members

**Endpoints**:
```typescript
// Projects
POST   /api/projects              → Create project
GET    /api/projects              → List user's projects
GET    /api/projects/:id          → Get project details
PATCH  /api/projects/:id          → Update project (owners only)
DELETE /api/projects/:id          → Delete project (owners only)

// Project members
POST   /api/projects/:id/members  → Add member (owners only)
DELETE /api/projects/:id/members/:userId → Remove member (owners only)
PATCH  /api/projects/:id/members/:userId → Change role (owners only)

// Teams
POST   /api/teams                 → Create team
GET    /api/teams                 → List user's teams
POST   /api/teams/:id/members     → Add team member
DELETE /api/teams/:id/members/:userId → Remove team member

// Project team linking
POST   /api/projects/:id/teams    → Grant team access to project
DELETE /api/projects/:id/teams/:teamId → Revoke team access
```

**Project Creation Flow**:
```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  githubRepoUrl?: string;
  visibility: 'public' | 'private';
  discoverable?: boolean;  // Opt-in for public catalog
}

// Example
POST /api/projects
{
  "name": "my-saas-app",
  "githubRepoUrl": "https://github.com/user/my-saas-app",
  "visibility": "private"
}

// Response
{
  "id": "uuid-xxxx",
  "name": "my-saas-app",
  "visibility": "private",
  "role": "owner",
  "created_at": "2025-10-27T10:00:00Z"
}
```

**GitHub Repo Sync**:
- Fetch repo visibility from GitHub API (public/private)
- Enforce: Private GitHub repo → Must be private Ginko project
- Cache repo metadata (refresh every 24 hours)
- Webhook support (future): Real-time visibility sync

**Deliverables**:
- [ ] All project management endpoints implemented
- [ ] Team management endpoints implemented
- [ ] GitHub repo visibility sync working
- [ ] At-least-one-owner constraint enforced
- [ ] API documentation (OpenAPI spec)

**Acceptance Criteria**:
- ✅ User can create project, add members, assign owners
- ✅ Cannot remove last owner from project
- ✅ GitHub repo visibility synced correctly
- ✅ Team access grants all team members project access
- ✅ Error handling for invalid operations

---

#### TASK-023: CLI Project Commands
**Priority**: Medium
**Effort**: S (8 hours)

**Objective**: CLI commands for project and team management

**Commands**:
```bash
# Project management
ginko project create <name> [--repo=<url>] [--public]
ginko project list
ginko project info <name>
ginko project delete <name>

# Member management
ginko project add-member <project> <github-username> [--role=owner]
ginko project remove-member <project> <github-username>
ginko project list-members <project>

# Team management
ginko team create <name>
ginko team add-member <team> <github-username>
ginko team add-to-project <team> <project>
```

**Example Usage**:
```bash
# Create project from current git repo
ginko project create my-app --repo=github.com/user/my-app

# Add team member
ginko project add-member my-app alice --role=owner

# Create team and grant access
ginko team create backend-team
ginko team add-member backend-team bob
ginko team add-to-project backend-team my-app
```

**Deliverables**:
- [ ] All CLI commands implemented
- [ ] Help text and examples
- [ ] Error messages (clear, actionable)
- [ ] Integration tests

**Acceptance Criteria**:
- ✅ Commands work end-to-end
- ✅ Output formatted clearly (tables for lists)
- ✅ Errors handled gracefully
- ✅ Help text comprehensive

---

#### TASK-023.5: Session Event Stream Implementation
**Priority**: Critical
**Effort**: M (10 hours)
**Status**: PLANNED (ADR-043)

**Objective**: Implement event stream session model per ADR-043 - sessions as read cursors into unbounded event streams

**Core Concept**: Sessions are technical artifacts (context window limits), not logical work boundaries. Events logged continuously to append-only stream; sessions become movable pointers (cursors) into the stream.

**Architecture**:
```cypher
// Event stream (unbounded, append-only)
(user:User)-[:LOGGED]->(e1:Event)-[:NEXT]->(e2:Event)-[:NEXT]->(e3:Event)...

// Session cursor (pointer into stream)
(cursor:SessionCursor {
  id: 'cursor_feature_auth',
  current_event_id: 'event_500',
  last_active: datetime(),
  status: 'active'
})-[:POSITIONED_AT]->(event:Event)
```

**Event Schema**:
```typescript
interface Event {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: Date;
  category: 'fix'|'feature'|'decision'|'insight'|'git'|'achievement';
  description: string;
  files: string[];
  impact: 'high'|'medium'|'low';
  pressure: number;
  branch: string;
  shared: boolean;        // Team visibility
  commit_hash?: string;   // Git integration
}
```

**Implementation Tasks**:

1. **Event Logging (Dual-Write)**
   - Write to local file immediately (no data loss)
   - Queue for Neo4j sync (every 5 min / 5 events)
   - Flush on session end (housekeeping, not critical)

2. **Session Cursors**
   - Create cursor on `ginko start`
   - Update cursor on `ginko handoff` (no synthesis!)
   - Multiple cursors per user (branch-based)

3. **Context Loading**
   - Read backwards N events from cursor
   - Solo mode: Last 50 my events (~5K tokens)
   - Team mode: + 20 team high-signal events (~8K tokens)

4. **Query Patterns**
   - My events only
   - Team high-signal (decisions, achievements, git)
   - Branch activity
   - Document collision detection
   - Team activity feed

5. **Git Integration**
   - Post-commit hook: auto-log to ginko
   - Bidirectional navigation (commit ↔ events)
   - `ginko log --commit=<hash>` shows context

**Deliverables**:
- [x] Event node schema in Neo4j
- [x] SessionCursor schema in Neo4j
- [x] `logEvent()` with dual-write (local + queue)
- [x] Background sync process (5min/5events)
- [x] `ginko start` creates/resumes cursor
- [x] `ginko handoff` updates cursor (no synthesis)
- [x] Context loading from events (solo + team)
- [ ] Git hooks for auto-logging (deferred to Week 3)

**Acceptance Criteria**:
- ✅ Session created in graph on `ginko start`
- ✅ Events synced to graph every 5 minutes
- ✅ Local file written immediately (no network delay)
- ✅ Works offline (syncs when back online)
- ✅ Context loading from events (<31K tokens vs 88K, 64% reduction)
- ✅ Team events queryable (5 query patterns)
- ✅ Session "handoff" just updates cursor (no synthesis!)
- ✅ Multi-cursor support (branch-based)

**Key Benefits** (from ADR-043):
- Eliminates context pressure at session boundaries
- Preserves flow state (<30 sec transitions vs 5-10 min)
- Enables flexible context queries
- Supports multi-context work (multiple cursors)
- Unlocks event-driven architecture
- Natural team collaboration via query patterns

**References**: [ADR-043: Event Stream Session Model](../adr/ADR-043-event-stream-session-model.md)

---

### Week 2 Deliverables
- [x] WriteDispatcher implementation (ADR-041) - **COMPLETE**
- [x] GraphAdapter for Neo4j cloud writes - **COMPLETE**
- [x] LocalAdapter for dual-write safety - **COMPLETE**
- [x] CLI log command integration - **COMPLETE**
- [x] Vercel API deployment to production - **COMPLETE (2025-11-02)**
- [x] End-to-end graph write testing - **COMPLETE (init, create, query verified, 72/72 tests passing)**
- [x] Vector embeddings pipeline functional - **COMPLETE (API, batch script, semantic search operational)**
- [x] CloudGraphClient implemented - **COMPLETE (CRUD + semantic search working, BigInt fixes applied)**
- [x] Hetzner E2E migration - **COMPLETE (83 docs, 1,892 relationships, semantic search validated)**
- [ ] Context loader migrated to use cloud graph - **DEFERRED TO WEEK 3**
- [ ] Project and team management APIs live - **DEFERRED TO WEEK 3**
- [ ] CLI commands for projects/teams functional - **DEFERRED TO WEEK 3**
- [ ] Authorization enforced across all operations - **PARTIAL (Bearer token auth working, GitHub OAuth pending)**

**Week 2 Progress: 9/13 deliverables complete (69%)**

**Key Achievements**:
- ✅ Complete E2E testing infrastructure on Hetzner
- ✅ Knowledge graph fully operational with semantic search
- ✅ Production-ready embeddings pipeline (768d vectors)
- ✅ 1,892 relationships connecting 83 knowledge documents

---

## Related Documents

- [Main Sprint File](./SPRINT-2025-10-27-cloud-knowledge-graph.md) - Current status and progress
- [ADR-043: Event Stream Session Model](../adr/ADR-043-event-stream-session-model.md) - Event-based context loading architecture
- [ADR-039: Graph-Based Knowledge Repository](../adr/ADR-039-graph-based-knowledge-repository.md) - Knowledge graph design
- [ADR-041: Graph Migration Write Dispatch](../adr/ADR-041-graph-migration-write-dispatch.md) - Dual-write strategy
- [ADR-044: Neo4j AuraDB Migration](../adr/ADR-044-neo4j-auradb-migration.md) - Cloud migration strategy
