# ADR-039: Knowledge Discovery Graph for AI-Native Documentation

## Status
Accepted - Cloud-First Implementation (2025-10-27)

## Date
2025-10-24

## 🔄 Cloud-First Pivot (2025-10-27)

**Strategic Shift**: This ADR originally proposed a git-native, local-first graph architecture. After further analysis, we've pivoted to a **cloud-first SaaS platform** while preserving the core knowledge discovery vision.

**Key Changes:**
- **Storage**: Cloud graph database (not local files) as primary source of truth
- **Collaboration**: Multi-tenant platform with teams, projects, GitHub OAuth
- **Business Model**: Freemium with free tier for public OSS repositories
- **Discovery**: Public catalog of OSS project knowledge graphs

**Why Cloud-First:**
1. **Team Collaboration**: Real-time access requires cloud synchronization
2. **Cross-Project Discovery**: Query knowledge across multiple repositories
3. **OSS Opportunity**: Free tier for public repos drives adoption and marketing
4. **Scalability**: Centralized graph scales better than distributed file syncing

**Preserved from Original Vision:**
- GraphQL query interface (exact schema from this ADR)
- Knowledge node types (ADR, PRD, Module, Session, CodeFile)
- Relationship model (references, implements, depends-on, etc.)
- CLI-first developer experience (`ginko knowledge` commands)
- Git export capability (no lock-in)

**Implementation Details**: See **[PRD-010: Cloud-First Knowledge Graph Platform](../PRD/PRD-010-cloud-knowledge-graph.md)**

**Original Git-Native Vision Preserved Below** for context and comparison...

---

## Strategic Context

### The Knowledge Silo Problem

Most companies store development knowledge in tools that create AI-hostile silos:

**Current State:**
```
Code Repository (GitHub)          Documentation (Confluence/Notion)
├── src/auth/login.ts            ├── "OAuth Implementation Guide"
├── src/api/users.ts             ├── "User API Decisions"
└── tests/auth.test.ts           └── "Testing Strategy"
      ↕                                    ↕
   Versioned                          Unversioned
   AI-readable                        AI-inaccessible
   Lives with code                    Siloed from code
                                     Often stale/wrong
```

**Problems:**
1. **Documentation drift** - Confluence page says one thing, code does another
2. **AI blindness** - AI can't read your Confluence/Notion (proprietary formats, no standard linkage)
3. **Knowledge loss** - Developer leaves, Slack threads disappear, context evaporates
4. **Version mismatch** - No way to know "what did we decide when we wrote THIS code?"
5. **Manual linking** - "See PROJ-123 in Jira" → Dead links, external context switches

**Ginko's Solution: Code-Native Knowledge**
```
Git Repository (Single Source of Truth)
├── src/auth/login.ts
├── tests/auth.test.ts
├── docs/adr/ADR-012-oauth-strategy.md    ← Versioned WITH code
├── docs/PRD/PRD-006-auth-system.md       ← AI can read
└── .ginko/context/modules/
    └── pattern-oauth-refresh-tokens.md   ← Created BY AI
```

### Why Git-Native Knowledge Management?

1. ✅ **Zero drift** - Knowledge versioned with code in same commits
2. ✅ **AI-native format** - Markdown is AI's native language
3. ✅ **Portable** - Works with any AI model (Claude, GPT, Gemini, local models)
4. ✅ **AI co-authorship** - AI partners create documentation during development
5. ✅ **Discoverable** - Graph indexes relationships for fast context loading

**Strategic Positioning:**

Ginko positions as the **vendor-neutral AI collaboration interface**, analogous to how Terraform provides vendor-neutral infrastructure management across cloud providers.

**What Ginko Is:**
- AI-Native Knowledge Management for development teams
- Git-Native Documentation versioned with code
- Knowledge Discovery Graph for AI context
- Vendor-Neutral AI Interface (works with any AI model)

**What Ginko Is NOT:**
- Project management tool (use Linear/Jira for work tracking)
- Real-time collaboration platform (use Slack/Teams)
- Code repository (use GitHub/GitLab)

**Tagline:** *"Keep your knowledge where your code lives, in a format AI can understand."*

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

Implement a **three-tier context discovery architecture** focused on **knowledge discovery** (not work tracking):

## Out of Scope

**Work tracking (backlog items, sprints) is explicitly out of scope for this ADR.**

**Rationale:**
1. **Mature tools exist** - Linear, Jira, and GitHub Projects are established, feature-rich solutions
2. **Git-native doesn't scale for work tracking** - Sequential ID conflicts in multi-user scenarios
3. **Real-time expectations** - Modern teams expect live updates, which git-native can't provide
4. **Ginko's unique value** - AI collaboration and knowledge management, not project management

**Strategic Decision:**
- Ginko will **integrate** with existing work tracking tools rather than compete
- Local backlog remains as fallback for solo developers
- Graph database indexes **knowledge only** (ADRs, PRDs, Modules, Sessions)
- External work items are **referenced**, not stored in graph

**Future Work:**
See ADR-040: Work Tracking Integration Strategy (Linear, Jira, GitHub Projects)

### 1. Knowledge-Focused In-Memory Graph
Build graph on `ginko start` from knowledge sources only:

**Node Types (Knowledge Only):**
- **ContextModule** - Insights, patterns, gotchas (from `.ginko/context/modules/`)
- **ADR** - Architecture decisions (from `docs/adr/`)
- **PRD** - Product requirements (from `docs/PRD/`)
- **Session** - Session logs (from `.ginko/sessions/`)
- **CodeFile** - Source files with metadata (from frontmatter)
- **Tag** - Shared tags across all node types
- **ExternalWorkReference** - Links to external work tracking (Linear, Jira, GitHub) - metadata cached, not authoritative

**Edge Types (Knowledge Relationships):**
- `references` - Any node referencing another (ADR-038 → PRD-006, Session → ADR-033)
- `implements` - Code/ADR implements PRD (ADR-033 → PRD-006)
- `depends-on` - Dependency relationship (module A → module B, ADR-A → ADR-B)
- `related-to` - Semantic similarity (pattern A ~> pattern B)
- `tagged-with` - Tag association (ADR-038 → Tag:ui, Module → Tag:auth)
- `affects` - File path relationship (ADR → src/auth/login.ts)
- `discovered-in` - Session provenance (Module → session-2025-10-24)
- `evolved-from` - Version history (ADR-039 supersedes ADR-021)
- `tracked-in` - External work reference (ADR-039 tracked-in Linear:LIN-123) - integration only

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
  relatedADRs: [ADR!]!
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
  implementedBy: [ADR!]!  # ADRs that implement this PRD
  trackedIn: [ExternalWorkReference!]!  # External work items
  relatedADRs: [ADR!]!
}

type ExternalWorkReference implements KnowledgeNode {
  id: ID!
  type: NodeType!
  title: String!
  tags: [String!]!
  created: DateTime!
  updated: DateTime!
  status: String!
  relevance: Relevance!
  filePath: String!  # Reference stored in frontmatter
  content: String
  provider: WorkProvider!  # linear, jira, github
  externalId: String!  # LIN-123, PROJ-456, etc.
  url: String!
  implements: [KnowledgeNode!]!  # ADR, PRD this work relates to
  # Cached metadata (not authoritative, synced periodically):
  cachedStatus: String
  cachedAssignee: String
  lastSynced: DateTime
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
  adrsCreated: [ADR!]!
  references: [KnowledgeNode!]!
  externalWork: [ExternalWorkReference!]!  # External work referenced during session
}

# ===== Enums =====

enum NodeType {
  CONTEXT_MODULE
  ADR
  PRD
  SESSION
  CODE_FILE
  TAG
  EXTERNAL_WORK_REFERENCE
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

enum WorkProvider {
  LINEAR
  JIRA
  GITHUB
  ASANA
  LOCAL  # Fallback for solo devs
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

  # Context module queries
  modules(
    type: ModuleType
    minRelevance: Relevance
    tags: [String!]
  ): [ContextModule!]!

  # External work queries (integration layer)
  externalWork(provider: WorkProvider!, externalId: String!): ExternalWorkReference
  externalWorkByUrl(url: String!): ExternalWorkReference

  # === Analytical Queries ===

  # Show implementation status for an ADR
  adrImplementation(adrNumber: Int!): ADRImplementationStatus!

  # Show all work implementing a PRD (knowledge + external work)
  prdProgress(prdId: String!): PRDProgress!

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
  relatedModules: [ContextModule!]!
  externalWork: [ExternalWorkReference!]!  # External tracking
  completionPercentage: Float  # Based on external work status
}

type PRDProgress {
  prd: PRD!
  relatedADRs: [ADR!]!
  implementingADRs: [ADR!]!
  externalWork: [ExternalWorkReference!]!
  completedCount: Int  # Based on ADR status + external work
  totalCount: Int
  progress: Float!
}

type SessionKnowledge {
  session: Session!
  modulesCreated: [ContextModule!]!
  adrsCreated: [ADR!]!
  prdsCreated: [PRD!]!
  referencedNodes: [KnowledgeNode!]!
  externalWorkReferenced: [ExternalWorkReference!]!
}
```

**Example Queries:**

```graphql
# Find all knowledge implementing ADR-038
query {
  adr(number: 38) {
    title
    referencedBy {
      __typename
      ... on ContextModule { title relevance }
      ... on PRD { title status }
      ... on Session { title created }
    }
  }
}

# Find patterns related to authentication
query {
  modules(type: PATTERN, tags: ["auth", "security"]) {
    title
    relevance
    relatedADRs {
      title
      status
    }
    discoveredIn {
      title
      created
    }
  }
}

# Get implementation status for ADR-033 (knowledge + external work)
query {
  adrImplementation(adrNumber: 33) {
    completionPercentage
    relatedModules {
      title
      moduleType
    }
    externalWork {
      provider
      externalId
      url
      cachedStatus
    }
  }
}

# Find all knowledge from today's session
query {
  sessionKnowledge(sessionId: "session-2025-10-24") {
    modulesCreated { title relevance }
    adrsCreated { title status }
    prdsCreated { title }
    externalWorkReferenced { provider externalId url }
  }
}

# Show relationship graph around ADR-038 (knowledge only)
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

### CLI Commands (Knowledge Discovery Queries)
```bash
# === Universal Search ===
ginko knowledge search "authentication"  # Search across ALL knowledge types
ginko knowledge search "UI patterns" --types=ADR,Module,PRD

# === Tag-based Discovery ===
ginko knowledge tags ui,generative  # Show all knowledge with these tags
ginko knowledge by-tag security --types=Pattern,ADR

# === Context-Aware Queries ===
ginko knowledge relevant  # Auto-detect from current files/branch
ginko knowledge relevant --files="src/ui/auth.tsx,src/api/login.ts"

# === Relationship Queries ===
ginko knowledge graph ADR-038  # Show knowledge relationship graph
ginko knowledge implements PRD-006  # Show ADRs implementing PRD
ginko knowledge references ADR-033  # What knowledge references this ADR?
ginko knowledge discovered session-2025-10-24  # Knowledge from session

# === Implementation Status ===
ginko knowledge adr-status 038  # ADR implementation (modules + external work)
ginko knowledge prd-status PRD-006  # PRD progress (ADRs + external work)

# === Type-Specific Queries ===
ginko knowledge adrs --status=Proposed
ginko knowledge prds --status=Active
ginko knowledge modules --type=pattern --relevance=high

# === Session Knowledge ===
ginko knowledge session today  # All knowledge created today
ginko knowledge session 2025-10-24  # Specific session
```

**Real-World Examples:**

```bash
# "What patterns exist for authentication?"
ginko knowledge by-tag auth --types=Pattern,Module

# "Show me all knowledge related to ADR-038"
ginko knowledge graph ADR-038 --depth=2
# → Returns: ADR-038, related modules, implementing PRDs, sessions where discussed

# "What ADRs implement PRD-006?"
ginko knowledge implements PRD-006

# "Show knowledge relevant to my current work"
ginko knowledge relevant
# → Analyzes: src/ui/generative-form.tsx (modified)
# → Returns: ADR-038 (generative UI), pattern-dynamic-forms, related modules
```

### Auto-Loading in `ginko start`
1. **Build Knowledge Graph** (10-20ms for 1000+ nodes)
   - Load from: context modules, ADR docs, PRD docs, session logs, code files (frontmatter)
   - Build relationships: references, implements, discovered-in, affects, tags, etc.

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

## Value Proposition: Knowledge Discovery vs Siloed Documentation

### Current State (Siloed Documentation)
- **Context Modules**: Stored in `.ginko/context/modules/`, indexed separately
- **ADRs**: In `docs/adr/`, manually linked via markdown references
- **PRDs**: In `docs/PRD/`, disconnected from ADRs and modules
- **Sessions**: In `.ginko/sessions/`, no discoverability of created knowledge

**Pain Points:**
- ❌ "What modules are related to authentication?" → Browse 100+ files manually
- ❌ "Which ADRs implement PRD-006?" → Manual grep + read multiple files
- ❌ "Is this ADR fully implemented?" → Search code, modules, check external work tracking
- ❌ "What decisions support this code?" → Search ADRs, hope for markdown links
- ❌ "What was discovered in last session?" → Read session log, no structured access

### Knowledge Discovery Graph
**Single Source of Truth:** All knowledge (git-native) + external work references (integration)

**Powerful Queries:**
- ✅ `adrImplementation(38)` → Shows related modules, external work (Linear), implementation status
- ✅ `nodesByTag("auth")` → Returns 8 modules, 3 ADRs, 2 PRDs instantly
- ✅ `prdProgress("PRD-006")` → 3/5 ADRs accepted, links to modules and external work
- ✅ `nodeGraph("ADR-038", depth=2)` → Visual graph of knowledge connections
- ✅ `sessionKnowledge("today")` → 2 modules created, 1 ADR proposed, 3 external items referenced

**Emergent Insights:**
- **Impact Analysis**: "If I deprecate ADR-021, what breaks?" → Query `references(ADR-021)`
- **Knowledge Gaps**: "PRD-006 has no related modules" → Opportunity to capture learnings
- **Implementation Tracking**: "ADR-038 mentioned in 5 sessions" → Understand evolution
- **Session Value**: "Today's session created 3 knowledge artifacts" → Productivity metrics
- **Team Alignment**: "Everyone working on 'auth' sees same context" → Shared understanding

**AI Partner Benefits:**
- **Context Awareness**: AI automatically loads relevant ADRs/modules when working on related code
- **Relationship Navigation**: "This code relates to ADR-038" → AI reads ADR + related modules
- **Proactive Suggestions**: "You might want to review pattern-jwt-refresh for this work"
- **Knowledge Discovery**: AI finds patterns/gotchas without manual searching
- **Session Continuity**: AI sees what knowledge was created in previous sessions, builds on it
- **Cross-Model Portability**: Same knowledge graph works with Claude, GPT, Gemini, local models

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

### Strategic Context
- **[Strategic Vision 2025](../strategy/STRATEGIC-VISION-2025.md)** - Cloud-first platform strategy, market positioning
- **[ADR-040](./ADR-040-work-tracking-integration-strategy.md)** - Work tracking integration (complements knowledge graph)

### Related ADRs
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

### Knowledge Discovery Performance
1. **Discovery Time**: Reduce "find relevant knowledge" from 2-5 minutes (manual) to <1 second (graph query)
2. **Context Relevance**: AI loads 3-5 relevant knowledge items on 80%+ of sessions
3. **Query Performance**: Graph queries complete in <50ms for 1000+ nodes

### AI Co-Authorship & Quality
4. **AI Co-Authorship**: 30%+ of context modules created by AI during sessions
5. **Zero Documentation Drift**: Knowledge updated in same commit as related code 90%+ of the time
6. **Knowledge Completeness**: 80%+ of ADRs have related context modules

### Cross-Model Portability
7. **Vendor Neutrality**: Graph works identically with Claude, GPT, Gemini, and local models
8. **Git-Native Integrity**: 100% of knowledge recoverable from git history

### Team Adoption
9. **Query Adoption**: 5+ knowledge queries per session via `ginko knowledge` commands
10. **Team Satisfaction**: Survey shows improved knowledge discovery and reduced context switching

---

**Proposed by:** Chris Norton & Claude (Session: 2025-10-24)
**Decision Date:** TBD (awaiting review)
**Implementation Start:** TBD
