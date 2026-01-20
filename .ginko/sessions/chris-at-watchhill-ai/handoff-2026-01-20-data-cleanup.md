---
session_id: session-2026-01-20T18-29-18-575Z
ended: 2026-01-20T22:40:00.000Z
user: chris@watchhill.ai
branch: main
model: claude-opus-4-5-20250101
provider: anthropic
---

# Session Handoff: Data Quality Cleanup & Duplicate Archival

## Summary

Maintenance sprint focused on data quality issues in the Neo4j knowledge graph. Fixed malformed node titles (TypeScript type hints stored as values) and archived 2,035 duplicate Sprint nodes to a separate graph namespace.

## What Was Accomplished

### 1. Admin Cleanup Endpoint (NEW)
- **File**: `dashboard/src/app/api/v1/admin/cleanup-titles/route.ts`
- GET: Reports malformed titles and duplicate nodes
- POST: Fixes malformed titles, archives duplicates
- Uses Neo4j element IDs to distinguish same-id nodes
- Moves duplicates to archive graph (preserves for recovery)

### 2. Sync Validation
- **File**: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Added `validateSprintName()` and `validateTaskTitle()` functions
- Rejects malformed patterns at ingestion time
- Generates fallback titles from IDs when invalid data detected

### 3. Display-Layer Sanitization
- **File**: `dashboard/src/lib/graph/api-client.ts`
- `isMalformedTitle()` - detects corruption patterns
- `extractCleanTitle()` - extracts valid title from corrupted data
- `sanitizeSprintTitle()`, `sanitizeTaskTitle()`, `sanitizeEpicTitle()`
- Epic deduplication by canonical ID in `buildTreeHierarchy()`

### 4. Sprint Selection Improvements
- **File**: `dashboard/src/app/api/v1/sprint/active/route.ts`
- Filters completed sprints, prioritizes active/in_progress
- Adds fallback query when all sprints are complete

### 5. UI Fixes
- **File**: `dashboard/src/components/dashboard/dashboard-nav.tsx` - Removed profile link
- **File**: `dashboard/src/components/insights/MemberFilter.tsx` - Shows all team members

## Data Cleanup Results

| Metric | Before | After |
|--------|--------|-------|
| Malformed titles | 68 | 0 |
| Sprint nodes | 2,221 | 186 |
| Archived duplicates | - | 2,035 |

**Archive Graph**: `gin_1762125961056_dg4bsd_archive_duplicates_20260120`

## Root Cause Analysis

The duplicate nodes were caused by the sync process creating new nodes instead of merging by ID. Each CLI sync was creating fresh Sprint nodes rather than updating existing ones. The sync validation added will prevent future corruption.

## Key Decisions

1. **Archive vs Delete**: Chose to move duplicates to archive graph instead of permanent deletion. Provides safety net for recovery if needed.

2. **Element ID Selection**: When multiple nodes share the same `id` property, selection criteria (in priority order):
   - Most recent `updatedAt` or `createdAt`
   - Has non-null `title`
   - Most relationships
   - Most complete properties

3. **Display-Layer Sanitization**: Added as defense-in-depth. Even if bad data enters the graph, the display layer will handle it gracefully.

## Files Changed

```
dashboard/src/app/api/v1/admin/cleanup-titles/route.ts  (NEW - 650 lines)
dashboard/src/app/api/v1/sprint/sync/route.ts          (+92 lines)
dashboard/src/lib/graph/api-client.ts                  (+292 lines)
dashboard/src/app/api/v1/sprint/active/route.ts        (+52 lines)
dashboard/src/app/api/v1/graph/roadmap/route.ts        (+31 lines)
dashboard/src/components/dashboard/dashboard-nav.tsx   (-6 lines)
dashboard/src/components/insights/MemberFilter.tsx     (+14 lines)
```

## Next Steps

1. **Monitor for new duplicates**: The sync validation should prevent future duplicates, but worth monitoring.

2. **Task node cleanup**: The cleanup endpoint currently handles Sprint/Epic duplicates. Could extend to Task nodes if needed.

3. **Insights date tabs**: User reported date filter not changing data - not addressed this session.

## Recovery Procedure

If archived nodes need to be restored:
```cypher
// View archived nodes
MATCH (n:Sprint)
WHERE n.graphId = 'gin_1762125961056_dg4bsd_archive_duplicates_20260120'
RETURN n.id, n.archived_from, n.archived_at, n.kept_element_id

// Restore a specific node
MATCH (n:Sprint {id: $nodeId})
WHERE n.graphId = 'gin_1762125961056_dg4bsd_archive_duplicates_20260120'
SET n.graphId = n.archived_from,
    n.graph_id = n.archived_from
REMOVE n.archived_from, n.archived_at, n.archived_reason
```

## Commit

```
d0986a2 fix(dashboard): Data quality cleanup and duplicate node archival
```
