# SPRINT: Unify Graph Node Creation

## Sprint Overview

**Sprint ID:** `adhoc_260203_s01`
**Sprint Goal**: Eliminate duplicate Sprint/Epic nodes caused by dual-path creation in ginko push
**Priority Lane**: Now
**Status**: In Progress
**Type**: Bug Fix
**Progress:** 0% (0/8 tasks complete)

**Root Cause:** ginko push runs two sequential operations that both create Sprint and Epic nodes:
1. Document upload - MERGE on {id, graph_id} with content properties
2. Task sync - MERGE on {id, graph_id} with minimal structural properties

When extractEntityId() produces a different ID than parseTaskHierarchy(), MERGE creates separate nodes appearing as duplicates in the nav tree.

**Impact:** User Ed sees duplicate sprints and sprints show no tasks in hierarchy.

**Success Criteria:**
- [ ] ginko push --all --force produces zero duplicate Sprint/Epic nodes
- [ ] Hierarchy route correctly shows tasks under sprints
- [ ] Nav tree shows exactly one node per sprint
- [ ] Existing duplicate nodes can be cleaned up via cleanup action
- [ ] All unit tests pass
- [ ] Build clean across CLI, API, and Dashboard

---

## Sprint Tasks

### adhoc_260203_s01_t01: Write unit tests for CLI ID extraction
**Priority:** HIGH | **Status:** [@]
**Files:** packages/cli/src/commands/push/__tests__/extract-entity-id.test.ts
**Related ADRs:** ADR-052

Test extractEntityId() and parseTaskHierarchy() produce identical Sprint/Epic IDs.

**Acceptance Criteria:**
- [ ] Tests for canonical filename patterns
- [ ] Tests for legacy filename patterns
- [ ] Tests for ad-hoc sprint filenames
- [ ] Tests proving ID consistency between extractEntityId and parseTaskHierarchy
- [ ] All tests pass

---

### adhoc_260203_s01_t02: Write unit tests for task sync Sprint enrichment
**Priority:** HIGH | **Status:** [ ]
**Files:** dashboard/src/app/api/v1/task/sync/__tests__/route.test.ts

Test that task sync MERGE sets title, epic_id, and status on Sprint nodes.

**Acceptance Criteria:**
- [ ] Test Sprint MERGE ON CREATE sets title, epic_id, status
- [ ] Test Sprint MERGE ON MATCH preserves existing properties
- [ ] Test hierarchy query finds Sprints by epic_id after task sync
- [ ] All tests pass

---

### adhoc_260203_s01_t03: Write unit tests for document upload dedup
**Priority:** HIGH | **Status:** [ ]
**Files:** dashboard/src/app/api/v1/graph/documents/__tests__/route.test.ts

Test that document upload for Sprint/Epic types enriches existing nodes.

**Acceptance Criteria:**
- [ ] Test document upload enriches existing Sprint node with content/embedding
- [ ] Test document upload handles missing Sprint node gracefully
- [ ] Test no duplicate nodes created when push runs both paths
- [ ] All tests pass

---

### adhoc_260203_s01_t04: Fix CLI extractEntityId for ID consistency
**Priority:** HIGH | **Status:** [ ]
**Files:** packages/cli/src/commands/push/push-command.ts, packages/cli/src/lib/entity-classifier.ts

Ensure extractEntityId() always produces canonical eNNN_sNN format.

**Acceptance Criteria:**
- [ ] extractEntityId returns canonical format for all sprint filename patterns
- [ ] ID matches what parseTaskHierarchy would produce
- [ ] Existing unit tests still pass
- [ ] New unit tests from t01 pass

---

### adhoc_260203_s01_t05: Enrich task sync Sprint MERGE with structural properties
**Priority:** HIGH | **Status:** [ ]
**Files:** dashboard/src/app/api/v1/task/sync/route.ts

Add title, epic_id, status to Sprint MERGE in task sync route.

**Acceptance Criteria:**
- [ ] Sprint MERGE ON CREATE sets title, epic_id, status
- [ ] Sprint MERGE ON MATCH only updates synced_at
- [ ] Hierarchy route finds sprints by epic_id
- [ ] Unit tests from t02 pass

---

### adhoc_260203_s01_t06: Change document upload to enrich-only for structural types
**Priority:** HIGH | **Status:** [ ]
**Files:** dashboard/src/app/api/v1/graph/documents/route.ts

For Sprint and Epic types, change from MERGE to MATCH+SET.

**Acceptance Criteria:**
- [ ] Sprint/Epic documents enrich existing nodes only
- [ ] Non-structural types (ADR, Pattern, ContextModule) still use MERGE
- [ ] Content, summary, embedding set correctly on match
- [ ] Graceful handling when structural node does not exist yet
- [ ] Unit tests from t03 pass

---

### adhoc_260203_s01_t07: Add cleanup action to merge existing duplicate nodes
**Priority:** MEDIUM | **Status:** [ ]
**Files:** dashboard/src/app/api/v1/graph/cleanup/route.ts

Add merge-duplicate-structural-nodes action.

**Acceptance Criteria:**
- [ ] Detects duplicate Sprint nodes by canonical ID
- [ ] Merges properties from document node into structural node
- [ ] Transfers CONTAINS and BELONGS_TO relationships
- [ ] Deletes orphan node after merge
- [ ] Dry-run mode for preview

---

### adhoc_260203_s01_t08: Integration test full push cycle
**Priority:** HIGH | **Status:** [ ]
**Files:** packages/cli/src/commands/push/__tests__/push-integration.test.ts

End-to-end test verifying push produces no duplicates.

**Acceptance Criteria:**
- [ ] Push creates exactly N Sprint nodes for N sprint files
- [ ] Each Sprint has both structural and content properties
- [ ] Hierarchy route returns correct children
- [ ] No orphan nodes after push
