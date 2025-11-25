# SPRINT: EPIC-002 Phase 1 - Core Infrastructure (EPIC-002 Sprint 1)

## Sprint Overview

**Sprint Goal**: Prove AI-native sprint graph value with Task → MUST_FOLLOW → ADR relationships
**Duration**: 2 weeks (2025-11-25 to 2025-12-08)
**Type**: Infrastructure sprint (Graph-first architecture)
**Progress:** 25% (1/4 tasks complete)

**Success Criteria:**
- Task → MUST_FOLLOW → ADR relationships operational
- AI constraint awareness at session start
- Graph query < 200ms for task constraints
- ADR context visible in ginko start output

---

## Sprint Tasks

### TASK-1: Task → MUST_FOLLOW → ADR Relationships (4-6h)
**Status:** [x] Complete
**Priority:** CRITICAL
**Owner:** Chris Norton

**Goal:** Create MUST_FOLLOW relationships between tasks and ADRs they reference

**Acceptance Criteria:**
- [x] Extract ADR references from sprint task definitions
- [x] Create MUST_FOLLOW relationships in graph sync (ADR-043)
- [x] API endpoint: GET /api/v1/task/{id}/constraints
- [x] Display ADR constraints in ginko start output
- [x] Test with real sprint tasks

**Implementation:**
This task follows ADR-002 (AI-Optimized File Discovery) for constraint extraction
and ADR-043 (Event-Based Context Loading) for graph sync patterns.

**Files:**
- Modify: `packages/cli/src/lib/sprint-loader.ts`
- Modify: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Create: `dashboard/src/app/api/v1/task/[id]/constraints/route.ts`
- Modify: `packages/cli/src/lib/output-formatter.ts`

---

### TASK-2: Sprint → Task Graph Structure Validation (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Validate existing Sprint → Task relationships work with MUST_FOLLOW

**Acceptance Criteria:**
- [ ] Verify CONTAINS relationships exist
- [ ] Verify NEXT_TASK relationship points to first incomplete
- [ ] Add integration tests for full sprint sync

**Files:**
- Create: `packages/cli/test/integration/sprint-sync.test.ts`

Related: ADR-002, ADR-043, ADR-047

---

### TASK-3: Query Performance Optimization (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Ensure graph queries meet < 200ms target

**Acceptance Criteria:**
- [ ] Profile /api/v1/task/{id}/constraints endpoint
- [ ] Add indexes if needed
- [ ] Document performance baseline

Related: ADR-043 performance requirements

---

### TASK-4: Documentation & Testing (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Document the MUST_FOLLOW relationship pattern

**Acceptance Criteria:**
- [ ] Update ADR-002 with MUST_FOLLOW examples
- [ ] Add unit tests for ADR extraction
- [ ] Create example sprint with ADR references

**Files:**
- Modify: `docs/adr/ADR-002-ai-readable-code-frontmatter.md`

---

## Related Documents

- **EPIC**: [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- **ADRs**: ADR-002, ADR-043, ADR-047

---

**Sprint Status**: In Progress
**Start Date**: 2025-11-25
**Created By**: Chris Norton
