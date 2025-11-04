# Neo4j Knowledge Graph Schema

**Purpose**: AI-first development context platform
**Optimize for**: Fast context synthesis, semantic search, pattern recognition
**NOT optimizing for**: Manual curation, human browsing UI

## Design Principles

1. **AI Context Loading**: Schema enables `ginko start` to synthesize relevant context in <100ms
2. **Semantic Relationships**: Graph captures meaning, not just hierarchy
3. **Temporal Knowledge**: Track what was learned when, by whom
4. **Cross-Project Discovery**: Enable "how did Team A solve X" queries
5. **Vector Embeddings**: All text nodes have embeddings for similarity search

---

## Core Node Types

### Knowledge Artifacts (Persistent)

#### ADR (Architecture Decision Record)
**Purpose**: Capture architectural decisions with context

```cypher
(:ADR {
  id: string,              // "ADR-039"
  title: string,           // "Graph-based Context Discovery"
  status: string,          // "accepted" | "proposed" | "deprecated" | "superseded"
  decision_date: datetime,
  content: string,         // Full markdown content
  summary: string,         // AI-generated 2-3 sentence summary
  embedding: float[],      // Vector embedding for similarity search
  alternatives: [string],  // Alternatives considered
  consequences: [string],  // Key trade-offs
  tags: [string],          // ["auth", "database", "scalability"]
  project_id: string,      // Multi-tenancy
  created_at: datetime,
  updated_at: datetime
})
```

**Indexes**:
- `CREATE INDEX adr_id FOR (a:ADR) ON (a.id)`
- `CREATE INDEX adr_project FOR (a:ADR) ON (a.project_id)`
- `CREATE TEXT INDEX adr_content FOR (a:ADR) ON (a.content)`
- `CREATE VECTOR INDEX adr_embedding FOR (a:ADR) ON (a.embedding)`

---

#### PRD (Product Requirements Document)
**Purpose**: What we're building and why

```cypher
(:PRD {
  id: string,              // "PRD-010"
  title: string,           // "Cloud-First Knowledge Graph Platform"
  status: string,          // "draft" | "approved" | "in_progress" | "completed"
  priority: string,        // "critical" | "high" | "medium" | "low"
  content: string,         // Full markdown
  summary: string,         // AI-generated summary
  embedding: float[],
  problem: string,         // What problem does this solve
  success_metrics: [string],
  tags: [string],
  project_id: string,
  created_at: datetime,
  updated_at: datetime
})
```

---

#### Pattern (Extracted Learning)
**Purpose**: Reusable knowledge discovered during development

```cypher
(:Pattern {
  id: string,              // "PATTERN-001"
  title: string,           // "Optimal bcrypt rounds for production"
  category: string,        // "performance" | "security" | "architecture" | "testing"
  content: string,         // "Use bcrypt rounds=11 for balance of security and speed"
  context: string,         // When/where this applies
  examples: [string],      // Code examples
  confidence: float,       // 0.0-1.0 (based on # of validations)
  embedding: float[],
  tags: [string],
  project_id: string,
  discovered_at: datetime,
  last_validated: datetime
})
```

**Key Feature**: Patterns are extracted by AI from sessions, then validated by repeated application.

---

#### Gotcha (Pitfall/Trap)
**Purpose**: Things that will bite you if you don't know about them

```cypher
(:Gotcha {
  id: string,              // "GOTCHA-023"
  title: string,           // "Supabase RLS doesn't apply to service_role"
  severity: string,        // "critical" | "high" | "medium" | "low"
  symptom: string,         // What you'll see if you hit this
  cause: string,           // Why it happens
  solution: string,        // How to avoid/fix
  affected_areas: [string], // ["auth", "database", "api"]
  embedding: float[],
  tags: [string],
  project_id: string,
  discovered_at: datetime,
  hit_count: int           // How many times devs encountered this
})
```

---

#### Session (Development Session)
**Purpose**: Temporal snapshot of work done, context used, learnings captured

```cypher
(:Session {
  id: string,              // "session-2025-10-27T16-41-31-514Z"
  user_email: string,      // "xtophr@gmail.com"
  task_id: string?,        // "LIN-123" or "TASK-018" (optional external ref)
  task_title: string?,     // "Graph DB Evaluation"
  intent: string,          // What was the goal? (AI-extracted)
  outcome: string,         // What was achieved? (AI-extracted)
  insights: [string],      // Key learnings from session
  files_modified: [string],
  context_loaded: [string], // Which ADRs/PRDs were loaded
  embedding: float[],       // For "find similar sessions"
  tags: [string],
  project_id: string,
  started_at: datetime,
  ended_at: datetime,
  duration_minutes: int,
  git_branch: string?,
  git_commits: [string]?
})
```

**Key Feature**: Sessions are the temporal lens through which knowledge evolves.

---

#### CodeFile (Source Code Reference)
**Purpose**: Link knowledge to actual code

```cypher
(:CodeFile {
  id: string,              // sha256 hash of path
  path: string,            // "src/auth/oauth.ts"
  file_type: string,       // "component" | "api-route" | "utility" | etc
  language: string,        // "typescript" | "python" | "rust"
  summary: string,         // AI-generated summary of purpose
  complexity: string,      // "low" | "medium" | "high"
  tags: [string],          // From frontmatter
  embedding: float[],
  project_id: string,
  last_modified: datetime,
  git_sha: string?
})
```

---

#### ContextModule (Team Conventions)
**Purpose**: How we work (conventions, patterns, practices)

```cypher
(:ContextModule {
  id: string,              // "module-auth-patterns"
  title: string,           // "Authentication Patterns"
  category: string,        // "conventions" | "patterns" | "workflows"
  content: string,         // Full markdown
  summary: string,
  priority: string,        // "critical" | "high" | "medium" | "low"
  embedding: float[],
  tags: [string],
  project_id: string,
  created_at: datetime,
  updated_at: datetime
})
```

---

## Relationships (Optimized for AI Queries)

### Semantic Relationships

#### IMPLEMENTS
**Purpose**: How decisions realize requirements
```cypher
(ADR)-[:IMPLEMENTS {
  description: string?,     // How this ADR implements PRD
  completeness: float?      // 0.0-1.0 (% of PRD addressed)
}]->(PRD)
```

#### REFERENCES
**Purpose**: Knowledge builds on other knowledge
```cypher
(ADR)-[:REFERENCES {
  context: string?,         // Why this reference matters
  relationship: string?     // "builds_on" | "conflicts_with" | "supersedes"
}]->(ADR)
```

#### SIMILAR_TO
**Purpose**: Enable "find related" queries (AI-computed)
```cypher
(ADR)-[:SIMILAR_TO {
  similarity: float,        // 0.0-1.0 (cosine similarity of embeddings)
  computed_at: datetime
}]->(ADR)

// Same for Pattern, Gotcha, Session
```

#### CONFLICTS_WITH
**Purpose**: Surface contradictions
```cypher
(ADR)-[:CONFLICTS_WITH {
  explanation: string
}]->(ADR)
```

---

### Implementation Relationships

#### REALIZED_BY
**Purpose**: Where decisions live in code
```cypher
(ADR)-[:REALIZED_BY {
  file_section: string?,    // Which part of file
  lines: string?            // "42-89"
}]->(CodeFile)
```

#### EXHIBITS_PATTERN
**Purpose**: Code demonstrates pattern
```cypher
(CodeFile)-[:EXHIBITS_PATTERN {
  example_quality: string   // "canonical" | "good" | "antipattern"
}]->(Pattern)
```

---

### Temporal Relationships (Session-based)

#### CREATED
**Purpose**: Track when knowledge was created
```cypher
(Session)-[:CREATED {
  during_task: string?
}]->(ADR|PRD|Pattern|Gotcha)
```

#### MODIFIED
**Purpose**: Track knowledge evolution
```cypher
(Session)-[:MODIFIED {
  changes: string?,         // What changed
  reason: string?
}]->(ADR|PRD|CodeFile)
```

#### DISCOVERED
**Purpose**: When pattern/gotcha was first identified
```cypher
(Session)-[:DISCOVERED]->(Pattern|Gotcha)
```

#### VALIDATED
**Purpose**: Pattern was confirmed to work
```cypher
(Session)-[:VALIDATED {
  validation_notes: string?
}]->(Pattern)
```

#### ENCOUNTERED
**Purpose**: Dev hit a known gotcha
```cypher
(Session)-[:ENCOUNTERED]->(Gotcha)
```

#### LOADED_CONTEXT
**Purpose**: What context was synthesized for session
```cypher
(Session)-[:LOADED_CONTEXT {
  relevance_score: float    // Why this was loaded
}]->(ADR|PRD|Pattern|Gotcha|ContextModule)
```

#### WORKED_ON
**Purpose**: Historical record (task_id stored as string in Session)
```cypher
// Optional: Only if PM integration enabled
(Session)-[:WORKED_ON]->(Task {external: true, system: "linear"})
```

---

### Learning Relationships

#### LEARNED_FROM
**Purpose**: Pattern extracted from session
```cypher
(Pattern)-[:LEARNED_FROM {
  extraction_confidence: float
}]->(Session)
```

#### APPLIES_TO
**Purpose**: Where pattern is relevant
```cypher
(Pattern)-[:APPLIES_TO]->(ADR|CodeFile)
```

#### MITIGATED_BY
**Purpose**: How to avoid gotcha
```cypher
(Gotcha)-[:MITIGATED_BY]->(Pattern|ADR)
```

#### SOLVED_SIMILAR_PROBLEM
**Purpose**: Find sessions that tackled similar challenges
```cypher
(Session)-[:SOLVED_SIMILAR_PROBLEM {
  similarity: float
}]->(Session)
```

---

## Multi-Tenancy Strategy

All nodes have `project_id` property. Label-based filtering applied at query time:

```cypher
// Example: Load context for project
MATCH (a:ADR {project_id: $projectId})
WHERE a.status = 'accepted'
RETURN a
```

**Alternative**: Dynamic labels `:Project_<uuid>` on all nodes
```cypher
CREATE (a:ADR:Project_abc123 {id: "ADR-001", ...})

// Query becomes
MATCH (a:ADR:Project_abc123)
```

**Decision**: Use property-based for MVP (simpler), migrate to labels if performance requires.

---

## Vector Search Strategy

### Embeddings Pipeline

1. **On Create/Update**: Generate embedding for all text content
2. **Store**: 1536-dimensional vector (OpenAI ada-002 or equivalent)
3. **Index**: Neo4j vector index for fast similarity search

### Context Loading Query Pattern

```cypher
// Given a task description, find relevant context
CALL db.index.vector.queryNodes(
  'adr_embedding',
  10,  // top 10 results
  $taskEmbedding
) YIELD node, score
WHERE score > 0.7  // Similarity threshold
RETURN node, score
ORDER BY score DESC
```

### Similarity Relationship Maintenance

Background job (weekly):
1. Compute pairwise similarities for ADRs, Patterns, Gotchas
2. Create/update `SIMILAR_TO` relationships where similarity > 0.75
3. Prune relationships where similarity < 0.7

---

## Query Examples (What AI Needs)

### 1. Context Loading for Task
**User intent**: `ginko start --task=LIN-123 "Implement OAuth refresh tokens"`

```cypher
// Step 1: Find relevant ADRs
CALL db.index.vector.queryNodes('adr_embedding', 5, $taskEmbedding)
YIELD node AS adr, score AS adr_score
WHERE adr:ADR AND adr.project_id = $projectId AND score > 0.7

// Step 2: Find related patterns
MATCH (adr)<-[:APPLIES_TO]-(pattern:Pattern)

// Step 3: Find relevant gotchas
MATCH (gotcha:Gotcha)
WHERE any(tag IN gotcha.tags WHERE tag IN ["auth", "oauth", "tokens"])

// Step 4: Find similar sessions
CALL db.index.vector.queryNodes('session_embedding', 3, $taskEmbedding)
YIELD node AS session, score AS session_score
WHERE session:Session AND session.project_id = $projectId

// Step 5: Find code examples
MATCH (adr)-[:REALIZED_BY]->(code:CodeFile)

RETURN adr, pattern, gotcha, session, code
```

### 2. Cross-Project Knowledge Discovery
**User query**: "How did other teams implement rate limiting?"

```cypher
// Find patterns across ALL projects (if authorized)
MATCH (p:Pattern)
WHERE p.title CONTAINS "rate limiting" OR any(tag IN p.tags WHERE tag = "rate-limiting")
WITH p
MATCH (p)-[:LEARNED_FROM]->(s:Session)
MATCH (p)-[:APPLIES_TO]->(adr:ADR)
OPTIONAL MATCH (p)-[:REALIZED_BY]->(code:CodeFile)
RETURN p, s.project_id AS team, adr, code
ORDER BY p.confidence DESC
```

### 3. Find Root Cause Patterns
**User query**: "Why do our auth bugs keep happening?"

```cypher
// Find gotchas encountered multiple times
MATCH (g:Gotcha {project_id: $projectId})
WHERE g.hit_count > 2 AND any(tag IN g.tags WHERE tag = "auth")
WITH g
OPTIONAL MATCH (g)-[:MITIGATED_BY]->(solution:Pattern|ADR)
RETURN g.title, g.hit_count, g.cause, collect(solution.title) AS solutions
ORDER BY g.hit_count DESC
```

### 4. Session Timeline (What Happened When)
**User query**: "Show me what we learned about authentication over time"

```cypher
MATCH (s:Session {project_id: $projectId})
WHERE any(tag IN s.tags WHERE tag = "auth")
WITH s
OPTIONAL MATCH (s)-[:DISCOVERED]->(p:Pattern)
OPTIONAL MATCH (s)-[:CREATED]->(adr:ADR)
OPTIONAL MATCH (s)-[:ENCOUNTERED]->(g:Gotcha)
RETURN s.started_at AS when, s.user_email AS who, s.intent,
       collect(DISTINCT p.title) AS patterns_discovered,
       collect(DISTINCT adr.id) AS adrs_created,
       collect(DISTINCT g.title) AS gotchas_hit
ORDER BY s.started_at ASC
```

---

## Performance Targets

- **Context loading**: < 100ms for typical task (5 ADRs, 3 patterns, 2 gotchas, 2 sessions)
- **Vector search**: < 50ms for top-10 similar nodes
- **Cross-project query**: < 500ms for up to 100 projects
- **Session ingestion**: < 1s to process and extract patterns

## Scaling Considerations

**MVP (1-10 projects, 1K nodes)**:
- Single Neo4j instance (8GB RAM)
- Synchronous embedding generation
- In-memory vector search

**Production (100+ projects, 100K+ nodes)**:
- Neo4j clustering for read replicas
- Async embedding generation (queue-based)
- Dedicated vector search service (Pinecone/Weaviate)
- Background similarity computation

---

## Next Steps

1. **Implement Schema**: Create Cypher migration scripts
2. **Seed Data**: Import existing ADRs, PRDs from ginko repo
3. **Test Queries**: Validate context loading performance
4. **TypeScript Client**: Build abstraction layer over neo4j-driver
5. **Embedding Pipeline**: Integrate OpenAI/local embeddings

---

**Schema Version**: 1.0.0
**Updated**: 2025-10-27
**Status**: Initial design for MVP implementation
