# Graph Relationship Taxonomy

**Updated**: 2025-11-25
**EPIC**: EPIC-002 AI-Native Sprint Graphs
**Status**: Sprint 2 Complete (80%)

## Overview

Ginko's knowledge graph uses semantic relationships to provide AI partners with explicit guidance rather than requiring inference from flat task lists.

## Relationship Categories

### Tier 1: Actionable Context (Sprint 1)

```cypher
// Sprint → Task navigation
(Sprint)-[:CONTAINS]->(Task)
(Sprint)-[:NEXT_TASK]->(Task)      // First incomplete task

// Task → File attention direction
(Task)-[:MODIFIES]->(File)         // 70% faster file discovery

// Task → ADR constraint awareness
(Task)-[:MUST_FOLLOW]->(ADR)       // Architectural constraints
```

### Tier 2: Pattern & Constraint Library (Sprint 2)

```cypher
// Task → Pattern reuse guidance
(Task)-[:APPLIES_PATTERN]->(Pattern)    // "Use retry pattern"

// Pattern → File example location
(Pattern)-[:APPLIED_IN]->(File)         // "See file.ts for example"

// Task → Gotcha avoidance
(Task)-[:AVOID_GOTCHA]->(Gotcha)        // "Watch out for timer issue"
```

### Tier 3: Strategic Context (Sprint 3 - Planned)

```cypher
// Problem grounding
(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)

// Dependency tracking
(Task)-[:DEPENDS_ON]->(Task)

// Blocker awareness
(Sprint)-[:BLOCKED_BY]->(Blocker)
```

## Node Types

### Core Nodes

| Node | Description | Key Properties |
|------|-------------|----------------|
| Sprint | Development sprint | id, name, goal, progress, startDate, endDate |
| Task | Sprint task | id, title, status, priority, effort, files |
| File | Source file | id, path, status |
| ADR | Architecture Decision Record | id, title, status |

### Context Module Nodes

| Node | Description | Key Properties |
|------|-------------|----------------|
| Pattern | Reusable code pattern | id, category, title, content |
| Gotcha | Pitfall/trap to avoid | id, category, severity, symptom, cause, solution |
| ContextModule | Generic knowledge node | id, category, title, content, priority |

**Category values for ContextModule**: `pattern`, `gotcha`, `decision`, `discovery`

## Relationship Properties

### MUST_FOLLOW (Task → ADR)
```json
{
  "type": "MUST_FOLLOW",
  "source": "sprint_definition",
  "extracted_at": "2025-11-25T01:00:00Z"
}
```

### APPLIES_PATTERN (Task → Pattern)
```json
{
  "type": "APPLIES_PATTERN",
  "source": "sprint_definition",
  "extracted_at": "2025-11-25T01:00:00Z"
}
```

### APPLIED_IN (Pattern → File)
```json
{
  "type": "APPLIED_IN",
  "context": "Referenced in task TASK-1",
  "extracted_at": "2025-11-25T01:00:00Z"
}
```

### AVOID_GOTCHA (Task → Gotcha)
```json
{
  "type": "AVOID_GOTCHA",
  "source": "sprint_definition",
  "extracted_at": "2025-11-25T01:00:00Z"
}
```

## Extraction Patterns

### ADR References
Extracted from sprint task sections:
- `ADR-002`, `ADR-043` → Creates MUST_FOLLOW relationship

### Pattern References
Extracted via regex patterns:
- `use pattern from file.ts` → Pattern linked to file
- `retry-pattern`, `event-queue-pattern` → Explicit pattern names

### Gotcha References
Extracted via regex patterns:
- `avoid gotcha: timer keeps process alive`
- `watch out for async cleanup`
- `timer-gotcha`, `async-gotcha` → Explicit gotcha names

## API Endpoints

### Sprint Sync
`POST /api/v1/sprint/sync`
- Parses sprint markdown
- Creates all nodes and relationships
- Returns node/relationship counts

### Task Constraints
`GET /api/v1/task/:id/constraints`
- Returns ADRs the task must follow
- Performance: ~650ms (infrastructure-bound)

### Knowledge Nodes (Generic)
`POST /api/v1/knowledge/nodes` - Create any node type
`GET /api/v1/knowledge/nodes?type=Pattern` - List by type

## Schema Migrations

| Migration | Purpose |
|-----------|---------|
| 001-initial-schema.cypher | Core constraints |
| 002-pattern-gotcha-nodes.cypher | Pattern/Gotcha indexes |
| 004-contextmodule-nodes.cypher | ContextModule indexes |
| 005-semantic-relationships.cypher | Relationship documentation |
| 008-sprint-task-indexes.cypher | Sprint/Task performance |

## Related Documents

- [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- [ADR-002: AI-Optimized File Discovery](../adr/ADR-002-ai-readable-code-frontmatter.md)
- [ADR-033: Context Pressure Mitigation](../adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-043: Event-Based Context Loading](../adr/ADR-043-event-based-context-loading.md)
