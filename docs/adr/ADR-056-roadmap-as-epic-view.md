---
type: decision
status: accepted
updated: 2026-01-11
tags: [roadmap, epic, product-management, graph, strategic-planning, ai-native]
related: [ADR-052-unified-entity-naming-convention.md, ADR-054-knowledge-editing-architecture.md]
priority: high
audience: [developer, ai-agent, stakeholder]
estimated-read: 5-min
dependencies: []
---

# ADR-056: Roadmap as Epic View (Now/Next/Later)

**Status:** Accepted
**Date:** 2026-01-03 (Amended 2026-01-11)
**Authors:** Chris Norton, Claude
**Reviewers:** —

## Context

### Problem Statement

Ginko needs a way to represent product roadmaps—priority-based views of planned work. The question is whether to introduce a new `Roadmap` node type or model roadmaps as a view over existing Epic nodes.

### Business Context

Roadmaps serve multiple stakeholders:
- **Product teams** need to track committed vs exploratory work
- **Customers** want visibility into upcoming features
- **Leadership** needs progress tracking and strategic alignment

### AI-Native Planning Context (Amendment 2026-01-11)

Traditional quarterly planning (Q1-2026, Q2-2026) assumes work takes weeks or months. With Human+AI teams that ship work in hours and days, quarterly cycles are too slow.

**Observation:** We shipped two full sprints of EPIC-009 in a single session. The roadmap should reflect *priority order*, not calendar dates.

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
4. **Priority-based organization**: Now/Next/Later lanes instead of quarters
5. **Decision factor tracking**: Tags indicating why work is in Later
6. **Status visibility**: Track not_started → in_progress → completed
7. **History tracking**: Changelog for lane/status changes
8. **Public curation**: External roadmaps are curated exports, not live views

## Decision

### Chosen Solution

**Model the roadmap as a priority-based view over Epic nodes using Now/Next/Later lanes.**

A roadmap is a lens, not an entity. The question "What's on our roadmap?" translates to: "What Epics have we committed to, organized by priority?"

```cypher
// Roadmap query
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.roadmap_lane IN ['now', 'next']
RETURN e ORDER BY e.roadmap_lane, e.priority
```

### Now/Next/Later Model

| Lane | Definition | Commitment |
|------|------------|------------|
| **Now** | Fully planned, committed, ready for immediate implementation | Committed |
| **Next** | Committed but may require additional planning or enablers | Committed |
| **Later** | Proposed but not pulled into active development | Uncommitted |

**Lane Semantics:**

- **Now**: Work that has been fully planned, committed to, and is ready for implementation immediately. All decision factors resolved. Clear scope, architecture, and acceptance criteria.

- **Next**: Work that has been committed to, but may require additional planning or enablers before it can move to Now. Dependencies may need resolution.

- **Later**: Work that has been proposed but is not being pulled into active development due to incomplete decision factors. This is the default lane for new epics.

### Decision Factors

Epics in Later should have decision factor tags indicating what's blocking commitment:

| Tag | Description |
|-----|-------------|
| `planning` | Needs further scope definition or breakdown |
| `value` | Value proposition unclear or unvalidated |
| `feasibility` | Technical feasibility not yet assessed |
| `advisability` | Strategic fit or timing uncertain |
| `architecture` | Requires architectural decisions or ADRs |
| `design` | Needs UX/UI design work |
| `risks` | Unmitigated risks identified |
| `market-fit` | Market validation needed |
| `dependencies` | Blocked by external dependencies |

Newly-proposed epics should include the `planning` tag by default.

Each Epic in Later should have a "Decision Factors" section in its body describing the specific blockers:

```markdown
## Decision Factors

**planning**: Scope needs breakdown into sprints. Estimate: 2 planning sessions.

**architecture**: Requires decision on auth provider (see ADR-060 draft).
```

### Implementation Approach

Extend the `Epic` node with roadmap-specific properties rather than creating a new node type.

## Architecture

### Data Model Changes

Epic nodes gain the following properties:

```typescript
interface EpicRoadmapProperties {
  // Priority lane (replaces commitment_status + quarters)
  roadmap_lane: 'now' | 'next' | 'later';

  // Execution status (unchanged)
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';

  // Priority within lane (lower = higher priority)
  priority?: number;

  // Decision factors for Later items (tags)
  decision_factors?: string[];  // ['planning', 'architecture', ...]

  // Visibility control
  roadmap_visible: boolean;  // false = internal/tech-debt, hidden from public views

  // Change history
  changelog: ChangelogEntry[];
}

interface ChangelogEntry {
  timestamp: string;      // ISO 8601
  field: string;          // "roadmap_lane", "roadmap_status", etc.
  from: string | null;    // Previous value
  to: string;             // New value
  reason?: string;        // Optional explanation
}
```

### Validation Rules

```typescript
// Later items should have decision factors
if (epic.roadmap_lane === 'later') {
  if (!epic.decision_factors || epic.decision_factors.length === 0) {
    warn('Later items should have decision_factors explaining blockers');
    epic.decision_factors = ['planning']; // Default
  }
}

// Now items should have no unresolved decision factors
if (epic.roadmap_lane === 'now') {
  if (epic.decision_factors && epic.decision_factors.length > 0) {
    throw new ValidationError('Now items cannot have unresolved decision factors');
  }
}

// Newly proposed epics default to Later with planning tag
function createEpic(props: EpicProps): Epic {
  return {
    ...props,
    roadmap_lane: props.roadmap_lane || 'later',
    decision_factors: props.decision_factors || ['planning'],
    roadmap_status: 'not_started',
    roadmap_visible: true,
  };
}
```

### Integration Points

**Dashboard (Primary Interface)**
- Visual canvas with three lanes: Now, Next, Later
- Drag-and-drop to move Epics between lanes
- Decision factor tags visible on Later items
- Filter by status, tags, visibility
- Export curated public roadmap

**CLI (Read-Only View)**
```bash
ginko roadmap                    # Show Now and Next lanes
ginko roadmap --all              # Include Later items
ginko roadmap --lane now         # Show only Now
ginko roadmap --status in_progress # Filter by status
```

**Graph Queries**
```cypher
// Active roadmap (Now + Next)
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.roadmap_lane IN ['now', 'next']
  AND e.roadmap_visible = true
RETURN e ORDER BY
  CASE e.roadmap_lane WHEN 'now' THEN 0 WHEN 'next' THEN 1 END,
  e.priority

// Backlog (Later)
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE e.roadmap_lane = 'later'
RETURN e

// Items needing planning
MATCH (e:Epic)-[:PART_OF]->(p:Project {id: $projectId})
WHERE 'planning' IN e.decision_factors
RETURN e
```

## Alternatives Considered

### Option 1: Quarterly Planning (Original Design)

**Description:** Organize Epics by quarter (Q1-2026, Q2-2026, etc.)

**Pros:**
- Familiar to traditional product teams
- Aligns with fiscal planning cycles

**Cons:**
- Too slow for AI-native teams that ship in hours/days
- Creates false precision about timing
- Requires constant re-planning as quarters shift

**Decision:** Rejected in Amendment 2026-01-11. Priority-based lanes better fit AI-native velocity.

### Option 2: Separate Roadmap Node

**Description:** Create a `Roadmap` node type with `CONTAINS` relationships to Epics.

**Decision:** Rejected. The 1:1 constraint and sparse metadata make this unnecessary complexity.

### Option 3: RoadmapItem Join Node

**Description:** Create a `RoadmapItem` node between Roadmap and Epic.

**Decision:** Rejected. Over-engineered for current requirements.

## Consequences

### Positive Impacts

- **Simpler schema**: No new node types
- **Priority-focused**: Reflects actual work prioritization
- **AI-native velocity**: No arbitrary time constraints
- **Clear commitment model**: Now/Next = committed, Later = proposed
- **Decision transparency**: Tags explain why work isn't committed yet

### Negative Impacts

- **No time visibility**: Stakeholders can't see "when" only "priority"
  - *Mitigation*: For external communication, map lanes to rough timeframes
- **Requires discipline**: Teams must actively groom Later lane
  - *Mitigation*: Decision factor tags create accountability

### Migration Strategy

1. Migrate existing `commitment_status` to `roadmap_lane`:
   - `committed` → `next` (needs review for `now`)
   - `uncommitted` → `later`
2. Add `decision_factors: ['planning']` to all Later items
3. Remove `target_start_quarter` and `target_end_quarter` fields
4. Update CLI and API to use new model

## Implementation Details

### Technical Requirements

- Neo4j schema update for Epic properties
- Migration script to convert existing data
- Dashboard: Three-lane canvas component
- CLI: Updated `roadmap` command
- Validation middleware for lane rules

### Security Considerations

- `roadmap_visible` flag controls public API exposure
- Curated exports should strip internal Epics

### Performance Implications

- Roadmap queries are simple property filters—minimal impact
- Changelog arrays could grow; consider pruning strategy for entries > 2 years old

## Monitoring and Success Metrics

### Success Criteria

- Teams can visualize work by priority lane
- Decision factors provide clarity on Later items
- Lane transitions are tracked in changelog
- Public roadmap exports exclude internal work

### Failure Criteria

- Schema changes break existing Epic workflows
- Changelog arrays grow unbounded
- Confusion between roadmap_lane and roadmap_status

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Changelog arrays grow too large | Low | Medium | Prune entries older than 2 years |
| Later lane becomes dumping ground | Medium | Medium | Decision factor tags create accountability |
| Stakeholders want dates | Medium | High | Document lane-to-timeframe mapping for external comms |

## References

### Related ADRs
- [ADR-052: Unified Entity Naming Convention](ADR-052-unified-entity-naming-convention.md)
- [ADR-054: Knowledge Editing Architecture](ADR-054-knowledge-editing-architecture.md)

### Code References
- Epic schema: `packages/shared/src/types/roadmap.ts`
- CLI command: `packages/cli/src/commands/roadmap/index.ts`
- API endpoint: `dashboard/src/app/api/v1/graph/roadmap/route.ts`

---

**Update History**

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-03 | Chris Norton, Claude | Initial draft with quarterly planning |
| 2026-01-11 | Chris Norton, Claude | **Amendment:** Replace quarterly model with Now/Next/Later lanes for AI-native teams |
