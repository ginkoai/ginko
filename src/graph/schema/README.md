# Neo4j Knowledge Graph Schema

**Version**: 1.0.0
**Status**: Complete
**Last Updated**: 2025-10-28

## Overview

Complete schema implementation for Ginko's AI-first knowledge graph platform. Enables sub-100ms context loading via graph queries and semantic relationships.

## Schema Components

### Node Types (7 total)

1. **ADR** - Architecture Decision Records
2. **PRD** - Product Requirements Documents
3. **Pattern** - Reusable development patterns
4. **Gotcha** - Known pitfalls and traps
5. **Session** - Development session tracking
6. **CodeFile** - Source code file references
7. **ContextModule** - Team conventions and practices

### Constraints (7 total)

Each node type has a unique ID constraint for data integrity.

### Indexes (39 total)

- **Full-text indexes**: 7 (one per node type for content search)
- **Range indexes**: 30 (optimized for filtering and sorting)
- **Multi-tenancy**: All nodes indexed on `project_id`
- **Temporal**: Sessions indexed on `started_at` for timeline queries
- **Specialized**: Gotcha `hit_count`, Pattern `confidence`, etc.

### Relationships (16 types)

**Semantic Relationships:**
- `IMPLEMENTS` - ADR implements PRD requirements
- `REFERENCES` - Knowledge builds on knowledge
- `SIMILAR_TO` - AI-computed similarity links
- `CONFLICTS_WITH` - Surface contradictions

**Implementation Relationships:**
- `REALIZED_BY` - Decisions live in code
- `EXHIBITS_PATTERN` - Code demonstrates pattern

**Temporal Relationships:**
- `CREATED` - Session created artifact
- `MODIFIED` - Session modified artifact
- `DISCOVERED` - Session discovered pattern/gotcha
- `VALIDATED` - Session validated pattern
- `ENCOUNTERED` - Session hit gotcha
- `LOADED_CONTEXT` - Context used in session

**Learning Relationships:**
- `LEARNED_FROM` - Pattern extracted from session
- `APPLIES_TO` - Pattern applies to code/decision
- `MITIGATED_BY` - Gotcha mitigated by pattern
- `SOLVED_SIMILAR_PROBLEM` - Similar session solutions

## Migration Files

Run migrations in order:

```bash
npm run graph:setup
# or
npx tsx src/graph/scripts/setup-schema.ts
```

### Migration Sequence

1. `001-initial-schema.cypher` - ADR and PRD nodes
2. `002-pattern-gotcha-nodes.cypher` - Pattern and Gotcha nodes
3. `003-session-codefile-nodes.cypher` - Session and CodeFile nodes
4. `004-contextmodule-nodes.cypher` - ContextModule nodes
5. `005-semantic-relationships.cypher` - Semantic relationship docs
6. `006-temporal-relationships.cypher` - Temporal relationship docs

All migrations are idempotent and safe to re-run.

## Performance Characteristics

- **Context Loading**: <100ms target for 5 ADRs + 3 Patterns + 2 Gotchas
- **Full-Text Search**: <50ms for single-word queries
- **Graph Traversal**: 2-3 hops in <100ms
- **Multi-Tenancy**: Efficient project_id filtering via indexes

## Testing

Run comprehensive schema tests:

```bash
npx tsx src/graph/scripts/test-full-schema.ts
```

Tests include:
- ✓ All 7 node types creation
- ✓ Sample relationships creation
- ✓ Complex multi-hop queries
- ✓ Full-text search validation
- ✓ Constraint enforcement

## Usage Examples

### Context Loading Query

```cypher
// Load relevant context for a task
CALL db.index.fulltext.queryNodes('adr_fulltext', $query)
YIELD node, score
WHERE node.project_id = $projectId AND score > 0.7
RETURN node
ORDER BY score DESC
LIMIT 10
```

### Timeline Query

```cypher
// Session timeline for a topic
MATCH (s:Session {project_id: $projectId})
WHERE any(tag IN s.tags WHERE tag = $topic)
WITH s ORDER BY s.started_at ASC
MATCH (s)-[r:CREATED|MODIFIED|DISCOVERED]->(n)
RETURN s.started_at, type(r), n
```

### Pattern Discovery

```cypher
// Find validated patterns from sessions
MATCH (p:Pattern)<-[:VALIDATED]-(s:Session)
WHERE p.confidence > 0.8
RETURN p, count(s) as validation_count
ORDER BY validation_count DESC
```

## Next Steps

1. **Embeddings Pipeline**: Add vector embeddings to nodes
2. **Similarity Relationships**: Compute SIMILAR_TO links
3. **Data Ingestion**: Import existing ADRs/PRDs from ginko repo
4. **Query Optimization**: Profile and optimize common queries
5. **Background Jobs**: Pattern extraction and similarity computation

## References

- [Schema Design Doc](../../docs/infrastructure/neo4j-schema.md)
- [ADR-039: Graph-Based Context Discovery](../../docs/adr/ADR-039-graph-based-context-discovery.md)
- [Neo4j Client](../neo4j-client.ts)
