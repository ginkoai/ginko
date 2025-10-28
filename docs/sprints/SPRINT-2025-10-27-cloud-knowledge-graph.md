# SPRINT-2025-10-27: Cloud-First Knowledge Graph Platform

## Sprint Overview

**Sprint Goal**: Launch MVP of cloud-first knowledge graph platform with GitHub OAuth, graph database, GraphQL API, and CLI integration

**Duration**: 4 weeks (2025-10-27 to 2025-11-24)

**Type**: Foundation sprint (infrastructure + core features)

**PRD**: [PRD-010: Cloud-First Knowledge Graph Platform](../PRD/PRD-010-cloud-knowledge-graph.md)

**Related**: [ADR-039: Knowledge Discovery Graph](../adr/ADR-039-graph-based-context-discovery.md)

## Strategic Context

This sprint represents a **major architectural pivot** from file-based local knowledge to cloud-first SaaS platform. Key strategic decisions:

1. **Cloud-First**: Knowledge stored in cloud graph database (not local files)
2. **Multi-Tenant**: Teams, projects, GitHub-linked permissions from day 1
3. **Freemium Business Model**: Free for public OSS repos, paid for private projects
4. **Public Discovery**: Searchable catalog of OSS knowledge graphs
5. **CLI Preservation**: Existing `ginko` commands work against cloud API

**Success Criteria:**
- Graph database selected and deployed
- GitHub OAuth working end-to-end
- GraphQL API functional with 5+ core queries
- CLI commands (`ginko knowledge`) integrated
- At least 1 working OSS project example

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

#### TASK-020.6: CloudGraphClient Implementation
**Priority**: Critical
**Effort**: M (10 hours)
**Status**: PLANNED

**Objective**: Create cloud-enabled Neo4j client with API key authentication

**Features**:
- Extends existing Neo4jClient
- Bearer token authentication
- Multi-tenant project scoping
- Connection pooling (lower limits for cloud)
- Graceful error handling

**Implementation**:
```typescript
export class CloudGraphClient extends Neo4jClient {
  private apiKey: string;
  private projectId: string;

  async connect(): Promise<void> {
    this.driver = neo4j.driver(
      'bolt://graph.ginko.ai:7687',
      neo4j.auth.bearer(this.apiKey),
      {
        encrypted: 'ENCRYPTION_ON',
        maxConnectionPoolSize: 10
      }
    );
  }

  async query(cypher: string, params: any): Promise<Result> {
    // Auto-inject project_id for multi-tenancy
    return super.query(cypher, { ...params, projectId: this.projectId });
  }
}
```

**Deliverables**:
- [ ] CloudGraphClient class
- [ ] API key configuration (.ginko/config.yml)
- [ ] Connection tests
- [ ] Migration from local to cloud client

**Acceptance Criteria**:
- ✅ Connects to cloud Neo4j with API key
- ✅ All queries scoped to project_id
- ✅ Compatible with existing ContextLoader interface
- ✅ Tests passing (local + cloud)

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

### Week 2 Deliverables
- [ ] Vector embeddings pipeline functional
- [ ] CloudGraphClient implemented
- [ ] Context loader migrated to use cloud graph
- [ ] Knowledge node CRUD working
- [ ] Project and team management APIs live
- [ ] CLI commands for projects/teams functional
- [ ] Authorization enforced across all operations

---

## Week 3: GraphQL API + CLI Integration (Nov 10 - Nov 16)

### Goal
Implement GraphQL query interface, integrate CLI knowledge commands with cloud

### Tasks

#### TASK-024: GraphQL API Implementation
**Priority**: Critical
**Effort**: L (20 hours)

**Objective**: Implement GraphQL API per ADR-039 schema

**Core Resolvers**:
```graphql
type Query {
  # Universal search
  search(
    query: String!,
    types: [NodeType!],
    tags: [String!],
    projectId: UUID
  ): [KnowledgeNode!]!

  # Tag-based discovery
  nodesByTag(
    tag: String!,
    types: [NodeType!],
    projectId: UUID
  ): [KnowledgeNode!]!

  # Single node
  node(id: ID!): KnowledgeNode

  # Context-aware
  relevantToContext(
    files: [String!],
    branch: String,
    tags: [String!],
    projectId: UUID!,
    limit: Int = 10
  ): [KnowledgeNode!]!

  # Relationships
  nodeGraph(nodeId: ID!, depth: Int = 2): GraphResult!
  references(nodeId: ID!): [KnowledgeNode!]!
  referencedBy(nodeId: ID!): [KnowledgeNode!]!

  # Implementation tracking
  adrImplementation(adrNumber: Int!, projectId: UUID!): ADRImplementationStatus!
  prdProgress(prdId: String!, projectId: UUID!): PRDProgress!
}
```

**Resolver Implementation**:
```typescript
// search resolver
async function search(
  parent,
  { query, types, tags, projectId },
  context
): Promise<KnowledgeNode[]> {
  // Verify user has access to project
  await authorizeProject(context.userId, projectId, 'read');

  // Build graph query
  const graphQuery = buildSearchQuery({ query, types, tags, projectId });

  // Execute against graph DB
  const results = await graphDB.query(graphQuery);

  // Return formatted results
  return results.map(formatKnowledgeNode);
}
```

**Authentication**:
```typescript
// Apollo Server context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyGitHubToken(token);
    return { userId: user.id, user };
  }
});
```

**Deliverables**:
- [ ] GraphQL schema implemented (full ADR-039 schema)
- [ ] Core resolvers implemented (search, nodesByTag, node, relevantToContext)
- [ ] Relationship resolvers (nodeGraph, references, referencedBy)
- [ ] Authorization middleware (every resolver checks access)
- [ ] GraphQL playground deployed (staging)

**Acceptance Criteria**:
- ✅ All ADR-039 queries working
- ✅ Authorization enforced (no unauthorized access)
- ✅ Query performance <50ms (simple), <200ms (complex)
- ✅ Error handling (clear error messages)
- ✅ Pagination working (limit/offset)

---

#### TASK-025: CLI Knowledge Commands
**Priority**: Critical
**Effort**: M (14 hours)

**Objective**: Implement `ginko knowledge` commands that query cloud API

**Commands**:
```bash
# Search
ginko knowledge search "authentication" [--project=<name>]
ginko knowledge search "API patterns" --types=ADR,Module

# Tags
ginko knowledge by-tag security [--types=Pattern,ADR]
ginko knowledge tags  # List all tags in project

# Single node
ginko knowledge get ADR-038 [--project=<name>]

# Context-aware
ginko knowledge relevant  # Auto-detect from current git repo
ginko knowledge relevant --files="src/auth.ts,src/api.ts"

# Relationships
ginko knowledge graph ADR-038  # Show relationship graph
ginko knowledge implements PRD-006  # What implements this PRD?
ginko knowledge references ADR-033  # What references this ADR?

# Create/update
ginko knowledge create adr "Use JWT tokens"
ginko knowledge create module pattern "OAuth refresh flow"
ginko knowledge update ADR-038 --status=accepted

# List
ginko knowledge list [--type=ADR] [--status=proposed]
```

**Implementation**:
```typescript
// CLI calls GraphQL API
async function knowledgeSearch(query: string, options: SearchOptions) {
  const token = await loadToken();  // From ~/.ginko/auth.json

  const graphqlQuery = `
    query Search($query: String!, $types: [NodeType!]) {
      search(query: $query, types: $types) {
        id
        type
        title
        tags
        status
      }
    }
  `;

  const response = await fetch('https://api.ginko.ai/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { query, types: options.types }
    })
  });

  const { data } = await response.json();

  // Format for terminal display
  console.table(data.search.map(node => ({
    Type: node.type,
    Title: node.title,
    Status: node.status,
    Tags: node.tags.join(', ')
  })));
}
```

**Deliverables**:
- [ ] All `ginko knowledge` commands implemented
- [ ] GraphQL client integration
- [ ] Token-based authentication
- [ ] Pretty terminal output (tables, colors)
- [ ] Error handling (offline mode, auth failures)

**Acceptance Criteria**:
- ✅ All commands work end-to-end against cloud API
- ✅ Output formatted clearly (readable in terminal)
- ✅ Authentication works (uses token from `ginko login`)
- ✅ Error messages helpful ("Run 'ginko login' first")
- ✅ Offline detection ("Cannot reach Ginko cloud")

---

#### TASK-026: CLI Local-to-Cloud Sync
**Priority**: Medium
**Effort**: M (10 hours)

**Objective**: Migrate existing local knowledge to cloud

**Migration Command**:
```bash
ginko migrate --project=<name> [--from=<path>]
```

**Migration Flow**:
1. Scan local directories for knowledge files:
   - `docs/adr/*.md` → ADR nodes
   - `docs/PRD/*.md` → PRD nodes
   - `.ginko/context/modules/*.md` → ContextModule nodes
2. Parse frontmatter and content
3. Create nodes in cloud via GraphQL mutations
4. Create relationships (references, implements, tags)
5. Report success (X files migrated, Y nodes created)

**Example**:
```bash
cd ~/projects/my-app
ginko migrate --project=my-app

Scanning for knowledge files...
Found:
  - 12 ADRs in docs/adr/
  - 5 PRDs in docs/PRD/
  - 23 modules in .ginko/context/modules/

Migrating to cloud project 'my-app'...
✓ Created 12 ADR nodes
✓ Created 5 PRD nodes
✓ Created 23 ContextModule nodes
✓ Created 47 relationships

Migration complete! Your knowledge is now queryable in the cloud.
Try: ginko knowledge search "authentication"
```

**Deliverables**:
- [ ] File scanner (detect ADRs, PRDs, modules)
- [ ] Frontmatter parser
- [ ] Batch node creation (GraphQL mutations)
- [ ] Relationship detection (from content references)
- [ ] Progress reporting

**Acceptance Criteria**:
- ✅ Can migrate existing local knowledge to cloud
- ✅ Frontmatter and content preserved
- ✅ Relationships created correctly
- ✅ Migration is idempotent (can run multiple times)
- ✅ Reports clear summary

---

### Week 3 Deliverables
- ✅ GraphQL API fully functional
- ✅ CLI knowledge commands working against cloud
- ✅ Migration tool for local → cloud
- ✅ End-to-end knowledge query workflow validated

---

## Week 4: Public Discovery + Polish (Nov 17 - Nov 24)

### Goal
Launch public OSS catalog, production deployment, documentation

### Tasks

#### TASK-027: Public Discovery Catalog
**Priority**: High
**Effort**: M (12 hours)

**Objective**: Searchable catalog of public OSS knowledge graphs

**Features**:
1. **Public Index Page**: List of public projects
2. **Project Profile Pages**: Individual project knowledge graph
3. **Search Across Projects**: Query all public knowledge
4. **Tag Cloud**: Discover projects by technology/pattern
5. **Trending**: Most-viewed knowledge this week

**API Endpoints**:
```typescript
// Public APIs (no auth required)
GET /api/public/projects              → List public projects
GET /api/public/projects/:id          → Get public project
GET /api/public/search?q=<query>      → Search across public knowledge
GET /api/public/tags                  → Get popular tags
GET /api/public/trending               → Trending knowledge
```

**GraphQL Public Queries**:
```graphql
type Query {
  publicProjects(limit: Int = 20, offset: Int = 0): [PublicProject!]!
  publicSearch(query: String!, types: [NodeType!]): [KnowledgeNode!]!
  publicTags(limit: Int = 50): [TagWithCount!]!
  publicTrending(days: Int = 7, limit: Int = 10): [KnowledgeNode!]!
}
```

**Example Catalog Page**:
```markdown
# Ginko Public Knowledge Graphs

## Featured Projects

1. **awesome-react** (234 ADRs, 45 patterns)
   Tags: react, hooks, performance, testing

2. **serverless-api** (89 ADRs, 12 PRDs)
   Tags: serverless, aws, architecture, api-design

3. **crypto-wallet** (156 ADRs, 78 patterns)
   Tags: cryptography, security, blockchain, wallet

## Popular Tags

#react (12 projects) #serverless (8 projects) #graphql (7 projects)

## Trending This Week

1. ADR-042: "Choosing Database for Multi-Tenant SaaS" (awesome-saas)
2. Pattern: "Serverless Cold Start Optimization" (serverless-api)
3. ADR-089: "Zero-Knowledge Encryption Architecture" (crypto-wallet)
```

**Deliverables**:
- [ ] Public discovery API endpoints
- [ ] GraphQL public queries
- [ ] Basic web UI (simple HTML/CSS, no complex framework)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Analytics (page views, popular searches)

**Acceptance Criteria**:
- ✅ Public projects discoverable (no auth required)
- ✅ Search works across all public knowledge
- ✅ Tag cloud shows popular topics
- ✅ SEO-friendly (proper meta tags, fast load)
- ✅ Analytics tracking implemented

---

#### TASK-028: Production Deployment
**Priority**: Critical
**Effort**: L (16 hours)

**Objective**: Deploy to production with monitoring, backups, SLA readiness

**Infrastructure**:
```yaml
Production Stack:
  - API: Vercel Serverless Functions (or Hetzner VPS)
  - Graph DB: Selected option from TASK-018 (staging → production)
  - Auth DB: Supabase PostgreSQL
  - DNS: api.ginko.ai, app.ginko.ai
  - Monitoring: Sentry (errors), Vercel Analytics (usage)
  - Backups: Daily automated backups
```

**Deployment Checklist**:
- [ ] Production environment variables configured
- [ ] SSL certificates (HTTPS)
- [ ] Database backups automated (daily, retained 30 days)
- [ ] Error tracking (Sentry)
- [ ] Usage analytics (Vercel, PostHog)
- [ ] Rate limiting (prevent abuse)
- [ ] API quotas (free tier: 1K req/day, paid: 10K req/day)
- [ ] Health check endpoint (`/health`)
- [ ] Status page (status.ginko.ai)

**Monitoring Setup**:
```typescript
// Health check
GET /health
{
  "status": "healthy",
  "database": "connected",
  "graphDB": "connected",
  "uptime": 99.95,
  "version": "1.0.0"
}

// Metrics tracked
- API request latency (p50, p95, p99)
- Graph query performance
- Error rate (5xx responses)
- Authentication success rate
- Active users (daily, weekly, monthly)
```

**Deliverables**:
- [ ] Production deployment live (api.ginko.ai)
- [ ] Monitoring dashboards configured
- [ ] Automated backups working
- [ ] Error tracking active
- [ ] Status page deployed

**Acceptance Criteria**:
- ✅ API accessible at https://api.ginko.ai/graphql
- ✅ Health check returns 200 OK
- ✅ Errors tracked in Sentry
- ✅ Backups running daily
- ✅ Rate limiting enforced

---

#### TASK-029: Documentation & Examples
**Priority**: High
**Effort**: M (10 hours)

**Objective**: Comprehensive documentation for developers

**Documentation**:
1. **Getting Started**: Quick setup guide
2. **CLI Reference**: All commands with examples
3. **GraphQL API Docs**: Schema, queries, examples
4. **Multi-Tenancy Guide**: Teams, projects, permissions
5. **Migration Guide**: Local files → cloud
6. **Pricing & Limits**: Free vs paid tiers

**Example Project**:
- Create "ginko-example" public project
- Populate with sample ADRs, PRDs, modules
- Use as demonstration in docs
- Reference in marketing materials

**Documentation Site** (simple, fast):
```markdown
docs/
├── getting-started.md
├── cli-reference.md
├── api-reference.md
├── guides/
│   ├── teams-and-projects.md
│   ├── migration.md
│   └── graphql-queries.md
└── examples/
    ├── search-patterns.md
    └── relationship-graphs.md
```

**Deliverables**:
- [ ] Full CLI reference documentation
- [ ] GraphQL API documentation (schema + examples)
- [ ] Getting started guide (5-minute setup)
- [ ] Example public project created
- [ ] Video walkthrough (5 minutes, YouTube)

**Acceptance Criteria**:
- ✅ Documentation covers all features
- ✅ Examples work end-to-end
- ✅ Getting started guide <5 minutes
- ✅ Video published and linked
- ✅ Docs deployed (docs.ginko.ai)

---

### Week 4 Deliverables
- ✅ Public OSS catalog live
- ✅ Production deployment complete
- ✅ Comprehensive documentation published
- ✅ Ready for launch announcement

---

## Success Metrics

### Infrastructure
- [ ] Graph DB selected and production-ready
- [ ] Query performance: <50ms p95 for simple queries, <200ms p95 for complex
- [ ] Uptime: >99% during sprint (staging)
- [ ] Cost: <$100/mo for current usage

### Features
- [ ] GitHub OAuth working (100% success rate)
- [ ] 5+ GraphQL queries implemented and functional
- [ ] 10+ CLI commands working end-to-end
- [ ] Public catalog with ≥1 example project

### Quality
- [ ] Test coverage: >80% for core functions
- [ ] Zero critical bugs in production
- [ ] Error tracking: <1% error rate
- [ ] Documentation: 100% of features documented

### Adoption
- [ ] 1+ real OSS project migrated (not just examples)
- [ ] ≥5 internal team members using daily
- [ ] Positive feedback (qualitative survey)

---

## Risks & Mitigations

### Risk: Graph DB Performance Issues
**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Week 1 benchmarking catches performance issues early
- Fallback: Switch to alternate DB option (PostgreSQL+AGE)
- Query optimization: Add indexes, caching layer

---

### Risk: GitHub API Rate Limits
**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Use OAuth tokens (5K req/hr vs 60 unauthenticated)
- Cache repo metadata (24hr TTL)
- Exponential backoff on rate limit errors
- Manual visibility toggle fallback

---

### Risk: Low OSS Adoption
**Likelihood**: Medium
**Impact**: High (business model depends on OSS funnel)

**Mitigation**:
- Pre-launch: Partner with 5-10 OSS projects
- Offer white-glove migration assistance
- Create compelling examples and case studies
- Week 4 launch announcement with social proof

---

### Risk: Scope Creep
**Likelihood**: High
**Impact**: Medium

**Mitigation**:
- Strict adherence to MVP scope (no web dashboard UI yet)
- Weekly check-ins: completed tasks vs remaining work
- Defer non-critical features (offline mode, real-time collaboration)
- Focus on shipping minimal viable product

---

## Out of Scope (Explicitly Deferred)

- ⏭️ Web dashboard UI (CLI-first MVP)
- ⏭️ Real-time collaboration (websockets, live updates)
- ⏭️ Git export automation (scheduled background syncs)
- ⏭️ Advanced analytics (query insights, usage heatmaps)
- ⏭️ Integrations (Notion, Confluence, Slack)
- ⏭️ Organizations (team hierarchy above teams)
- ⏭️ Billing infrastructure (Stripe integration)
- ⏭️ Mobile CLI (iOS/Android apps)

These features are important but not blocking for MVP launch. Will be prioritized in post-MVP sprints based on user feedback.

---

## Sprint Retrospective (To be completed 2025-11-24)

### What Went Well
_To be filled after sprint completion_

### What Could Be Improved
_To be filled after sprint completion_

### Action Items for Next Sprint
_To be filled after sprint completion_

### Key Learnings
_To be filled after sprint completion_

---

**Sprint Status**: Active (Started 2025-10-27)
**Next Sprint**: TBD (Post-MVP enhancements based on feedback)
