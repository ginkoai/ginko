# ADR-059: Maintenance Epics

## Status
Accepted

## Context

Ginko adopted Epic and Sprint terminology from agile practices, but Human+AI collaboration changes the dynamics:

- **Traditional agile**: Work items (Epic, Story, Task) are distinct from time containers (Sprint, PI)
- **Human+AI collaboration**: Planning overhead is minimized because execution is fast and rework cost is low

However, we still need hierarchy for organization and cognitive scaffolding. The principle **"Plan the work; work the plan"** keeps AI partners effective by providing traceable context.

### The Problem

Ad-hoc work (bug fixes, polish, minor enhancements) was being created as orphan sprints with `adhoc_YYMMDD` IDs. This breaks:

1. **Traceability** - No epic context means AI partners lack the "why"
2. **Visibility** - Ad-hoc work scattered across time-stamped IDs
3. **Tooling** - `ginko epic --sync` only syncs epic-associated sprints

### Design Constraint

**All sprints must be contained within an epic.** This ensures:
- Every task traces to a sprint, epic, and ultimately the project charter
- AI partners have full context hierarchy for decision-making
- No orphaned work breaks the knowledge graph

## Decision

Introduce **Maintenance Epics** as a distinct category for ongoing operational work.

### Epic Categories

| Category | Purpose | Roadmap Visibility | Decision Factors |
|----------|---------|-------------------|------------------|
| `feature` | Strategic work, new capabilities | Visible by default | Required (Now/Next/Later, confidence) |
| `maintenance` | Bug fixes, polish, minor enhancements | Hidden by default | Not required |

### Maintenance Epic Naming Convention

```
EPIC-{NNN}: {Component} Maintenance {Quarter}
```

**Examples:**
- `EPIC-014: Dashboard Maintenance Q1-2026`
- `EPIC-015: CLI Maintenance Q1-2026`
- `EPIC-016: Infrastructure Maintenance Q1-2026`

### Sprint Naming Within Maintenance Epics

Standard convention applies:
```
e{NNN}_s{NN}_t{NN}
```

Example: `e014_s01_t01` = Dashboard Maintenance Q1-2026, Sprint 1, Task 1

### Creation Strategy: Lazy (On First Need)

Maintenance epics are created when first needed, not proactively:

```
User: Let's start a maintenance sprint for Graph page changes
Ginko: No Dashboard maintenance epic exists for Q1-2026. Creating...
✓ Created: EPIC-014: Dashboard Maintenance Q1-2026
✓ Created: e014_s01 - what are the tasks?
```

**Rationale:**
- Aligns with just-in-time planning
- No empty epics cluttering the system
- First-use friction is ~5 seconds, happens once per component per quarter
- Forces intentional component naming

### Schema Changes

Epic node requires:
```typescript
interface Epic {
  id: string;
  title: string;
  category: 'feature' | 'maintenance';  // NEW
  // ... existing fields

  // Only for feature epics:
  lane?: 'now' | 'next' | 'later' | 'done' | 'dropped';
  commitmentFactors?: CommitmentFactors;
}
```

### Roadmap Query Filter

Default roadmap view excludes maintenance:
```cypher
MATCH (e:Epic)
WHERE e.category <> 'maintenance' OR e.category IS NULL
RETURN e
```

Toggle in UI: "Show maintenance epics"

## Consequences

### Positive
- All work is traceable (no orphan sprints)
- Clear separation between strategic and operational work
- Roadmap stays focused on what matters to stakeholders
- Maintenance effort is visible and measurable per component
- AI partners always have full context hierarchy

### Negative
- Slightly more structure than pure ad-hoc approach
- Need to decide component boundaries (Dashboard vs Graph Explorer?)
- Quarterly rollover requires creating new maintenance epics

### Neutral
- Deprecates `adhoc_YYMMDD` naming convention (existing can be migrated or left as historical)

## Implementation

1. Add `category` field to Epic schema
2. Update roadmap queries to filter by category
3. Update `ginko epic` to support `--maintenance` flag
4. Update dashboard Epic creation UI with category selector
5. Document component taxonomy (Dashboard, CLI, Infrastructure, Marketing, etc.)

## References

- ADR-052: Entity Naming Convention (defines hierarchy)
- ADR-056: Product Roadmap (defines epic structure)
- CLAUDE.md: "Plan the work; work the plan" principle
