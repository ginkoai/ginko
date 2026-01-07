# SPRINT: Data Integrity & ADR-058 Hardening

## Sprint Overview

**Sprint Goal**: Resolve all epic ID conflicts, implement proper author tracking, and prevent future collisions
**Duration**: 1-2 days (2026-01-07 to 2026-01-09)
**Type**: Cleanup + Hardening sprint
**Progress:** 50% (4/8 tasks complete)

**Success Criteria:**
- [ ] No duplicate epic IDs in local files or graph
- [ ] All graph epics have corresponding local files
- [ ] `createdBy` populated for all epics
- [ ] `suggestedId` returns sequential format (EPIC-NNN)
- [ ] EPIC-INDEX reflects actual state
- [ ] CLI warns on local duplicate IDs before sync

---

## Context

During team collaboration testing (EPIC-008), we discovered data integrity issues:
- Duplicate epic IDs (EPIC-006 has two different epics)
- Missing local files for graph entities (EPIC-010)
- Orphan entities with malformed IDs (`epic_ginko_1763746656116`)
- ADR-058 conflict resolution not fully implemented (createdBy, suggestedId broken)

**Graph state:** 11 epics (EPIC-001 through EPIC-010 + 1 orphan)
**Local state:** 9 files (with 1 duplicate ID)

---

## Sprint Tasks

### e008_s05_t01: Resolve EPIC-006 Duplicate (30m)
**Status:** [x] Complete
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Eliminate duplicate EPIC-006 files

**Current State:**
- `EPIC-006-ux-polish-uat.md` - "UX Polish and UAT" (Complete, proper frontmatter)
- `EPIC-006-graph-explorer-v2.md` - "Graph Explorer v2" (Proposed, no frontmatter)

**Action:**
- Keep `EPIC-006-ux-polish-uat.md` as canonical EPIC-006
- Rename `EPIC-006-graph-explorer-v2.md` to `EPIC-011-graph-explorer-v2.md`
- Update epic_id frontmatter to EPIC-011
- Sync renamed epic to graph

---

### e008_s05_t02: Fix EPIC-009 ID Format (15m)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Fix inconsistent ID format

**Current State:**
- Local file has `epic_id: e009` (lowercase)
- Graph has `EPIC-009` (uppercase)

**Action:**
- Update frontmatter to `epic_id: EPIC-009`
- Verify graph node consistency

---

### e008_s05_t03: Pull EPIC-010 to Local (30m)
**Status:** [x] Complete
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Create local file for graph-only epic

**Current State:**
- Exists in graph: "Web Collaboration GUI" (created 2026-01-06)
- No local file
- Created by: xtophr (attributed as "unknown" due to bug)

**Action:**
- Query graph for full EPIC-010 content
- Create `EPIC-010-web-collaboration-gui.md`
- Add proper frontmatter

---

### e008_s05_t04: Clean Orphan Entity (15m)
**Status:** [ ] Blocked (needs backend)
**Priority:** MEDIUM
**Assigned:** (requires backend access)

**Goal:** Remove malformed orphan epic from graph

**Current State:**
- Entity ID: `epic_ginko_1763746656116`
- Created: 2025-11-21
- No title, no content
- Likely created by timestamp-based ID generation bug

**Action:**
- Delete from graph via Neo4j or dashboard admin
- No public delete API available for epics
- Document root cause in ADR-058 implementation notes

---

### e008_s05_t05: Implement createdBy Tracking (2h)
**Status:** [ ] Pending
**Priority:** HIGH
**Assigned:** (requires backend)

**Goal:** Track entity authorship for conflict detection

**Current State:**
- All entities return `createdBy: "unknown"`
- ADR-058 conflict check can't distinguish authors

**Action:**
- Add `createdBy` field to Epic creation mutation
- Backfill existing epics (default to graph owner)
- Update `/api/v1/epic/check` to return actual author

Follow: ADR-058 (Entity ID Conflict Resolution)

---

### e008_s05_t06: Fix suggestedId Generation (1h)
**Status:** [ ] Pending
**Priority:** HIGH
**Assigned:** (requires backend)

**Goal:** Return sequential IDs instead of timestamps

**Current State:**
- API returns `suggestedId: "EPIC-1763746656117"` (timestamp)
- Should return `suggestedId: "EPIC-011"` (sequential)

**Action:**
- Query all existing epic IDs
- Parse to find max numeric suffix
- Return `EPIC-{max+1}` format (zero-padded to 3 digits)
- Add unit tests

---

### e008_s05_t07: Update EPIC-INDEX (30m)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Synchronize index with actual state

**Current State:**
- Index shows: 001, 002, 005, 006, 009
- Reality: 001-011 (after renaming)

**Action:**
- Regenerate index from local files
- Include lifecycle status for each epic
- Add last-updated timestamp

---

### e008_s05_t08: Add Local Duplicate Detection (1h)
**Status:** [ ] Pending
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Prevent future duplicate IDs

**Action:**
- Add pre-sync validation in CLI
- Scan local epic files for duplicate IDs
- Warn before syncing if duplicates found
- Reference ADR-058 in error message

Files:
- `packages/cli/src/commands/epic.ts` (update)

---

## Accomplishments This Sprint

### 2026-01-07: Local Data Cleanup (T1, T2, T3, T7)

**T1: Resolved EPIC-006 Duplicate**
- Kept `EPIC-006-ux-polish-uat.md` as canonical EPIC-006 ("UX Polish and UAT", Complete)
- Renamed `EPIC-006-graph-explorer-v2.md` to `EPIC-011-graph-explorer-v2.md`
- Added proper frontmatter with `epic_id: EPIC-011`
- Added note documenting the renumbering

**T2: Fixed EPIC-009 ID Format**
- Updated frontmatter from `epic_id: e009` to `epic_id: EPIC-009`
- Ensures consistent uppercase format across all epics

**T3: Created EPIC-010 Local File**
- Created `EPIC-010-web-collaboration-gui.md` from graph metadata
- Title: "Web Collaboration GUI", created by xtophr on 2026-01-06
- Stub file - full content to be added by original author
- Note: Graph API doesn't expose full Epic content, only metadata

**T7: Updated EPIC-INDEX**
- Regenerated index with all 11 epics (001-011)
- Added status summary table
- Documented cleanup notes (renumbering, orphan pending deletion)
- Added lifecycle definitions

**Blocked: T4 (Clean Orphan Entity)**
- No public delete API for epics
- Entity `epic_ginko_1763746656116` still in graph
- Requires backend/Neo4j access to delete

---

## Next Steps

After cleanup:
1. Backend deployment for T5/T6
2. Consider automation to keep EPIC-INDEX in sync
3. Add similar duplicate detection for Sprints and Tasks

---

## Sprint Metadata

**Epic:** EPIC-008 (Team Collaboration)
**Sprint ID:** e008_s05
**Created:** 2026-01-07
**Participants:** Chris Norton, Claude
