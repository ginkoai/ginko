# ADR-039: Unified Knowledge Graph with GraphQL Interface

## Status
Proposed

## Date
2025-10-24

## Context

As the Ginko context module system grows, we face a critical discoverability problem:

**Current State:**
- Context modules are stored as git-native markdown files with rich metadata (tags, type, relevance, dependencies)
- Modules are indexed in `.ginko/context/index.json` with categorization
- Strategic loading prioritizes: session log → sprint → backlog → references → modules
- Modules loaded LAST with lowest priority

**The Problem:**
When a developer discovers "ADR-038 Generative UI Pattern" and creates a context module:
- ✅ It gets indexed with tags: `[ui, patterns, generative, adr-038]`
- ❌ The AI partner doesn't know to search for "generative UI" when working on UI features
- ❌ No query interface for: "show me all patterns related to UI"
- ❌ No relevance ranking based on current work context (branch, modified files, session goals)
- ❌ Discovery relies on manual file browsing or hoping relevant modules are in always-load core

**Forces at Play:**
1. **Performance**: Linear search through 100+ modules on every session start is too slow
2. **Relevance**: Not all 100+ modules are relevant to current work - need intelligent filtering
3. **Privacy-First**: Must remain git-native, no external services, local-only
4. **Team Collaboration**: Modules should be discoverable by all team members
5. **Flexibility**: Complex queries needed (tags AND type AND relevance AND text search)
6. **Git-Native**: Files must remain source of truth for version control, no lock-in

**Example Use Case:**
Developer starts working on authentication UI feature:
- Current: AI has no idea `pattern-jwt-refresh-tokens.md` exists
- Desired: AI automatically loads top 3-5 relevant modules (authentication, patterns, UI)
- Query: "Show me patterns tagged 'auth' OR 'security' with high relevance"

## Decision

Implement a **three-tier context discovery architecture**:

### 1. Unified In-Memory Knowledge Graph
Build comprehensive graph on `ginko start` from all knowledge sources:

**Node Types:**
- **ContextModule** - Insights, patterns, gotchas (from `.ginko/context/modules/`)
- **ADR** - Architecture decisions (from `docs/adr/`)
- **PRD** - Product requirements (from `docs/PRD/`)
- **BacklogItem** - Features, tasks, bugs (from `backlog/items/`)
- **Sprint** - Sprint plans (from `docs/sprints/`)
- **Session** - Session logs (from `.ginko/sessions/`)
- **CodeFile** - Source files with metadata (from frontmatter)
- **Tag** - Shared tags across all node types

**Edge Types (Relationships):**
- `references` - Any node referencing another (ADR-038 → TASK-016, PRD-006 → ADR-032)
- `implements` - Backlog item implements ADR/PRD (TASK-016 → ADR-033, FEATURE-018 → PRD-006)
- `depends-on` - Dependency relationship (module A → module B, TASK-A → TASK-B)
- `related-to` - Semantic similarity (pattern A ~> pattern B)
- `blocks` - Blocking relationship (BUG-001 blocks FEATURE-002)
- `requires` - Prerequisite (SPRINT-W2 requires TASK-015)
- `tagged-with` - Tag association (ADR-038 → Tag:ui, TASK-016 → Tag:logging)
- `affects` - File path relationship (module → src/auth/login.ts)
- `discovered-in` - Session provenance (insight → session-2025-10-24)
- `evolved-from` - Version history (ADR-039 supersedes ADR-021)

**Node Properties (Common):**
```typescript
interface BaseNode {
  id: string;           // Unique identifier
  type: NodeType;       // ADR | PRD | BacklogItem | etc.
  title: string;        // Human-readable title
  tags: string[];       // Shared tag namespace
  created: Date;        // Creation timestamp
  updated: Date;        // Last modification
  status: string;       // Active | Deprecated | Completed | etc.
  relevance: Relevance; // Critical | High | Medium | Low
  content?: string;     // Full markdown content (lazy-loaded)
  filePath: string;     // Source file path
}
```

**Library**: Use lightweight `graphology` (~50KB, pure JS, 1M+ downloads/week)

### 2. GraphQL Query Interface
In-process GraphQL server (no network, no ports) with unified schema:

```graphql
# ===== Node Types =====

interface KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!
  content: String  # Lazy-loaded full content
}

type ContextModule implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!
  content: String
  moduleType: ModuleType!  # gotcha, pattern, etc.
  relatedModules: [ContextModule!]!
  implementedBy: [BacklogItem!]!
  discoveredIn: Session
}

type ADR implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!  # Proposed, Accepted, Deprecated, Superseded
  relevance: Relevance!
  filePath: String!
  content: String
  number: Int!
  referencedBy: [KnowledgeNode!]!
  implements: [PRD!]!
  supersedes: ADR
  supersededBy: ADR
}

type PRD implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!
  content: String
  implementedBy: [BacklogItem!]!
  relatedADRs: [ADR!]!
}

type BacklogItem implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!  # todo, in-progress, done, blocked
  relevance: Relevance!
  filePath: String!
  content: String
  itemType: BacklogItemType!  # feature, task, bug
  priority: Priority!
  size: String
  implements: [KnowledgeNode!]!  # ADR, PRD, Module
  blocks: [BacklogItem!]!
  blockedBy: [BacklogItem!]!
  assignedTo: String
  parent: BacklogItem
  children: [BacklogItem!]!
}

type Sprint implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!
  content: String
  items: [BacklogItem!]!
  startDate: DateTime
  endDate: DateTime
  velocity: Float
}

type Session implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!
  content: String
  insights: [ContextModule!]!
  workCompleted: [BacklogItem!]!
  references: [KnowledgeNode!]!
}

# ===== Enums =====

enum NodeType {
  CONTEXT_MODULE
  ADR
  PRD
  BACKLOG_ITEM
  SPRINT
  SESSION
  CODE_FILE
  TAG
}

enum ModuleType {
  GOTCHA
  PATTERN
  DECISION
  DISCOVERY
  OPTIMIZATION
  WORKAROUND
  CONFIGURATION
  ARCHITECTURE
}

enum BacklogItemType {
  FEATURE
  TASK
  BUG
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum Relevance {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

# ===== Queries =====

type Query {
  # === Universal Queries ===

  # Search across ALL knowledge types
  search(
    query: String!
    types: [NodeType!]
    tags: [String!]
    minRelevance: Relevance
    limit: Int = 20
  ): [KnowledgeNode!]!

  # Get any node by ID
  node(id: ID!): KnowledgeNode

  # Get nodes by tag (cross-type)
  nodesByTag(tag: String!, types: [NodeType!]): [KnowledgeNode!]!

  # Find nodes relevant to current work context
  relevantToContext(
    files: [String!]
    branch: String
    tags: [String!]
    limit: Int = 10
  ): [KnowledgeNode!]!

  # === Relationship Queries ===

  # Get full relationship graph around a node
  nodeGraph(nodeId: ID!, depth: Int = 2): GraphResult!

  # Find nodes that reference a specific node
  referencedBy(nodeId: ID!): [KnowledgeNode!]!

  # Find nodes referenced by a specific node
  references(nodeId: ID!): [KnowledgeNode!]!

  # === Type-Specific Queries ===

  # ADR queries
  adr(number: Int!): ADR
  adrs(status: String, tags: [String!]): [ADR!]!

  # PRD queries
  prd(id: String!): PRD
  prds(status: String): [PRD!]!

  # Backlog queries
  backlogItem(id: String!): BacklogItem
  backlog(
    status: String
    priority: Priority
    assignedTo: String
    type: BacklogItemType
  ): [BacklogItem!]!

  # Context module queries
  modules(
    type: ModuleType
    minRelevance: Relevance
    tags: [String!]
  ): [ContextModule!]!

  # Sprint queries
  sprint(id: String!): Sprint
  sprints(status: String): [Sprint!]!
  currentSprint: Sprint

  # === Analytical Queries ===

  # Show implementation status for an ADR
  adrImplementation(adrNumber: Int!): ADRImplementationStatus!

  # Show all work implementing a PRD
  prdProgress(prdId: String!): PRDProgress!

  # Find blocking dependencies for a backlog item
  blockingChain(itemId: String!): [BacklogItem!]!

  # Find all knowledge created in a session
  sessionKnowledge(sessionId: String!): SessionKnowledge!
}

# ===== Result Types =====

type GraphResult {
  center: KnowledgeNode!
  nodes: [KnowledgeNode!]!
  edges: [GraphEdge!]!
  depth: Int!
}

type GraphEdge {
  from: ID!
  to: ID!
  type: EdgeType!
  label: String
}

enum EdgeType {
  REFERENCES
  IMPLEMENTS
  DEPENDS_ON
  RELATED_TO
  BLOCKS
  REQUIRES
  TAGGED_WITH
  AFFECTS
  DISCOVERED_IN
  EVOLVED_FROM
}

type ADRImplementationStatus {
  adr: ADR!
  relatedPRDs: [PRD!]!
  backlogItems: [BacklogItem!]!
  completedCount: Int!
  inProgressCount: Int!
  blockedCount: Int!
  completionPercentage: Float!
}

type PRDProgress {
  prd: PRD!
  relatedADRs: [ADR!]!
  backlogItems: [BacklogItem!]!
  completedCount: Int!
  totalCount: Int!
  progress: Float!
}

type SessionKnowledge {
  session: Session!
  modulesCreated: [ContextModule!]!
  tasksCompleted: [BacklogItem!]!
  adrsCreated: [ADR!]!
  referencedNodes: [KnowledgeNode!]!
}
```

**Example Queries:**

```graphql
# Find all backlog items implementing ADR-038
query {
  adr(number: 38) {
    title
    implementedBy {
      id
      title
      status
    }
  }
}

# Find patterns related to authentication
query {
  modules(type: PATTERN, tags: ["auth", "security"]) {
    title
    relevance
    implementedBy {
      title
      status
    }
  }
}

# Get implementation status for ADR-033
query {
  adrImplementation(adrNumber: 33) {
    completionPercentage
    backlogItems {
      title
      status
    }
  }
}

# Find all knowledge from today's session
query {
  sessionKnowledge(sessionId: "session-2025-10-24") {
    modulesCreated { title }
    tasksCompleted { title }
    adrsCreated { title }
  }
}

# Show relationship graph around ADR-038
query {
  nodeGraph(nodeId: "ADR-038", depth: 2) {
    nodes { title type }
    edges { from to type }
  }
}
```

### 3. Git-Native File Fallback
- If graph unavailable (corrupted, first run), fall back to file-based search
- All graph data derived from git-tracked files (no proprietary format)
- Graph is ephemeral cache, files are source of truth
- Rebuild graph from files on any inconsistency

### CLI Commands (Cross-Knowledge Queries)
```bash
# === Universal Search ===
ginko knowledge search "authentication"  # Search across ALL types
ginko knowledge search "UI patterns" --types=ADR,Module,Backlog

# === Tag-based Discovery ===
ginko knowledge tags ui,generative  # Show all knowledge with these tags
ginko knowledge by-tag security --types=Pattern,ADR

# === Context-Aware Queries ===
ginko knowledge relevant  # Auto-detect from current files/branch
ginko knowledge relevant --files="src/ui/auth.tsx,src/api/login.ts"

# === Relationship Queries ===
ginko knowledge graph ADR-038  # Show relationship graph
ginko knowledge implements ADR-033  # Show backlog items implementing ADR
ginko knowledge references TASK-016  # What references this task?
ginko knowledge blocks FEATURE-022  # What's blocking this feature?

# === Implementation Status ===
ginko knowledge adr-status 038  # ADR implementation progress
ginko knowledge prd-status PRD-006  # PRD completion percentage
ginko knowledge sprint-progress  # Current sprint knowledge graph

# === Type-Specific Queries ===
ginko knowledge adrs --status=Proposed
ginko knowledge prds --status=Active
ginko knowledge backlog --priority=high --status=blocked
ginko knowledge modules --type=pattern --relevance=high

# === Session Knowledge ===
ginko knowledge session today  # All knowledge created today
ginko knowledge session 2025-10-24  # Specific session
```

**Real-World Examples:**

```bash
# "What patterns exist for authentication?"
ginko knowledge by-tag auth --types=Pattern,Module

# "Show me all work related to ADR-038"
ginko knowledge graph ADR-038 --depth=2

# "What's blocking the OAuth integration?"
ginko knowledge blocks FEATURE-022

# "What PRDs need ADR decisions?"
ginko knowledge prds --missing-adrs

# "Show knowledge relevant to my current work"
ginko knowledge relevant
# → Analyzes: src/ui/generative-form.tsx (modified)
# → Returns: ADR-038 (generative UI), pattern-dynamic-forms, TASK-042
```

### Auto-Loading in `ginko start`
1. **Build Unified Graph** (10-20ms for 1000+ nodes)
   - Load from: context index, backlog files, ADR docs, PRD docs, session logs
   - Build relationships: references, implements, blocks, tags, etc.

2. **Analyze Current Context**
   - Git: branch name, modified files, recent commits
   - Session: previous session log references
   - User: work mode (think-build, hack-ship, deep-work)
   - Time: sprint goals, active backlog items

3. **Query for Relevance** (GraphQL)
   ```graphql
   relevantToContext(
     files: ["src/ui/generative-form.tsx", "src/api/forms.ts"],
     branch: "feature/dynamic-forms",
     tags: ["ui", "forms"],
     limit: 10
   )
   ```

4. **Rank and Load Top Knowledge**
   - Score each node by relevance (tag match, file overlap, type match)
   - Load top 5-10 nodes with highest scores
   - Include both direct matches AND related nodes (1 hop away)

5. **Display in Session Summary**
   ```
   📚 Knowledge Loaded (8 items):
      ADR-038: Generative UI Pattern (relevance: 95%)
      TASK-042: Implement dynamic form builder (in-progress)
      pattern-form-validation: Validation patterns (relevance: 87%)
      PRD-006: Phase 1 Developer Tools (related)
      gotcha-react-forms: Common form gotchas (relevance: 82%)
   ```

6. **Continuous Re-ranking**
   - As files change during session, re-score relevance
   - Suggest new knowledge: "💡 ADR-041 might be relevant (new file: src/validation.ts)"

## Value Proposition: Unified vs Siloed Knowledge

### Current State (Siloed Systems)
- **Context Modules**: Stored in `.ginko/context/modules/`, indexed separately
- **ADRs**: In `docs/adr/`, manually linked via markdown references
- **PRDs**: In `docs/PRD/`, disconnected from implementation
- **Backlog**: In `backlog/items/`, no visibility into related decisions
- **Sprints**: In `docs/sprints/`, isolated from knowledge graph

**Pain Points:**
- ❌ "Which backlog items implement ADR-038?" → Manual grep + read multiple files
- ❌ "What modules are related to authentication?" → Browse 100+ files manually
- ❌ "Is PRD-006 complete?" → Check backlog, check sprints, check git history
- ❌ "What decisions support this feature?" → Search ADRs, hope for markdown links
- ❌ "What was discovered in last session?" → Read session log, no structured access

### Unified Knowledge Graph
**Single Source of Truth:** All knowledge types in one graph with rich relationships

**Powerful Queries:**
- ✅ `adrImplementation(38)` → Shows 3 tasks (2 done, 1 in-progress), 85% complete
- ✅ `nodesByTag("auth")` → Returns 8 modules, 3 ADRs, 5 tasks, 2 PRDs
- ✅ `prdProgress("PRD-006")` → 12/15 tasks complete, links to ADRs and modules
- ✅ `nodeGraph("ADR-038", depth=2)` → Visual graph of all connections
- ✅ `sessionKnowledge("today")` → 2 modules created, 3 tasks completed, 1 ADR proposed

**Emergent Insights:**
- **Impact Analysis**: "If I deprecate ADR-021, what breaks?" → Query `references(ADR-021)`
- **Knowledge Gaps**: "PRD-006 has no related modules" → Opportunity to capture learnings
- **Bottleneck Detection**: "TASK-016 blocks 5 other tasks" → Priority insight
- **Session Value**: "Today's session created $X knowledge" → Metrics for productivity
- **Team Alignment**: "Everyone working on 'auth' sees the same context" → Shared understanding

**AI Partner Benefits:**
- **Context Awareness**: AI automatically loads relevant ADRs when working on related tasks
- **Relationship Navigation**: "This task implements ADR-038" → AI reads ADR without being told
- **Proactive Suggestions**: "You might want to review pattern-jwt-refresh for this work"
- **Implementation Tracking**: AI knows 85% of ADR-038 is implemented, suggests next steps
- **Session Continuity**: AI sees what knowledge was created yesterday, builds on it

## Considered Alternatives

### Option 1: Full-Text Search with Ripgrep
**Pros:**
- Already familiar tool
- Fast text search
- No dependencies

**Cons:**
- No relationship traversal
- No relevance ranking
- Can't query by metadata (tags, type, relevance)
- Linear search every time

**Verdict:** Not sufficient for complex queries like "show patterns related to auth"

### Option 2: SQLite Database
**Pros:**
- Mature, reliable
- SQL query language
- Fast indexed searches

**Cons:**
- Not git-native (binary file)
- Requires migration scripts
- Relationship queries are verbose (JOINs)
- Lock-in risk (proprietary format)
- Merge conflicts difficult

**Verdict:** Violates git-native principle, adds complexity

### Option 3: Keep Current File-Based System
**Pros:**
- Simple, no new dependencies
- Git-native by default

**Cons:**
- Doesn't solve discoverability problem
- Linear search scales poorly
- No intelligent relevance ranking
- Manual discovery only

**Verdict:** Status quo doesn't address the core problem

### Option 4: Vector Embeddings + Semantic Search
**Pros:**
- Most intelligent relevance matching
- Handles synonyms and conceptual similarity

**Cons:**
- Requires external AI service (privacy violation) OR
- Requires local embedding model (heavy dependency)
- Overkill for current scale (100-1000 modules)
- Complex infrastructure

**Verdict:** Over-engineering, revisit at 10,000+ modules

## Consequences

### Positive
1. **Fast Discovery**: O(1) tag lookups, O(log N) text search via graph indexes
2. **Intelligent Loading**: AI automatically gets relevant context without manual searching
3. **Flexible Queries**: GraphQL enables complex filters (tags AND type AND relevance)
4. **Relationship Awareness**: Traverse "related-to" edges to find connected knowledge
5. **Privacy-First**: In-memory, local-only, no external services
6. **Git-Native**: Files remain source of truth, graph is ephemeral cache
7. **Team Collaboration**: Discoverable modules benefit all team members
8. **Scalable**: Graph queries scale better than linear file search

### Negative
1. **Graph Rebuild Cost**: ~5-10ms on every `ginko start` (acceptable)
2. **Memory Overhead**: ~1-2MB for 1000 modules (negligible on modern systems)
3. **New Dependency**: Adds `graphology` (~50KB) and GraphQL library
4. **Complexity**: Graph maintenance logic, sync from index.json
5. **Consistency**: Must keep graph in sync with file changes (rebuild on write)

### Neutral
1. **Learning Curve**: Team needs to understand graph concepts (nodes, edges)
2. **Testing**: Need tests for graph queries, relationship traversal
3. **Documentation**: Requires documenting GraphQL schema and query patterns

## Implementation Plan

### Phase 1: Graph Foundation (Week 1)
- [ ] Add `graphology` dependency
- [ ] Implement `ContextGraph` class with build-from-index method
- [ ] Write tests for graph construction from index.json
- [ ] Benchmark graph build time (<10ms for 1000 modules)

### Phase 2: Query Interface (Week 2)
- [ ] Add GraphQL library (consider `graphql-js` or lighter alternative)
- [ ] Implement GraphQL schema with Module type and Query resolvers
- [ ] Create `searchModules()`, `relevantToFiles()`, `modulesByType()` resolvers
- [ ] CLI commands: `ginko context search`, `ginko context relevant`

### Phase 3: Auto-Loading Integration (Week 3)
- [ ] Enhance `ginko start` to build graph
- [ ] Implement relevance scoring algorithm (tags + file paths + type)
- [ ] Auto-load top 5 relevant modules
- [ ] Display loaded modules in session summary

### Phase 4: Advanced Features (Week 4)
- [ ] Full-text search resolver: `searchContent()`
- [ ] Graph traversal: `moduleGraph()` for relationship visualization
- [ ] CLI command: `ginko context graph <moduleId>`
- [ ] Performance optimization: cache hot paths

### Phase 5: Polish & Documentation (Week 5)
- [ ] Fallback to file-based search if graph unavailable
- [ ] Error handling and validation
- [ ] Update CLAUDE.md with query examples
- [ ] Team documentation: GraphQL query patterns

## References
- ADR-033: Context Pressure Mitigation Strategy (session logging foundation)
- ADR-038: Generative UI Pattern (example high-value module)
- TASK-015: Always-Load Core Context Module System (strategic loading)
- TASK-016: Real-Time Insight Promotion in ginko log (module creation)
- `.ginko/context/index.json`: Current metadata storage
- `packages/cli/src/utils/context-loader.ts`: Strategic loading implementation
- `packages/cli/src/services/module-generator.ts`: Module creation service

## Technical Considerations

### Graph Library Selection
**graphology** is recommended:
- Lightweight (~50KB minified)
- Pure JavaScript (no native dependencies)
- Rich API (neighbors, paths, traversal)
- Well-maintained, 1M+ weekly downloads
- Supports directed/undirected graphs
- Serialization built-in

### GraphQL Library Selection
**graphql-js** (official) vs **yoga** vs **mercurius**:
- Start with `graphql-js` (official, 5MB, well-documented)
- Consider `graphql-yoga` if need lightweight (500KB)
- No network layer needed (in-process only)

### Relevance Scoring Algorithm
```typescript
function calculateRelevance(module: Module, context: WorkContext): number {
  let score = 0;

  // Tag matching (0-40 points)
  const matchingTags = intersection(module.tags, context.inferredTags);
  score += matchingTags.length * 10;

  // Type match (0-20 points)
  if (context.workMode === 'debugging' && module.type === 'GOTCHA') score += 20;
  if (context.workMode === 'architecture' && module.type === 'PATTERN') score += 20;

  // File path overlap (0-30 points)
  const affectedFiles = module.relatedFiles || [];
  const overlap = intersection(affectedFiles, context.modifiedFiles);
  score += overlap.length * 10;

  // Base relevance (0-10 points)
  const relevanceMap = { critical: 10, high: 7, medium: 4, low: 1 };
  score += relevanceMap[module.relevance];

  return Math.min(score, 100); // Cap at 100
}
```

### Migration Path
1. **Week 1-2**: Build graph system alongside existing file-based loading
2. **Week 3**: Feature flag: `GINKO_USE_GRAPH=true` for opt-in testing
3. **Week 4**: Enable by default with automatic fallback
4. **Week 5**: Remove feature flag, graph is standard

### Rollback Strategy
- Graph is ephemeral cache, deleting doesn't break system
- Files remain source of truth
- Fallback to file-based search is automatic
- No schema migrations needed (just rebuild graph)

## Success Metrics
1. **Discovery Time**: Reduce "find relevant module" from 2-5 minutes (manual) to <1 second (auto)
2. **Context Relevance**: AI loads 3-5 relevant modules on 80%+ of sessions
3. **Query Performance**: Graph queries complete in <50ms
4. **Adoption**: 10+ queries per session via `ginko context search`
5. **Team Satisfaction**: Survey shows improved knowledge discovery

---

**Proposed by:** Chris Norton & Claude (Session: 2025-10-24)
**Decision Date:** TBD (awaiting review)
**Implementation Start:** TBD
