# Session Handoff: Graph Data Validation & Cleanup Plan

**Date:** 2026-01-22
**Sprint:** `adhoc_260122_s01`
**Status:** Cleanup plan ready, awaiting execution

## Summary

Investigated graph data issues showing inflated node counts. Created comprehensive cleanup plan ready for execution in Neo4j Aura.

## Key Findings

| Finding | Detail |
|---------|--------|
| **Archive isolated** | ✓ Not contaminating production |
| **Root cause** | 2026-01-20 ~17:06 sync created empty stubs |
| **Epic duplicates** | 43 → 17 (delete 26) |
| **Sprint duplicates** | 186 → 64 (delete ~122) |
| **ADR duplicates** | 150 → 96 (delete ~54) |
| **Malformed titles** | 19 nodes need fixing |

## Files Created

- `docs/sprints/SPRINT-adhoc_260122-graph-data-validation.md` - Sprint plan
- `docs/investigations/T01-archive-isolation-check.md` - Investigation queries
- `docs/investigations/T06-cleanup-plan.md` - **Cleanup Cypher queries**

## Next Steps

1. **Execute cleanup** - Run queries from `T06-cleanup-plan.md` in Neo4j Aura
2. **Validate** - Run Phase 5 validation queries
3. **Verify dashboard** - Confirm correct counts display
4. **T09-T10** - Investigate code root causes after data clean

## Cleanup Execution Order

```
Phase 1: Delete empty stubs (~131 nodes)
Phase 2: Fix malformed titles (18 nodes)
Phase 3: Delete ADR duplicate slugs (~15 nodes)
Phase 4: Cleanup orphan namespaces (~50 projects)
Phase 5: Validation queries
```

## Context for Next Session

- All Cypher queries are in `docs/investigations/T06-cleanup-plan.md`
- Run in Neo4j Aura console (bypass ginko code)
- Expected final counts: 17 Epics, ~64 Sprints, ~96 ADRs
- After cleanup, investigate why sync created duplicates (code fix needed)
