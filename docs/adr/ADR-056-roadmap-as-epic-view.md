---
type: decision
status: proposed
updated: 2026-01-03
tags: [roadmap, epic, product-management, graph, strategic-planning]
related: [ADR-052-unified-entity-naming-convention.md, ADR-054-knowledge-editing-architecture.md]
priority: high
audience: [developer, ai-agent, stakeholder]
estimated-read: 5-min
dependencies: []
---

# ADR-056: Roadmap as Epic View (No Separate Node)

**Status:** Proposed
**Date:** 2026-01-03
**Authors:** Chris Norton, Claude
**Reviewers:** —

## Context

### Problem Statement

Ginko needs a way to represent product roadmaps—strategic, time-based views of planned work. The question is whether to introduce a new `Roadmap` node type or model roadmaps as a view over existing Epic nodes.

### Business Context

Roadmaps serve multiple stakeholders:
- **Product teams** need to track committed vs exploratory work
- **Customers** want visibility into upcoming features
- **Leadership** needs progress tracking and strategic alignment

A roadmap is inherently visionary and aspirational—it shows direction, not promises. Dates are expressed as quarters (e.g., Q1-2026), not specific dates, reflecting the uncertainty of long-term planning.

### Technical Context

The current graph model includes:
- `Project` nodes (one per repository)
- `Epic` nodes (strategic work items)
- `Sprint` nodes (time-boxed execution)
- `Task` nodes (atomic work items)

The hierarchy is: Epic → Sprint → Task, where Epic defines WHAT and Sprint defines WHEN.

### Key Requirements

1. **One roadmap per project** (1:1 relationship)
2. **Coarse granularity**: Show Epics only, not Sprints/Tasks/Bugs
3. **Commitment tracking**: Distinguish committed work from exploratory ideas
4. **Temporal organization**: Quarter-based start/end dates (Q1-2026 format)
5. **Status visibility**: Track not_started → in_progress → completed
6. **History tracking**: Changelog for date/status changes
7. **Public curation**: External roadmaps are curated exports, not live views

## Decision

### Chosen Solution

**Model the roadmap as a query-based view over Epic nodes, not as a separate node type.**

A roadmap is a lens, not an entity. The question "What's on our roadmap?" translates to: "What Epics have we committed to, organized by time?"

```cypher
// Roadmap query
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.commitment_status IN ['committed', 'in_progress', 'completed']
RETURN e ORDER BY e.target_start_quarter
```

### Implementation Approach

Extend the `Epic` node with roadmap-specific properties rather than creating a new node type.

## Architecture

### Data Model Changes

Epic nodes gain the following properties:

```typescript
interface EpicRoadmapProperties {
  // Commitment tracking
  commitment_status: 'uncommitted' | 'committed';

  // Execution status
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';

  // Temporal planning (only valid when committed)
  target_start_quarter?: string;  // "Q1-2026"
  target_end_quarter?: string;    // "Q2-2026"

  // Visibility control
  roadmap_visible: boolean;  // false = internal/tech-debt, hidden from public views

  // Change history
  changelog: ChangelogEntry[];
}

interface ChangelogEntry {
  timestamp: string;      // ISO 8601
  field: string;          // "target_end_quarter", "commitment_status", etc.
  from: string | null;    // Previous value
  to: string;             // New value
  reason?: string;        // Optional explanation
}
```

### Validation Rules

```typescript
// Uncommitted items cannot have dates
if (epic.commitment_status === 'uncommitted') {
  if (epic.target_start_quarter || epic.target_end_quarter) {
    throw new ValidationError('Uncommitted items cannot have target dates');
  }
}

// Committed items should not extend beyond 2 years
if (epic.commitment_status === 'committed' && epic.target_end_quarter) {
  const maxQuarter = getCurrentQuarter().add(8, 'quarters'); // ~2 years
  if (parseQuarter(epic.target_end_quarter) > maxQuarter) {
    warn('Committed work extends beyond 2-year horizon');
  }
}
```

### Quarter Format

```typescript
// Format: "Q{1-4}-{YYYY}"
const QUARTER_REGEX = /^Q[1-4]-\d{4}$/;

function parseQuarter(q: string): { year: number; quarter: number } {
  const [qNum, year] = q.split('-');
  return { year: parseInt(year), quarter: parseInt(qNum[1]) };
}

function compareQuarters(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  return (pa.year * 4 + pa.quarter) - (pb.year * 4 + pb.quarter);
}
```

### Integration Points

**Dashboard (Primary Interface)**
- Visual canvas for arranging Epics by quarter
- Drag-and-drop to change dates
- Toggle commitment status
- Filter by status, tags, visibility
- Export curated public roadmap

**CLI (Read-Only View)**
```bash
ginko roadmap                    # Show committed epics by quarter
ginko roadmap --all              # Include uncommitted items
ginko roadmap --status completed # Filter by status
```

**Graph Queries**
```cypher
// All roadmap items for a project
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.roadmap_visible = true
RETURN e ORDER BY e.target_start_quarter

// Uncommitted ideas (backlog)
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.commitment_status = 'uncommitted'
RETURN e

// In-progress work
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.roadmap_status = 'in_progress'
RETURN e
```

## Alternatives Considered

### Option 1: Separate Roadmap Node

**Description:** Create a `Roadmap` node type with `CONTAINS` relationships to Epics.

```
Project ──HAS_ROADMAP──> Roadmap ──CONTAINS──> Epic
```

**Pros:**
- Explicit container for roadmap-level metadata
- Could support multiple roadmaps per project (public vs internal)
- Clear relationship structure

**Cons:**
- Additional node type and relationships to manage
- Roadmap metadata is sparse (mostly just a container)
- Multiple roadmaps per project violates stated requirement

**Decision:** Rejected. The 1:1 constraint and sparse metadata make this unnecessary complexity.

### Option 2: RoadmapItem Join Node

**Description:** Create a `RoadmapItem` node between Roadmap and Epic to hold planning metadata.

```
Roadmap ──CONTAINS──> RoadmapItem ──REFERENCES──> Epic
```

**Pros:**
- Separates planning metadata from execution metadata
- Same Epic could appear differently on multiple roadmaps

**Cons:**
- Most complex option
- Violates 1:1 constraint
- Duplicates Epic identity

**Decision:** Rejected. Over-engineered for current requirements.

## Consequences

### Positive Impacts

- **Simpler schema**: No new node types
- **Query-based flexibility**: Roadmap views can be customized per-user
- **Single source of truth**: Epic properties are authoritative
- **Natural fit**: Aligns with "graph as truth, UI as lens" philosophy

### Negative Impacts

- **Limited roadmap metadata**: No place for roadmap-level vision statement
  - *Mitigation*: Use Project description or curated export metadata
- **All-or-nothing visibility**: Epic is either on roadmap or not
  - *Mitigation*: `roadmap_visible` boolean handles internal vs public

### Migration Strategy

1. Add new properties to Epic schema with defaults:
   - `commitment_status`: 'uncommitted'
   - `roadmap_status`: 'not_started'
   - `roadmap_visible`: true
   - `changelog`: []
2. Existing Epics remain unchanged (uncommitted, no dates)
3. Dashboard gains roadmap view components
4. CLI gains `ginko roadmap` command

## Implementation Details

### Technical Requirements

- Neo4j schema update for Epic properties
- Dashboard: New roadmap canvas component
- CLI: New `roadmap` command
- Validation middleware for commitment/date rules

### Security Considerations

- `roadmap_visible` flag controls public API exposure
- Curated exports should strip internal Epics

### Performance Implications

- Roadmap queries are simple property filters—minimal impact
- Changelog arrays could grow; consider pruning strategy for entries > 2 years old

## Monitoring and Success Metrics

### Success Criteria

- Teams can visualize committed work by quarter
- Uncommitted items are clearly separated
- Date changes are tracked in changelog
- Public roadmap exports exclude internal work

### Failure Criteria

- Schema changes break existing Epic workflows
- Changelog arrays grow unbounded
- Users confuse commitment_status with roadmap_status

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Changelog arrays grow too large | Low | Medium | Prune entries older than 2 years |
| Confusion between commitment and status | Medium | Medium | Clear UI labels, validation messages |
| Need for multiple roadmaps later | Medium | Low | Can revisit if requirement emerges |

## References

### Related ADRs
- [ADR-052: Unified Entity Naming Convention](ADR-052-unified-entity-naming-convention.md)
- [ADR-054: Knowledge Editing Architecture](ADR-054-knowledge-editing-architecture.md)

### Code References
- Epic schema: `packages/cli/src/types/graph.ts` (to be updated)
- Graph queries: `dashboard/src/lib/graph-queries.ts` (to be created)

---

**Update History**

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-03 | Chris Norton, Claude | Initial draft from collaborative design session |
