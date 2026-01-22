# T09: Code Root Causes for Duplicate Nodes

**Sprint:** `adhoc_260122_s01` - Graph Data Validation and Cleanup
**Task:** `adhoc_260122_s01_t09`
**Status:** Complete
**Date:** 2026-01-22

---

## Executive Summary

Identified **1 critical bug** and **1 moderate issue** that caused duplicate nodes in the graph.

| Issue | Severity | Files Affected | Fix Required |
|-------|----------|----------------|--------------|
| `graphId` vs `graph_id` inconsistency | CRITICAL | 2 endpoints | Yes - standardize to `graph_id` |
| ADR stub creation without content | Moderate | 1 endpoint | No - design is intentional |

---

## Root Cause #1: Property Name Inconsistency (CRITICAL)

### The Bug

Different sync endpoints use different property names for the graph namespace identifier in MERGE keys:

| Endpoint | MERGE Pattern | Property Name |
|----------|---------------|---------------|
| `epic/sync` | `MERGE (e:Epic {id: $id, graphId: $graphId})` | **camelCase** |
| `task/sync` | `MERGE (t:Task {id: $taskId, graph_id: $graphId})` | **snake_case** |
| `task/sync` (Epic ref) | `MERGE (e:Epic {id: $epicId, graph_id: $graphId})` | **snake_case** |
| `task/sync` (Sprint ref) | `MERGE (s:Sprint {id: $sprintId, graph_id: $graphId})` | **snake_case** |
| `user/activity` | `MERGE (ua:UserActivity {graphId: $graphId, ...})` | **camelCase** |
| `graph/nodes` | `MATCH (n:${label} {id: $id, graph_id: $graphId})` | **snake_case** |

### Impact

When the same Epic (e.g., `EPIC-016`) is synced via different endpoints:

1. **Epic sync** creates: `(e:Epic {id: "EPIC-016", graphId: "gin_xxx"})`
2. **Task sync** creates: `(e:Epic {id: "EPIC-016", graph_id: "gin_xxx"})`

These are **different nodes** because the MERGE keys don't match. This explains:
- 43-45 Epic nodes instead of 17
- Cleanup queries requiring `WHERE graph_id = X OR graphId = X`

### Evidence

```typescript
// epic/sync/route.ts:156 - Uses camelCase
MERGE (e:Epic {id: $id, graphId: $graphId})

// task/sync/route.ts:239 - Uses snake_case
MERGE (e:Epic {id: $epicId, graph_id: $graphId})
```

### Fix Required

Standardize all domain nodes to use `graph_id` (snake_case):
- `dashboard/src/app/api/v1/epic/sync/route.ts` - Change `graphId` to `graph_id`
- `dashboard/src/app/api/v1/user/activity/route.ts` - Change `graphId` to `graph_id`

**Note:** The `Graph` node itself should keep `graphId` (camelCase) as its identifier - this is the graph namespace, not a foreign key.

---

## Root Cause #2: ADR Stub Creation (Moderate)

### The Pattern

Task sync creates ADR stub nodes when tasks reference ADRs:

```typescript
// task/sync/route.ts:257
MERGE (a:ADR {id: $adrId, graph_id: $graphId})
ON CREATE SET a.created_at = datetime()
```

### Impact

- Creates minimal ADR nodes with just `id`, `graph_id`, `created_at`
- No title, content, or other metadata
- If real ADR is synced later, MERGE matches and updates (no duplicate)

### Verdict

**This is working as designed.** The MERGE ensures no duplicates, and the stub is updated when the full ADR is synced. No fix required.

---

## Recommendations

### Immediate Fix (t10)

1. **Fix epic/sync endpoint** - Change MERGE key from `graphId` to `graph_id`
2. **Fix user/activity endpoint** - Change MERGE key from `graphId` to `graph_id`
3. **Run migration** - Update existing nodes with `graphId` to also have `graph_id`

### Future Prevention

1. **Add linting rule** - Enforce `graph_id` (snake_case) for all domain node properties
2. **Document convention** - Add to ADR or CLAUDE.md that domain nodes use `graph_id`
3. **Add validation** - CloudGraphClient could validate property names on creation

---

## Files to Modify

| File | Line | Current | Fix |
|------|------|---------|-----|
| `dashboard/src/app/api/v1/epic/sync/route.ts` | 156 | `graphId: $graphId` | `graph_id: $graphId` |
| `dashboard/src/app/api/v1/user/activity/route.ts` | 128 | `graphId: $graphId` | `graph_id: $graphId` |

---

## Migration Query

After code fix, run this to unify existing nodes:

```cypher
// Add graph_id to nodes that only have graphId
MATCH (n)
WHERE n.graphId IS NOT NULL AND n.graph_id IS NULL
SET n.graph_id = n.graphId
RETURN count(n) as migrated;
```

---

*Investigation completed: 2026-01-22*
