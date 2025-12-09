# ADR-052: Unified Entity Naming Convention

## Status
Accepted

## Date
2025-12-09

## Context

As ginko scales to support multiple AI workers collaborating on the same project, we need a consistent naming convention for graph entities (epics, sprints, tasks) that:

1. **Works for both humans and AI** - Readable in raw format, parseable programmatically
2. **Maintains sortability** - Alphabetical sorting produces logical ordering
3. **Ensures uniqueness** - No collisions within a project scope
4. **Supports traceability** - Clear hierarchy from epic → sprint → task
5. **Handles ad-hoc work** - System maintenance and unplanned work needs tracking

### Current Problem

The graph contains 33+ Task nodes with inconsistent naming:
- Auto-generated timestamps: `task_1_1763747777860`
- Skeleton stubs: `TASK-5` (null title/status)
- Epic-prefixed: `task_e002_1_1764028709213`

This inconsistency will compound as we add workers. The graph should be the single source of truth, but local sprint files and graph nodes are diverging.

## Decision

### Standard Entity ID Format

```
{scope}_{sequence}
```

Where scope builds hierarchically:

| Entity | Format | Example | Max |
|--------|--------|---------|-----|
| Epic | `e{NNN}` | `e001` | 999 |
| Sprint | `e{NNN}_s{NN}` | `e001_s01` | 99 per epic |
| Task | `e{NNN}_s{NN}_t{NN}` | `e001_s01_t01` | 99 per sprint |

### Padding Rules

- **Epics:** 3 digits (supports 999 epics per project)
- **Sprints:** 2 digits (supports 99 sprints per epic)
- **Tasks:** 2 digits (supports 99 tasks per sprint)

### Guard Conditions

If a sprint approaches 99 tasks, it should be split. If an epic approaches 99 sprints, consider whether it's actually multiple epics. The system SHOULD warn when:
- Task count in a sprint exceeds 20 (soft limit)
- Sprint count in an epic exceeds 10 (soft limit)

### Ad-hoc Work Convention

For unplanned work (system maintenance, bug fixes, exploratory work):

```
adhoc_{YYMMDD}_s{NN}_t{NN}
```

**Examples:**
- `adhoc_251209_s01` - First ad-hoc sprint on Dec 9, 2025
- `adhoc_251209_s01_t01` - First task in that sprint
- `adhoc_251209a_s01` - Second ad-hoc sprint same day (rare, use alpha suffix)

### Cross-Project References (Future)

When referencing entities across projects, prefix with project slug:

```
{project}_{entity_id}
```

Example: `ginko_e001_s01_t01`

Within a single graph, the project prefix is omitted (graph already scopes to project).

## Observability Anti-Pattern: Untracked Work

**Problem:** Workers may start fixing issues conversationally without creating graph entities, breaking traceability.

**Mitigation:** AI assistants should nudge users to track ad-hoc work:

```
AI: "This work is outside the scope of our current sprint.
     Shall I create an ad-hoc task to track it?"
```

**When to nudge:**
- Work begins on files not referenced in current sprint
- Bug fixes or system maintenance emerges mid-session
- Scope creep detected (work expanding beyond current task)

**Preserving flow:** The nudge should be lightweight - a single question, not a blocking workflow. If the user declines, proceed but note in session log.

## Implementation

### Phase 1: Convention Adoption
1. Update sprint sync to generate IDs in new format
2. Update local sprint file template to use new format
3. Add validation for ID format in graph API

### Phase 2: Migration
1. Create mapping from old IDs to new format
2. Update existing graph nodes (or mark deprecated)
3. Re-sync current sprint with new IDs

### Phase 3: Tooling
1. Add guard condition warnings to `ginko sprint` commands
2. Add ad-hoc work detection to `ginko start`
3. Update CLAUDE.md with nudge instructions

## Examples

### Epic 005 (Market Readiness) with New Convention

```
Epic:   e005
Sprint: e005_s01 (Product Positioning + Dashboard Foundation)
Tasks:
  e005_s01_t01 - Define Core Tagline and Product Description
  e005_s01_t02 - Indie Developer Elevator Pitch
  e005_s01_t03 - SWE Leader Elevator Pitch
  e005_s01_t04 - Component Branding Guide
  e005_s01_t05 - GitHub Open-Source Presence Refinement
  e005_s01_t06 - Dashboard Visual Audit
  e005_s01_t07 - Dashboard Design Token Alignment
  e005_s01_t08 - Dashboard Layout Refresh
  e005_s01_t09 - SWE Leader Infographic Concepts
  e005_s01_t10 - Sprint 1 Documentation and Sync
```

### Ad-hoc Sprint for This ADR Work

```
Sprint: adhoc_251209_s01 (Unified Naming Convention Implementation)
Tasks:
  adhoc_251209_s01_t01 - Draft ADR-052 (this document)
  adhoc_251209_s01_t02 - Update CLAUDE.md with ad-hoc nudge
  adhoc_251209_s01_t03 - Update sprint sync to use new IDs
  adhoc_251209_s01_t04 - Migrate existing graph entities
  adhoc_251209_s01_t05 - Validate sync round-trip
```

## Consequences

### Positive
- **Predictable IDs** - Any collaborator can reference `e005_s01_t03` unambiguously
- **Sortable** - `e005_s01_t02` naturally sorts before `e005_s01_t10`
- **Self-documenting** - ID reveals hierarchy without lookup
- **AI-friendly** - Easy to parse, validate, and generate
- **Human-friendly** - Compact but readable

### Negative
- **Migration required** - Existing 33+ tasks need updating
- **Learning curve** - Team needs to adopt new convention
- **Rigidity** - Less flexibility than auto-generated IDs

### Neutral
- **Character count** - 15-21 chars for task IDs (acceptable)
- **Ad-hoc tracking** - Adds friction but improves observability

## Related

- ADR-002: AI-Readable Code Frontmatter
- ADR-033: Context Pressure Mitigation Strategy
- ADR-043: Event-Based Context Loading
