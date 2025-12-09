# SPRINT: adhoc_251209_s01 - Unified Entity Naming Convention

## Sprint Overview

**Sprint ID:** `adhoc_251209_s01`
**Sprint Goal**: Establish unified naming convention for graph entities (epics, sprints, tasks) to support multi-worker collaboration and observability.

**Duration**: Ad-hoc (system maintenance)
**Type**: Foundation/Infrastructure
**Progress:** 60% (3/5 tasks complete)

**Success Criteria:**
- [x] ADR-052 documents naming convention
- [ ] Sprint sync uses new ID format
- [ ] Existing graph entities migrated or deprecated
- [ ] Local sprint files use new format
- [ ] Round-trip sync validated

---

## Sprint Tasks

### adhoc_251209_s01_t01: Draft ADR-052 (Naming Convention)
**Status:** [x] Complete
**Priority:** CRITICAL

**Goal:** Document the unified entity naming convention.

**Deliverables:**
- ADR-052 with format specification
- Padding rules for sortability
- Ad-hoc work convention
- Migration strategy

**Files:**
- `docs/adr/ADR-052-unified-entity-naming-convention.md`

---

### adhoc_251209_s01_t02: Update CLAUDE.md with Ad-hoc Nudge
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Add instructions for AI assistants to prompt users when work falls outside sprint scope.

**Deliverables:**
- New reflex #9 "Track This Work"
- Entity naming convention reference section
- Ad-hoc task creation guidance
- Updated ai-instructions-template.ts for `ginko init`

**Files:**
- `CLAUDE.md`
- `packages/cli/src/templates/ai-instructions-template.ts`

---

### adhoc_251209_s01_t03: Clean Slate Migration
**Status:** [x] Complete
**Priority:** CRITICAL

**Goal:** Delete all old task nodes from graph and add DELETE endpoint.

**Accomplishments:**
- Added DELETE endpoint to `/api/v1/graph/nodes`
- Deployed to production
- Deleted 33 old task nodes with inconsistent naming
- Graph now has 0 Task nodes (clean slate)

**Files:**
- `dashboard/src/app/api/v1/graph/nodes/route.ts`

---

### adhoc_251209_s01_t04: Update Sprint Sync to Use New IDs
**Status:** [ ] Not Started
**Priority:** CRITICAL

**Goal:** Modify sprint sync logic to generate entity IDs in the new format.

**Implementation:**
- Parse epic number from sprint file metadata or filename
- Generate task IDs as `e{NNN}_s{NN}_t{NN}`
- Support ad-hoc format detection and generation
- Add validation for ID format

**Files:**
- `packages/cli/src/lib/sprint-parser.ts`
- `dashboard/src/app/api/v1/sprint/sync/route.ts`

Follow: ADR-052

---

### adhoc_251209_s01_t05: Validate Sync Round-Trip
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Verify that sprint file → graph → query returns consistent IDs.

**Test Cases:**
1. Sync new sprint, verify task IDs match format
2. Query tasks by sprint, verify all returned
3. Update task status locally, re-sync, verify graph updated
4. Create ad-hoc sprint, verify format correct

**Files:**
- `packages/cli/test/integration/sprint-sync.test.ts`

---

## Accomplishments This Sprint

### 2025-12-09: ADR-052 Drafted
- Documented unified naming convention: `e{NNN}_s{NN}_t{NN}`
- Defined ad-hoc format: `adhoc_{YYMMDD}_s{NN}_t{NN}`
- Added padding rules for sortability
- Identified observability anti-pattern (untracked work)

### 2025-12-09: CLAUDE.md Updated
- Added reflex #9 "Track This Work" for ad-hoc prompting
- Added Entity Naming Convention section
- Referenced ADR-052

### 2025-12-09: ai-instructions-template.ts Updated
- Added Entity Naming Convention section (generated on `ginko init`)
- Added reflex #5 "Track This Work" to template
- Ensures new projects get naming convention guidance

### 2025-12-09: Clean Slate Migration Complete
- Added DELETE endpoint to `/api/v1/graph/nodes`
- Deployed to production via Vercel
- Deleted 33 old task nodes with inconsistent naming (timestamps, TASK-N stubs)
- Graph now has 0 Task nodes - ready for re-sync with new format

---

## Next Steps

1. Update sprint parser to generate new ID format
2. Decide on migration approach for existing 33+ task nodes
3. Update current EPIC-005 sprint file to use new IDs

---

## Blockers

None currently.

---

## Related

- ADR-052: Unified Entity Naming Convention
- EPIC-005 Sprint 1: Market Readiness (needs ID migration)
