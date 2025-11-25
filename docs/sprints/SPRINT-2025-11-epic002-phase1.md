# SPRINT: EPIC-002 Phase 1 - Core Infrastructure (EPIC-002 Sprint 1)

## Sprint Overview

**Sprint Goal**: Prove AI-native sprint graph value with Task → MUST_FOLLOW → ADR relationships
**Duration**: 2 weeks (2025-11-25 to 2025-12-08)
**Type**: Infrastructure sprint (Graph-first architecture)
**Progress:** 100% (4/4 tasks complete)

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
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Validate existing Sprint → Task relationships work with MUST_FOLLOW

**Acceptance Criteria:**
- [x] Verify CONTAINS relationships exist
- [x] Verify NEXT_TASK relationship points to first incomplete
- [x] Add integration tests for full sprint sync

**Implementation:** Created comprehensive integration test suite (18 tests) covering:
- Sprint parsing and metadata extraction
- CONTAINS relationships (Sprint → Task)
- NEXT_TASK relationship logic (first incomplete task)
- MUST_FOLLOW relationships (Task → ADR)
- MODIFIES relationships (Task → File)
- Full sync workflow with edge cases

**Files:**
- Create: `packages/cli/test/integration/sprint-sync.test.ts`

Related: ADR-002, ADR-043, ADR-047

---

### TASK-3: Query Performance Optimization (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Ensure graph queries meet < 200ms target

**Acceptance Criteria:**
- [x] Profile /api/v1/task/{id}/constraints endpoint
- [x] Add indexes if needed
- [x] Document performance baseline

**Implementation:**
- Profiled endpoint: ~650ms avg (infrastructure-bound, not query-bound)
- Created schema migration: `src/graph/schema/008-sprint-task-indexes.cypher`
- Documented baseline: `docs/performance/CONSTRAINTS-API-BASELINE.md`
- Finding: Query itself is fast (~10-50ms), latency is serverless + AuraDB Free Tier
- Decision: Accept current performance for Phase 1; infrastructure optimization in backlog

**Files:**
- Create: `scripts/profile-constraints-api.ts`
- Create: `scripts/apply-task-indexes.ts`
- Create: `src/graph/schema/008-sprint-task-indexes.cypher`
- Create: `docs/performance/CONSTRAINTS-API-BASELINE.md`

Related: ADR-043 performance requirements

---

### TASK-4: Documentation & Testing (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Document the MUST_FOLLOW relationship pattern

**Acceptance Criteria:**
- [x] Update ADR-002 with MUST_FOLLOW examples
- [x] Add unit tests for ADR extraction
- [x] Create example sprint with ADR references

**Implementation:**
- Added MUST_FOLLOW Pattern section to ADR-002 with graph relationship examples
- Created unit test suite: 17 tests for ADR extraction and task status parsing
- Created sprint template with ADR reference documentation

**Files:**
- Update: `docs/adr/ADR-002-ai-readable-code-frontmatter.md`
- Create: `packages/cli/test/unit/adr-extraction.test.ts`
- Create: `docs/templates/SPRINT-TEMPLATE.md`

---

## Related Documents

- **EPIC**: [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- **ADRs**: ADR-002, ADR-043, ADR-047

---

**Sprint Status**: Complete ✅
**Start Date**: 2025-11-25
**Completed**: 2025-11-24
**Created By**: Chris Norton

---

## Sprint Retrospective

### What Went Well
- Parallel agent execution significantly accelerated task completion
- Integration tests (18) and unit tests (17) provide solid coverage
- MUST_FOLLOW pattern successfully documented and implemented

### What Could Be Improved
- Query performance target (< 200ms) not met due to infrastructure constraints
- Neo4j AuraDB Free Tier adds ~600ms latency (serverless + managed DB)

### Key Learnings
- Query optimization has diminishing returns when infrastructure is the bottleneck
- Event-based context loading (ADR-043) works well with sprint graphs
- Frontmatter standards (ADR-002) integrate naturally with MUST_FOLLOW relationships

### Recommendations for Phase 2
- Consider edge caching (Vercel KV) for constraint queries
- Evaluate AuraDB Professional tier for production workloads
- Add batch constraint loading to reduce roundtrips
