# T06: Graph Data Cleanup Plan

**Sprint:** `adhoc_260122_s01` - Graph Data Validation and Cleanup
**Status:** Ready for Approval
**Date:** 2026-01-22
**GraphId:** `gin_1762125961056_dg4bsd`

---

## Executive Summary

| Node Type | Current | Expected | To Delete | To Fix |
|-----------|---------|----------|-----------|--------|
| **Epic** | 43 | 17 | 26 | 1 |
| **Sprint** | 186 | 64 | ~85 | 11 |
| **ADR** | 150 | 96 | ~54 | 7 |
| **Task** | 1642 | TBD | TBD | TBD |
| **Charter** | 5 | 1 | 4 | 0 |
| **Graph** | 4 | 1 | 3 | 0 |
| **TOTAL** | - | - | **~172+** | **19** |

**Root Cause:** On 2026-01-20 ~17:06-17:08, a sync operation created empty stub nodes. Additionally, multiple ID formats (short vs slug) created duplicates over time.

---

## Phase 1: Delete Empty Stubs

### 1.1 Delete Empty Epic Stubs (26 nodes)

```cypher
// DELETE: eNNN format stubs (10 nodes)
MATCH (e:Epic)
WHERE (e.graph_id = 'gin_1762125961056_dg4bsd' OR e.graphId = 'gin_1762125961056_dg4bsd')
  AND e.id IN ['unknown', 'e001', 'e002', 'e005', 'e006', 'e008', 'e009', 'e011', 'e015', 'e016']
  AND (size(coalesce(e.content, '')) = 0 OR e.content IS NULL)
DETACH DELETE e
RETURN count(*) as deleted;
```

```cypher
// DELETE: EPIC-NNN short format stubs (15 nodes)
MATCH (e:Epic)
WHERE (e.graph_id = 'gin_1762125961056_dg4bsd' OR e.graphId = 'gin_1762125961056_dg4bsd')
  AND e.id IN ['EPIC-001', 'EPIC-002', 'EPIC-003', 'EPIC-004', 'EPIC-005', 'EPIC-006',
               'EPIC-007', 'EPIC-008', 'EPIC-009', 'EPIC-010', 'EPIC-011', 'EPIC-012',
               'EPIC-013', 'EPIC-014', 'EPIC-015']
  AND (size(coalesce(e.content, '')) = 0 OR e.content IS NULL)
DETACH DELETE e
RETURN count(*) as deleted;
```

```cypher
// DELETE: EPIC-016-personal-workstreams (malformed duplicate of EPIC-016)
MATCH (e:Epic)
WHERE (e.graph_id = 'gin_1762125961056_dg4bsd' OR e.graphId = 'gin_1762125961056_dg4bsd')
  AND e.id = 'EPIC-016-personal-workstreams'
  AND e.title = 'string,'
DETACH DELETE e
RETURN count(*) as deleted;
```

### 1.2 Delete Empty Sprint Stubs (~85 nodes)

```cypher
// DELETE: Date-based stubs (2025_*, 2026_* underscore format)
MATCH (s:Sprint)
WHERE (s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd')
  AND s.id =~ '^20[0-9]{2}_.*'
  AND (size(coalesce(s.content, '')) = 0 OR s.content IS NULL)
DETACH DELETE s
RETURN count(*) as deleted;
```

```cypher
// DELETE: Short-form sprint stubs (eNNN_sNN format)
MATCH (s:Sprint)
WHERE (s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd')
  AND s.id =~ '^e[0-9]{3}_s[0-9]{2}.*'
  AND (size(coalesce(s.content, '')) = 0 OR s.content IS NULL)
DETACH DELETE s
RETURN count(*) as deleted;
```

```cypher
// DELETE: Adhoc stubs with null title
MATCH (s:Sprint)
WHERE (s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd')
  AND s.id =~ '^adhoc_.*'
  AND s.title IS NULL
  AND (size(coalesce(s.content, '')) = 0 OR s.content IS NULL)
DETACH DELETE s
RETURN count(*) as deleted;
```

```cypher
// DELETE: Misc stubs
MATCH (s:Sprint)
WHERE (s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd')
  AND s.id = 'current_sprint'
  AND (size(coalesce(s.content, '')) = 0 OR s.content IS NULL)
DETACH DELETE s
RETURN count(*) as deleted;
```

```cypher
// DELETE: Truncated ID duplicates (have content but are duplicates)
// SPRINT-010- is duplicate of SPRINT-010-execution-plan
// SPRINT-2025- is duplicate of SPRINT-2025-Q1-monetization-platform
// etc.
MATCH (s:Sprint)
WHERE (s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd')
  AND s.id IN ['SPRINT-010-', 'SPRINT-2025-', 'SPRINT-2025-01-', 'SPRINT-2025-10-27-', 'SPRINT-2025-11-10-']
DETACH DELETE s
RETURN count(*) as deleted;
```

### 1.3 Delete Empty ADR Stubs (~20 nodes)

```cypher
// DELETE: ADR-NNN-adr-NNN redundant stubs (123 char content)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id =~ '^ADR-[0-9]{3}-adr-[0-9]{3}$'
DETACH DELETE a
RETURN count(*) as deleted;
```

```cypher
// DELETE: ADR-NNN empty stubs (null title, 0 content)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id =~ '^ADR-[0-9]{3}$'
  AND a.title IS NULL
  AND (size(coalesce(a.content, '')) = 0 OR a.content IS NULL)
DETACH DELETE a
RETURN count(*) as deleted;
```

### 1.4 Delete Duplicate Charter/Graph Nodes

```cypher
// DELETE: Duplicate Charter nodes (keep 1)
// First, identify which to keep (most content)
MATCH (c:Charter)
WHERE c.graph_id = 'gin_1762125961056_dg4bsd' OR c.graphId = 'gin_1762125961056_dg4bsd'
WITH c ORDER BY size(coalesce(c.content, '')) DESC
WITH collect(c) as charters
WITH charters[0] as keep, charters[1..] as toDelete
UNWIND toDelete as d
DETACH DELETE d
RETURN count(*) as deleted;
```

```cypher
// DELETE: Duplicate Graph nodes (keep 1)
MATCH (g:Graph)
WHERE g.graph_id = 'gin_1762125961056_dg4bsd' OR g.graphId = 'gin_1762125961056_dg4bsd'
WITH g ORDER BY g.created_at DESC
WITH collect(g) as graphs
WITH graphs[0] as keep, graphs[1..] as toDelete
UNWIND toDelete as d
DETACH DELETE d
RETURN count(*) as deleted;
```

---

## Phase 2: Fix Malformed Titles

### 2.1 Fix Epic Titles (1 node)

```cypher
// Already deleted EPIC-016-personal-workstreams in Phase 1
// No other Epic title fixes needed
```

### 2.2 Fix Sprint Titles (11 nodes)

```cypher
// FIX: Sprint malformed titles
MATCH (s:Sprint)
WHERE s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd'
WITH s,
  CASE s.id
    WHEN 'SPRINT-2025-10-27-tasks-detailed' THEN 'SPRINT-2025-10-27: Detailed Task Specifications'
    WHEN 'SPRINT-2025-12-epic004-sprint4-orchestration' THEN 'Sprint 4: Orchestration Layer'
    WHEN 'SPRINT-2025-12-graph-infrastructure' THEN 'SPRINT: Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)'
    WHEN 'SPRINT-2026-01-e009-s02-cli-api' THEN 'SPRINT: Product Roadmap Sprint 2 - CLI & API'
    WHEN 'SPRINT-2026-01-e011-s00-data-model-fixes' THEN 'SPRINT: Graph Explorer v2 Sprint 0 - Data Model & Sync Fixes'
    WHEN 'SPRINT-2026-01-e011-s02-edit-capability' THEN 'SPRINT: Graph Explorer v2 Sprint 2 - Edit Capability & Sync'
    WHEN 'SPRINT-2026-01-e015-s00a-task-node-extraction' THEN 'SPRINT: EPIC-015 Sprint 0a - Task Node Extraction'
    WHEN 'SPRINT-2026-01-e016-s01-personal-workstream' THEN 'SPRINT: EPIC-016 Sprint 1 - Personal Workstream Foundation'
    WHEN 'SPRINT-2026-01-epic008-sprint2' THEN 'SPRINT: Team Collaboration Sprint 2 - Visibility & Coordination'
    WHEN 'SPRINT-2026-02-e015-s02-graph-first-reading' THEN 'SPRINT: EPIC-015 Sprint 2 - Graph-First Reading'
    WHEN 'SPRINT-2026-02-e016-s03-team-status' THEN 'SPRINT: EPIC-016 Sprint 3 - Team Status'
    ELSE NULL
  END as newTitle
WHERE newTitle IS NOT NULL
  AND (s.title LIKE 'string%' OR s.title LIKE '$title%' OR s.title LIKE '"%')
SET s.title = newTitle, s.name = newTitle, s.updatedAt = datetime()
RETURN s.id, s.title;
```

### 2.3 Fix ADR Titles (7 nodes)

```cypher
// FIX: ADR malformed titles
MATCH (a:ADR)
WHERE a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd'
WITH a,
  CASE a.id
    WHEN 'ADR-012-legacy-context-migration-strategy' THEN 'ADR-012: Legacy Context Migration Strategy'
    WHEN 'ADR-039-graph-based-context-discovery' THEN 'ADR-039: Knowledge Discovery Graph for AI-Native Documentation'
    WHEN 'ADR-041-graph-migration-write-dispatch' THEN 'ADR-041: Graph Migration Strategy and Write Dispatch Architecture'
    WHEN 'ADR-042-ai-assisted-knowledge-graph-quality' THEN 'ADR-042: AI-Assisted Knowledge Graph Quality Through Typed Relationships'
    WHEN 'ADR-043-event-stream-session-model' THEN 'ADR-043: Event Stream Session Model with Read Cursors'
    WHEN 'ADR-050-blog-infrastructure-static-markdown' THEN 'ADR-050: Blog Infrastructure with Static Markdown'
    WHEN 'ADR-054-knowledge-editing-architecture' THEN 'ADR-054: Knowledge Editing Architecture'
    ELSE NULL
  END as newTitle
WHERE newTitle IS NOT NULL
  AND (a.title LIKE 'string%' OR a.title LIKE 'legacy.%' OR a.title LIKE '''%' OR a.title LIKE '"%')
SET a.title = newTitle, a.name = newTitle, a.updatedAt = datetime()
RETURN a.id, a.title;
```

---

## Phase 3: Delete Duplicate Slug Variants (ADRs)

Some ADRs have multiple slug versions. Keep the canonical one (matching local file), delete others.

```cypher
// DELETE: ADR duplicate slugs - keeping canonical versions
// ADR-003: Keep -statusline-intelligence-hooks-over-otel (matches local file)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id IN ['ADR-003-migration-to-ginkoai', 'ADR-003-oauth-authentication-architecture']
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-004: Keep -identity-entitlements-billing
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-004-browser-extension-strategy'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-006: Keep -oauth-only-authentication
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-006-continuous-context-invocation'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-007: Keep -supabase-platform-adoption
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id IN ['ADR-007-github-search-engine', 'ADR-007-phase-context-coherence']
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-008: Keep -environment-based-authentication
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-008-context-reflexes'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-009: Keep -serverless-first-mvp-architecture
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-009-progressive-context-loading'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-011: Keep -best-practices-claude-code-integration
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-011-backlog-architecture'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-012: Keep -legacy-context-migration-strategy
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-012-ginko-command-architecture'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-013: Keep -simple-builder-pattern
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-013-mcp-server-project-separation'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-014: Keep -safe-defaults-reflector-pattern
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id IN ['ADR-014-enhanced-handoff-quality', 'ADR-014-mcp-server-consolidation-and-rationalization']
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-016: Keep -simplify-mcp-interface-preserve-capabilities
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-016-handoff-tool-consolidation-and-vibecheck'
DETACH DELETE a
RETURN count(*) as deleted;

// ADR-026: Keep -intelligent-model-routing
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-026-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration'
DETACH DELETE a
RETURN count(*) as deleted;
```

---

## Phase 4: Cleanup Orphan Graph Namespaces

```cypher
// DELETE: Orphan Project nodes (single-node graphs)
// These are failed initializations with only 1 Project node
MATCH (p:Project)
WHERE p.graph_id <> 'gin_1762125961056_dg4bsd'
  AND p.graphId <> 'gin_1762125961056_dg4bsd'
  AND NOT p.graph_id CONTAINS 'archive'
  AND NOT p.graphId CONTAINS 'archive'
WITH p.graph_id as gid, p.graphId as gid2, collect(p) as projects
// Only delete if this graph has just 1 node total
MATCH (n)
WHERE n.graph_id = coalesce(gid, gid2) OR n.graphId = coalesce(gid, gid2)
WITH gid, gid2, projects, count(n) as totalNodes
WHERE totalNodes <= 2  // Project + maybe Charter
UNWIND projects as p
DETACH DELETE p
RETURN count(*) as deleted;
```

---

## Phase 5: Validation Queries

Run these after cleanup to verify success.

```cypher
// VALIDATE: Epic count (should be 17)
MATCH (e:Epic)
WHERE e.graph_id = 'gin_1762125961056_dg4bsd' OR e.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(e) as epicCount;
// Expected: 17
```

```cypher
// VALIDATE: Sprint count (should be ~64)
MATCH (s:Sprint)
WHERE s.graph_id = 'gin_1762125961056_dg4bsd' OR s.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(s) as sprintCount;
// Expected: ~64
```

```cypher
// VALIDATE: ADR count (should be ~96)
MATCH (a:ADR)
WHERE a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(a) as adrCount;
// Expected: ~96
```

```cypher
// VALIDATE: No malformed titles remain
MATCH (n)
WHERE (n.graph_id = 'gin_1762125961056_dg4bsd' OR n.graphId = 'gin_1762125961056_dg4bsd')
  AND (n.title LIKE 'string%' OR n.title LIKE '$%' OR n.title = 'null')
RETURN labels(n)[0] as label, n.id as id, n.title as title;
// Expected: 0 rows
```

```cypher
// VALIDATE: No empty stubs remain
MATCH (n)
WHERE (n.graph_id = 'gin_1762125961056_dg4bsd' OR n.graphId = 'gin_1762125961056_dg4bsd')
  AND n.title IS NULL
  AND (labels(n)[0] IN ['Epic', 'Sprint', 'ADR'])
RETURN labels(n)[0] as label, n.id as id;
// Expected: 0 rows
```

```cypher
// VALIDATE: Charter count (should be 1)
MATCH (c:Charter)
WHERE c.graph_id = 'gin_1762125961056_dg4bsd' OR c.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(c) as charterCount;
// Expected: 1
```

---

## Execution Order

1. **BACKUP** - Export current state before any changes
2. **Phase 1** - Delete empty stubs (largest impact)
3. **Phase 2** - Fix malformed titles
4. **Phase 3** - Delete duplicate slug variants
5. **Phase 4** - Cleanup orphan namespaces
6. **Phase 5** - Run validation queries
7. **VERIFY** - Check dashboard displays correctly

---

## Rollback Plan

If issues occur, archived nodes can be restored:

```cypher
// Restore from archive (if needed)
MATCH (n)
WHERE n.graph_id = 'gin_1762125961056_dg4bsd_archive_duplicates_20260120'
SET n.graph_id = 'gin_1762125961056_dg4bsd',
    n.graphId = 'gin_1762125961056_dg4bsd'
REMOVE n.archived_from, n.archived_at, n.archived_reason
RETURN count(*) as restored;
```

---

## Approval

- [ ] Chris Norton - Approve cleanup plan
- [ ] Execute Phase 1-4
- [ ] Validate with Phase 5
- [ ] Confirm dashboard displays correctly

**Estimated impact:** ~172+ nodes deleted, 19 titles fixed
