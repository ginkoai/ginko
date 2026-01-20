# Session Handoff: ADR-061 & EPIC-016 - Task Assignment Architecture

**Date:** 2026-01-20
**Model:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Provider:** Anthropic
**Duration:** ~2 hours

---

## Session Summary

Designed and documented the task assignment and work tracking architecture for ginko, establishing how personal workstreams, assignment enforcement, and flow-aware nudging should work.

---

## Key Accomplishments

### 1. ADR-061: Task Assignment and Work Tracking Architecture
**File:** `docs/adr/ADR-061-task-assignment-and-work-tracking.md`
**Commit:** `f5491d6`

Established core principles:
- **Work cannot be anonymous** - Starting work requires assignment
- **Plan the work; work the plan** - Epic→Sprint→Task hierarchy as cognitive scaffolding
- **North Star: Maximize flow state** - Tracking serves flow, not the other way around
- **Flow-aware nudging** - Defer prompts during deep work, batch at natural breakpoints

Key decisions:
- Personal workstreams in `ginko start` (shows YOUR work, not team's)
- "Continue where you left off" for Next task determination
- Bulk assignment prompt at sprint start
- `ginko team status` for team visibility without bleedover
- Batch reconciliation of untracked work at handoff

### 2. EPIC-016: Personal Workstreams & Assignment
**File:** `docs/epics/EPIC-016-personal-workstreams.md`
**Commit:** `6159c5d`

4 sprints planned (27 tasks total):

| Sprint | Focus | Duration |
|--------|-------|----------|
| Sprint 1 | Personal Workstream Foundation | 1.5 weeks |
| Sprint 2 | Assignment Enforcement | 1 week |
| Sprint 3 | Team Status Command | 1 week |
| Sprint 4 | Flow-Aware Nudging | 1.5 weeks |

### 3. EPIC-015 Sprint 1 Verification
Confirmed CLI status commands are implemented and working:
- `ginko task complete/start/pause/block/show`
- `ginko sprint start/complete/pause`
- `ginko epic start/complete/pause`

### 4. Architecture Alignment Analysis
Verified EPIC-015 (infrastructure) and ADR-061/EPIC-016 (UX layer) are properly separated:
- EPIC-015 = graph-authoritative state (plumbing)
- EPIC-016 = personal workstreams & assignment (user experience)

---

## Technical Decisions

### Option A for Node Creation
When epics are created, all nodes (Epic, Sprint, Task) should be created immediately in the graph with `status: draft`. This provides:
- Full visibility in dashboard
- Queryable futures ("show planned work for Q2")
- Assignment capability before work starts
- Single source of truth (graph always reflects markdown)

### Assignment Flow
```
Sprint Start ──► Bulk assignment prompt (natural breakpoint)
      │
      ▼ (declined)
Next Task ─────► Per-task assignment prompt
(unassigned)
      │
      ▼ (declined)
Skip to next assigned task
```

### Flow Detection Heuristics
| Signal | Action |
|--------|--------|
| < 30s between messages | Defer prompts |
| > 3 file changes/min | Defer (debugging) |
| Long pause (> 2 min) | Safe to prompt |
| Explicit marker ("done") | Safe to prompt |
| Session end / handoff | Must reconcile |

---

## Files Changed

### Created
- `docs/adr/ADR-061-task-assignment-and-work-tracking.md`
- `docs/epics/EPIC-016-personal-workstreams.md`
- `docs/sprints/SPRINT-2026-01-e016-s01-personal-workstream.md`
- `docs/sprints/SPRINT-2026-02-e016-s02-assignment-enforcement.md`
- `docs/sprints/SPRINT-2026-02-e016-s03-team-status.md`
- `docs/sprints/SPRINT-2026-02-e016-s04-flow-aware-nudging.md`

### Modified
- `docs/epics/EPIC-INDEX.md` (added EPIC-015, EPIC-016)

---

## Commits

```
6159c5d feat(epic): Create EPIC-016 Personal Workstreams & Assignment
f5491d6 docs(adr): Add ADR-061 Task Assignment and Work Tracking Architecture
```

Both pushed to `origin/main`.

---

## Graph State

- EPIC-016 synced to graph with 4 sprints
- 27 tasks created (e016_s01_t01 through e016_s04_t07)
- All tasks currently unassigned, status: not_started

---

## Next Steps

### Immediate (EPIC-015 Sprint 3)
Complete EPIC-015 migration and cleanup:
1. Create migration script for existing sprint status
2. Run migration on production graph
3. Remove CURRENT-SPRINT.md concept
4. Update sync to content-only

### Then (EPIC-016 Sprint 1)
Begin personal workstream implementation:
1. User identification (git config / ginko login)
2. Workstream API endpoint
3. Refactor `ginko start` for personal view

---

## Open Questions

None - architecture is fully defined in ADR-061.

---

## Branch State

```
main (clean, up to date with origin)
```

---

## Session Quality

- High architectural clarity achieved
- ADR-061 captures nuanced flow-awareness principles
- EPIC-016 provides clear implementation path
- Good alignment between infrastructure (EPIC-015) and UX (EPIC-016)
