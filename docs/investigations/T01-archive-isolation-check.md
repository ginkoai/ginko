# T01: Archive Graph Isolation Check

**Sprint:** `adhoc_260122_s01` - Graph Data Validation and Cleanup
**Status:** In Progress
**Date:** 2026-01-22

## Objective

Verify that the archive graph (`gin_1762125961056_dg4bsd_archive_duplicates_20260120`) is properly isolated from production graph (`gin_1762125961056_dg4bsd`).

## Background

On 2026-01-20, a cleanup operation archived 2,035 duplicate Sprint nodes. Current symptoms suggest data issues persist:
- 43 Epics (expected: 17)
- 186 Sprints (expected: 64)
- 150 ADRs (expected: 96)

**Key Question:** Are archived nodes being counted in production statistics?

## Known Graph IDs

| Purpose | Graph ID |
|---------|----------|
| **Production** | `gin_1762125961056_dg4bsd` |
| **Archive** | `gin_1762125961056_dg4bsd_archive_duplicates_20260120` |

---

## Investigation Queries

Run these in **Neo4j Aura console** to bypass ginko code.

### Query 1: List All Graph IDs

```cypher
// Find all distinct graph_id values in the database
MATCH (n)
WHERE n.graph_id IS NOT NULL OR n.graphId IS NOT NULL
RETURN DISTINCT coalesce(n.graph_id, n.graphId) as graphId,
       labels(n)[0] as sampleLabel,
       count(n) as nodeCount
ORDER BY nodeCount DESC
```

**Expected:** Should see production and archive as separate, with clear node counts per namespace.

### Query 2: Epic Count by Graph ID

```cypher
// Count Epics per graph namespace
MATCH (e:Epic)
RETURN coalesce(e.graph_id, e.graphId, 'NO_GRAPH_ID') as graphId,
       count(e) as epicCount
ORDER BY epicCount DESC
```

**Expected:** Production should have ~17-20 Epics max. If 43+ are in production namespace, they're duplicates (not archive contamination).

### Query 3: Sprint Count by Graph ID

```cypher
// Count Sprints per graph namespace
MATCH (s:Sprint)
RETURN coalesce(s.graph_id, s.graphId, 'NO_GRAPH_ID') as graphId,
       count(s) as sprintCount
ORDER BY sprintCount DESC
```

**Expected:** Production should have ~64 Sprints. Archive should have ~2,035.

### Query 4: Check for Nodes Missing Graph ID

```cypher
// Find nodes without any graph_id (orphans)
MATCH (n)
WHERE n.graph_id IS NULL AND n.graphId IS NULL
RETURN labels(n)[0] as label, count(n) as orphanCount
ORDER BY orphanCount DESC
LIMIT 20
```

**Expected:** Should be zero or minimal. Orphan nodes without graph_id could appear in all queries.

### Query 5: Verify Archive Node Properties

```cypher
// Check archived nodes have proper archive markers
MATCH (n)
WHERE coalesce(n.graph_id, n.graphId) = 'gin_1762125961056_dg4bsd_archive_duplicates_20260120'
RETURN labels(n)[0] as label,
       count(n) as nodeCount,
       count(n.archived_from) as hasArchivedFrom,
       count(n.archived_at) as hasArchivedAt
ORDER BY nodeCount DESC
```

**Expected:** Archived nodes should have `archived_from`, `archived_at` properties.

### Query 6: Production Epic Detail

```cypher
// List all Epics in production with key properties
MATCH (e:Epic)
WHERE coalesce(e.graph_id, e.graphId) = 'gin_1762125961056_dg4bsd'
RETURN e.id as id,
       e.epic_id as epic_id,
       e.title as title,
       e.created_at as created,
       size(coalesce(e.content, '')) as contentLength
ORDER BY e.epic_id, e.created_at
```

**Expected:** Should show 17 unique Epics. If 43+, there are duplicates with same epic_id.

---

## Findings

*To be filled in after running queries*

### Query 1 Results: All Graph IDs


### Query 2 Results: Epic Count


### Query 3 Results: Sprint Count


### Query 4 Results: Orphan Nodes


### Query 5 Results: Archive Markers


### Query 6 Results: Production Epic Detail


---

## Conclusion

*To be filled in after analysis*

- [ ] Archive is properly isolated
- [ ] Archive nodes are accidentally included in production queries
- [ ] Duplicates exist within production namespace (not archive contamination)
- [ ] Orphan nodes without graph_id are causing inflation

## Next Steps

Based on findings, proceed to:
- **T02** if duplicates are in production
- **Code investigation** if archive is leaking into queries
- **Orphan cleanup** if missing graph_ids are the issue
