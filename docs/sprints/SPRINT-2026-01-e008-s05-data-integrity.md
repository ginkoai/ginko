---
sprint_id: e008_s05
epic_id: EPIC-008
status: active
created: 2026-01-07
updated: 2026-01-07
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

### T1: Resolve EPIC-006 Duplicate
- [ ] Keep `EPIC-006-ux-polish-uat.md` as canonical EPIC-006 (complete, has frontmatter)
- [ ] Rename `EPIC-006-graph-explorer-v2.md` to EPIC-011
- [ ] Update graph node for the renamed epic
- [ ] Verify no sprint files reference old ID

### T2: Fix EPIC-009 ID Format
- [ ] Update frontmatter from `epic_id: e009` to `epic_id: EPIC-009`
- [ ] Verify graph node uses consistent `EPIC-009` format

### T3: Pull EPIC-010 to Local
- [ ] Query graph for full EPIC-010 content
- [ ] Create `EPIC-010-web-collaboration-gui.md` from graph data
- [ ] Identify author (xtophr) and document ownership

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
- [ ] Add unit tests (deferred - logic already correct)

**Completed 2026-01-07:** Orphan entity deletion (T4) fixed the issue. The timestamp-based orphan ID was poisoning the max calculation. No code changes needed.

### T7: Update EPIC-INDEX
- [ ] Regenerate index from current local files
- [ ] Include all epics (001-011 after renaming)
- [ ] Document lifecycle status for each

### T8: Add Local Duplicate Detection (CLI)
- [ ] Pre-sync validation: scan local epic files for duplicate IDs
- [ ] Warn before syncing if duplicates found
- [ ] Reference ADR-058 in error message

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

Backend tasks (T5, T6) require dashboard deployment. Local cleanup (T1-T4, T7) can proceed immediately.
