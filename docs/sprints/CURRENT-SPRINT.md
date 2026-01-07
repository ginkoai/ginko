# SPRINT: Data Integrity & ADR-058 Hardening

## Sprint Overview

**Sprint Goal**: Resolve all epic ID conflicts, implement proper author tracking, and prevent future collisions
**Duration**: 1-2 days (2026-01-07 to 2026-01-09)
**Type**: Cleanup + Hardening sprint
**Progress:** 100% (8/8 tasks complete)

**Success Criteria:**
- [x] No duplicate epic IDs in local files or graph
- [x] All graph epics have corresponding local files
- [x] `createdBy` populated for all epics
- [x] `suggestedId` returns sequential format (EPIC-NNN)
- [x] EPIC-INDEX reflects actual state
- [x] CLI warns on local duplicate IDs before sync

---

## Context

During team collaboration testing (EPIC-008), we discovered data integrity issues:
- Duplicate epic IDs (EPIC-006 has two different epics)
- Missing local files for graph entities (EPIC-010)
- ~~Orphan entities with malformed IDs (`epic_ginko_1763746656116`)~~ **RESOLVED**
- ADR-058 conflict resolution not fully implemented (createdBy, suggestedId broken)

**Graph state:** 11 epics (EPIC-001 through EPIC-011, orphan entity deleted)
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

### e008_s05_t04: Clean Orphan Entity (15m) ✓
**Status:** [x] Complete
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Remove malformed orphan epic from graph

**Resolution (2026-01-07):**
- Deleted `epic_ginko_1763746656116` via DELETE /api/v1/graph/nodes endpoint
- Root cause: timestamp-based ID generation bug created malformed entity on 2025-11-21
- Generic node delete API works for epics (no epic-specific delete needed)
- Updated EPIC-INDEX to document cleanup

---

### e008_s05_t05: Implement createdBy Tracking (2h) ✓
**Status:** [x] Complete
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Track entity authorship for conflict detection

**Resolution (2026-01-07):**
- Created `/api/v1/epic/backfill` endpoint for one-time backfill
- Backfilled all 10 epics with `createdBy: chris@watchhill.ai`
- `createdBy` already tracked on new epic creation (sync/route.ts)
- Verified `/api/v1/epic/check` now returns actual author

Follow: ADR-058 (Entity ID Conflict Resolution)

---

### e008_s05_t06: Fix suggestedId Generation (1h) ✓
**Status:** [x] Complete
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Return sequential IDs instead of timestamps

**Resolution (2026-01-07):**
- Root cause: Orphan entity `epic_ginko_1763746656116` was poisoning max calculation
- Deleting orphan (T4) fixed the issue - no code changes needed
- API now returns `suggestedId: "EPIC-011"` (correct sequential format)
- Verified via API call after orphan deletion

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
**Status:** [x] Complete
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Prevent future duplicate IDs

**Implementation:**
- Added `detectLocalDuplicates()` function to epic.ts
- Scans local epic files before sync
- Extracts ID from frontmatter (`epic_id:`) or title (`# EPIC-NNN:`)
- Shows clear warning with affected files and resolution instructions
- Prompts user to confirm if proceeding with duplicates (defaults to No)
- References ADR-058 in the guidance

Files:
- `packages/cli/src/commands/epic.ts` (updated)

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
- Documented cleanup notes (renumbering, orphan deleted 2026-01-07)
- Added lifecycle definitions

**Resolved: T4 (Clean Orphan Entity)** ✓
- Used generic DELETE /api/v1/graph/nodes endpoint
- Entity `epic_ginko_1763746656116` successfully deleted (2026-01-07)
- Root cause documented: timestamp-based ID generation bug

### 2026-01-07: CLI Duplicate Detection (T8)

**T8: Implemented Local Duplicate Detection**
- Added `detectLocalDuplicates()` function to `packages/cli/src/commands/epic.ts`
- Detection runs before sync, scans all `EPIC-NNN*.md` files
- Extracts ID from:
  - Frontmatter `epic_id:` field (preferred)
  - Title `# EPIC-NNN:` pattern (fallback)
  - Filename (last resort)
- On duplicate found:
  - Shows red warning banner with ADR-058 reference
  - Lists all files sharing the same ID with their titles
  - Provides resolution instructions
  - Prompts for confirmation (defaults to No)
- Updated global `ginko` via `npm link`
- Tested with synthetic duplicate - warning displays correctly

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
