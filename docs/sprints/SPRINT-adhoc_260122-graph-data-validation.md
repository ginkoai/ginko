# Sprint: Graph Data Validation and Cleanup

**ID:** `adhoc_260122_s01`
**Type:** Maintenance / Data Integrity
**Priority:** CRITICAL
**Created:** 2026-01-22
**Epic:** Maintenance

## Problem Statement

The knowledge graph contains incorrect node counts and data integrity issues:

- **Expected:** 17 Epics (001-016 + Maintenance)
- **Actual:** 43 Epics (dashboard) / 45 Epics (Neo4j Aura)
- **Delta:** ~26 duplicate or orphaned Epic nodes

Similar issues exist across all node types:
- ADRs: Card shows 150, sidebar shows 100 (duplicates suspected)
- Sprints: 186 total (many may be orphaned)
- Tasks: 1642 total (suspect many orphaned)
- Patterns: 57 (some duplicates)
- Gotchas: 54 (some duplicates)
- "unknown" category visible in tree (malformed nodes)

### Root Cause Hypotheses

1. **Archive graph contamination** - Previous migration archive may still be connected to production graph
2. **Duplicate node creation** - Past sync operations created metadata-only duplicates
3. **Orphaned nodes** - Deleted parents left child nodes without relationships
4. **ID format inconsistencies** - `EPIC-9` vs `EPIC-009` causing duplicate matches
5. **camelCase/snake_case property mismatch** - Queries finding partial matches

---

## Approach

**Phase 1: Investigation (Cypher-direct)**
- Bypass ginko CLI/API code to avoid any bugs affecting analysis
- Use Neo4j Aura console for direct Cypher queries
- Document exact state before any changes

**Phase 2: Cleanup Plan**
- Identify nodes to delete (duplicates, orphans, empty)
- Create backup before deletion
- Get approval before executing

**Phase 3: Code Audit**
- After data is clean, investigate code paths
- Fix root causes to prevent recurrence

---

## Tasks

### Phase 1: Investigation ✓

- [x] **adhoc_260122_s01_t01** - Archive Graph Isolation Check
  - Query Neo4j for distinct `graph_id` values
  - Verify production graph is isolated from archive
  - Check if any nodes reference archived graph_id
  - **Deliverable:** Report on graph isolation status
  - **Completed:** 2026-01-22. Production graph isolated. Archive graphs identified.

- [x] **adhoc_260122_s01_t02** - Epic Node Audit
  - List all Epic nodes with properties: id, epic_id, title, graph_id, created_at
  - Identify duplicates (same epic_id, different node IDs)
  - Identify orphans (no valid graph_id or malformed properties)
  - Identify empty nodes (no title or content)
  - **Deliverable:** Categorized list of 43+ Epic nodes
  - **Completed:** 2026-01-22. Found 26 stub nodes to delete.

- [x] **adhoc_260122_s01_t03** - Sprint Node Audit
  - List all Sprint nodes with parent Epic relationships
  - Identify orphaned Sprints (no valid Epic parent)
  - Identify duplicates and malformed nodes
  - Cross-reference with local sprint files
  - **Deliverable:** Sprint audit report
  - **Completed:** 2026-01-22. Found ~85 stub nodes to delete.

- [x] **adhoc_260122_s01_t04** - Task Node Audit
  - Sample task nodes to assess data quality
  - Identify orphaned Tasks (no Sprint parent)
  - Check for metadata-only tasks (no content)
  - **Deliverable:** Task audit report
  - **Completed:** 2026-01-22. Tasks cleaned via relationship cascade.

- [x] **adhoc_260122_s01_t05** - Knowledge Node Audit (ADR, PRD, Pattern, Gotcha)
  - Audit ADRs: Expected ~60, showing 100-150
  - Audit PRDs: Check for duplicates
  - Audit Patterns: Expected ~30, showing 57
  - Audit Gotchas: Check for duplicates
  - **Deliverable:** Knowledge node audit report
  - **Completed:** 2026-01-22. Found 24 ADR stubs, 4 Charter dupes, 3 Graph dupes.

### Phase 2: Cleanup ✓

- [x] **adhoc_260122_s01_t06** - Create Cleanup Plan
  - Synthesize audit findings
  - Categorize nodes: KEEP, DELETE, INVESTIGATE
  - Estimate impact of deletions
  - **Deliverable:** Approved cleanup plan document
  - **Completed:** 2026-01-22. See `docs/investigations/T06-cleanup-plan.md`

- [x] **adhoc_260122_s01_t07** - Execute Cleanup (with approval)
  - Backup affected nodes before deletion
  - Execute Cypher DELETE statements
  - Verify counts after cleanup
  - **Deliverable:** Cleanup execution log
  - **Completed:** 2026-01-22. Deleted 142 nodes, ~204K relationships.

- [x] **adhoc_260122_s01_t08** - Post-Cleanup Validation
  - Verify expected counts: 17 Epics, ~60 ADRs, etc.
  - Test hierarchy navigation in dashboard
  - Run `ginko start` to verify CLI compatibility
  - **Deliverable:** Validation report
  - **Completed:** 2026-01-22. Epics=17✓, ADRs=123, Sprints=101, Charter=1✓

### Phase 2b: ADR Renumbering (Added) ✓

- [x] **adhoc_260122_s01_t11** - Audit Duplicate ADR Numbers
  - Identified 13 ADR numbers with multiple files (27 total duplicates)
  - Created audit table with canonical vs renumber recommendations
  - **Completed:** 2026-01-22

- [x] **adhoc_260122_s01_t12** - Execute ADR Renumbering
  - Renamed 15 ADRs to new numbers (062-076)
  - Updated 73 references across codebase
  - Fixed 2 header mismatches (ADR-008, ADR-009)
  - Deleted 15 redundant stub files locally
  - Created reusable script: `scripts/adr-renumber.sh`
  - **Completed:** 2026-01-22. Commit: ca06711

### Phase 3: Code Investigation (Pending)

- [ ] **adhoc_260122_s01_t09** - Identify Code Root Causes
  - Review sync code paths that may create duplicates
  - Check for missing validation on node creation
  - Audit API endpoints for proper graph_id scoping
  - **Deliverable:** List of code issues to fix

- [ ] **adhoc_260122_s01_t10** - Code Fixes (if needed)
  - Fix identified issues
  - Add validation to prevent duplicate creation
  - Add schema enforcement where missing
  - **Deliverable:** Code PRs with fixes

---

## Cypher Query Templates

### Check Graph Isolation
```cypher
// List all distinct graph_id values
MATCH (n)
WHERE n.graph_id IS NOT NULL
RETURN DISTINCT n.graph_id, count(n) as node_count
ORDER BY node_count DESC
```

### Epic Audit
```cypher
// List all Epic nodes with key properties
MATCH (e:Epic)
RETURN e.id, e.epic_id, e.title, e.graph_id, e.created_at,
       e.content IS NOT NULL as has_content
ORDER BY e.epic_id
```

### Find Orphaned Sprints
```cypher
// Sprints without valid Epic parent
MATCH (s:Sprint)
WHERE NOT EXISTS {
  MATCH (e:Epic)
  WHERE e.epic_id = s.epic_id OR e.id = s.epic_id
}
RETURN s.id, s.sprint_id, s.title, s.epic_id
```

### Find Duplicate Nodes by ID
```cypher
// Find duplicate epic_ids
MATCH (e:Epic)
WITH e.epic_id as epic_id, collect(e) as nodes, count(*) as cnt
WHERE cnt > 1
RETURN epic_id, cnt, [n in nodes | n.id] as node_ids
```

---

## Expected vs Actual Counts

### Before Cleanup (2026-01-22 AM)

| Node Type | Local Files | Graph (Actual) | Delta | Notes |
|-----------|-------------|----------------|-------|-------|
| Epics | 16 | 43-45 | +27-29 | Should be 17 (16 numbered + Maintenance) |
| Sprints | 64 | 186 | +122 | Major orphan/duplicate issue |
| Tasks | TBD | 1642 | TBD | Likely many orphaned |
| ADRs | 96 | 100-150 | +4-54 | Card vs sidebar discrepancy |
| PRDs | TBD | 51 | TBD | Need local count |
| Patterns | TBD | 57 | TBD | Need local count |
| Gotchas | TBD | 54 | TBD | Need local count |

### After Cleanup (2026-01-22 PM)

| Node Type | Expected | Graph (After) | Status |
|-----------|----------|---------------|--------|
| Epics | 17 | 17 | ✓ Clean |
| Sprints | ~64 | 101 | ⚠️ +37 (may be legitimate) |
| ADRs | ~96 | 123 | ⚠️ +27 (may be legitimate) |
| Charters | 1 | 1 | ✓ Clean |
| Malformed titles | 0 | 0 | ✓ Clean |
| Empty stubs | 0 | 0 | ✓ Clean |

**Cleanup Impact:**
- Deleted: 142 nodes
- Relationships cleared: ~204,000
- ADRs renumbered: 15 (local + graph)
- References updated: 73 files

---

## Success Criteria

1. **Epic count:** Exactly 17 (EPIC-001 through EPIC-016 + Maintenance)
2. **Sprint count:** ~64 (matching local files)
3. **No orphaned nodes:** All Sprints have valid Epic, all Tasks have valid Sprint
4. **No duplicates:** Each entity ID appears exactly once
5. **No empty nodes:** All nodes have required content fields
6. **Clean tree navigation:** Dashboard tree shows correct hierarchy
7. **Code fixes:** Root causes identified and fixed to prevent recurrence

---

## Progress

**Status:** In Progress (Phase 3 Remaining)
**Progress:** 83% (10/12 tasks)

### Session Log

**2026-01-22 (Session 1):**
- Completed Phase 1 investigation, produced T06-cleanup-plan.md
- Executed Phase 2 cleanup via Neo4j dashboard
- Added Phase 2b: ADR renumbering to resolve duplicate numbers
- Committed cleanup: `ca06711`
- Remaining: Phase 3 code investigation (t09, t10)

---

## Notes

- Use Neo4j Aura console for all investigation queries
- Do NOT use ginko CLI for data reads during investigation (may have bugs)
- Get explicit approval before executing any DELETE operations
- Previous related sprint: `adhoc_260119_s01` (Dashboard Maintenance)
