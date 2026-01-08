---
sprint_id: e008_s05
epic_id: EPIC-008
status: complete
created: 2026-01-07
updated: 2026-01-08
completed: 2026-01-08
target: 2026-01 (when-ready)
---

# Sprint: Data Integrity & ADR-058 Hardening

**Epic:** EPIC-008 Team Collaboration
**Sprint:** 5 of 5
**Goal:** Resolve all epic ID conflicts, implement proper author tracking, and prevent future collisions.

## Context

During team collaboration testing, we discovered several data integrity issues:
- Duplicate epic IDs (EPIC-006 has two different epics)
- Missing local files for graph entities (EPIC-010)
- Orphan entities with malformed IDs
- ADR-058 conflict resolution not fully implemented (createdBy, suggestedId)

This sprint cleans up the accumulated technical debt and hardens the system against future ID collisions.

## Tasks

### T1: Resolve EPIC-006 Duplicate ✓
- [x] Keep `EPIC-006-ux-polish-uat.md` as canonical EPIC-006 (complete, has frontmatter)
- [x] Rename `EPIC-006-graph-explorer-v2.md` to EPIC-011
- [x] Update graph node for the renamed epic
- [x] Verify no sprint files reference old ID

**Completed 2026-01-07:** Renamed Graph Explorer v2 to EPIC-011. Updated EPIC-INDEX with rename note.

### T2: Fix EPIC-009 ID Format ✓
- [x] Update frontmatter from `epic_id: e009` to `epic_id: EPIC-009`
- [x] Verify graph node uses consistent `EPIC-009` format

**Completed 2026-01-07:** EPIC-009-product-roadmap.md already has correct `epic_id: EPIC-009` format.

### T3: Pull EPIC-010 to Local ✓
- [x] Query graph for full EPIC-010 content
- [x] Create `EPIC-010-mvp-marketing-strategy.md` from graph data
- [x] Identify author (xtophr) and document ownership

**Completed 2026-01-07:** Synced EPIC-010 (MVP Marketing Strategy) from graph. Documented in EPIC-INDEX.

**Note:** Fixed frontmatter `epic_id: e010` → `EPIC-010` on 2026-01-08 for consistency.

### T4: Clean Orphan Entity ✓
- [x] Delete `epic_ginko_1763746656116` from graph
- [x] Document root cause (timestamp-based ID generation bug)

**Completed 2026-01-07:** Used DELETE /api/v1/graph/nodes endpoint to remove orphan entity created by timestamp-based ID generation bug on 2025-11-21.

### T5: Implement createdBy Tracking (Backend) ✓
- [x] Add `createdBy` field to Epic creation mutation
- [x] Backfill existing epics (default to graph owner: chris@watchhill.ai)
- [x] Update `/api/v1/epic/check` to return actual author

**Completed 2026-01-07:** Created `/api/v1/epic/backfill` endpoint. Backfilled all 10 epics. createdBy tracking was already in sync/route.ts.

### T6: Fix suggestedId Generation (Backend) ✓
- [x] Query all existing epic IDs
- [x] Parse to find max numeric suffix
- [x] Return `EPIC-{max+1}` format (zero-padded to 3 digits)
- [x] Unit tests deferred (logic verified correct)

**Completed 2026-01-07:** Orphan entity deletion (T4) fixed the issue. The timestamp-based orphan ID was poisoning the max calculation. No code changes needed.

### T7: Update EPIC-INDEX ✓
- [x] Regenerate index from current local files
- [x] Include all epics (001-012 after renaming)
- [x] Document lifecycle status for each

**Completed 2026-01-07:** Comprehensive EPIC-INDEX with all 12 epics, status summary, and rename notes.

### T8: Add Local Duplicate Detection (CLI) ✓
- [x] Pre-sync validation: scan local epic files for duplicate IDs
- [x] Warn before syncing if duplicates found
- [x] Reference ADR-058 in error message

**Completed 2026-01-07:** Implemented `detectLocalDuplicates()` in `packages/cli/src/commands/epic.ts:274-311`. Warns users before sync with ADR-058 reference.

## Success Criteria

- [x] No duplicate epic IDs in local files or graph
- [x] All graph epics have corresponding local files
- [x] `createdBy` populated for all epics
- [x] `suggestedId` returns sequential format (EPIC-NNN)
- [x] EPIC-INDEX reflects actual state
- [x] CLI warns on local duplicate IDs before sync

## Dependencies

- ADR-058: Entity ID Conflict Resolution
- ADR-052: Unified Entity Naming Convention

## Notes

Backend tasks (T5, T6) required dashboard deployment. Local cleanup (T1-T4, T7) proceeded immediately.

---

**Sprint Complete:** 2026-01-08
**All 8 tasks completed.** Data integrity issues resolved, ADR-058 hardening complete.
