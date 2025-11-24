# SPRINT: 2025-003 Post-EPIC-001 Polish & UX

## Sprint Overview

**Sprint Goal**: Polish `ginko start` output for optimal human and AI UX after EPIC-001 completion.

**Epic**: Post EPIC-001 - Cleanup & Polish

**Duration**: 1-2 days

**Type**: Polish sprint

**Philosophy**: Fresh AI rated readiness at 7.5/10. Target 9/10 by reducing friction and improving signal clarity.

**Success Criteria:**
- Human output ≤20 lines (currently ~80)
- Single clear "next action" signal (currently ambiguous)
- Sprint progress matches reality (fix stale data display)
- Stale session data pruned

**Progress:** 100% (6/6 tasks complete) ✅ SPRINT COMPLETE

---

## Root Cause Analysis

### Issue 1: Sprint Progress Discrepancy
**Symptom**: Display shows "0/4 complete (0%)" but completed list shows TASK-10, 11, 12, 13 all done.
**Root Cause**: Sprint file `SPRINT-2026-02-polish-and-validation.md` has conflicting data:
- Line 22: `**Progress:** 100% (4/4 tasks complete) ✅ SPRINT COMPLETE`
- Line 462-464: `**Sprint Status**: In Progress` and `**Progress**: 25% (1/4 tasks complete)`
**Fix**: Remove stale footer, sync progress header with task status checkboxes.

### Issue 2: Information Density Too High
**Symptom**: 80+ lines of output. Human can't scan quickly.
**Root Cause**: TASK-11's dual output system created but `--concise` flag not default. AI context stored to `.jsonl` file but console still verbose.
**Fix**: Make concise the default for console, rich output only with `--verbose`.

### Issue 3: Ambiguous Next Action
**Symptom**: "Next Action" says "Continue implementing feature" but resume point says "All edge case tests passing".
**Root Cause**: Event-based context pulls from multiple sources (resume event, next action hint, sprint task) without reconciliation.
**Fix**: Single source of truth for next action: most recent relevant event OR explicit sprint task marker.

### Issue 4: Stale Session Cursors
**Symptom**: 47 cursors in `cursors.json`, most from Nov 5-7, all marked "active" but clearly orphaned.
**Root Cause**: Sessions created but never properly closed. No garbage collection.
**Fix**: Prune cursors older than 7 days with no activity.

---

## Sprint Tasks

### TASK-P1: Fix Sprint File Data Conflicts
**Status:** [x] COMPLETE
**Effort:** 30 min
**Priority:** HIGH

**Goal:** Resolve conflicting progress data in sprint files

**Acceptance Criteria:**
- [x] Remove stale footer from SPRINT-2026-02-polish-and-validation.md
- [x] Ensure progress line matches task checkbox state
- [x] Mark EPIC-001 sprints as COMPLETE in their files

**Completed Actions:**
- Fixed SPRINT-2026-02-polish-and-validation.md footer (was 25%, now 100%)
- Updated CURRENT-SPRINT.md to mark EPIC-001 as complete

**Files:**
- docs/sprints/SPRINT-2026-02-polish-and-validation.md
- docs/sprints/CURRENT-SPRINT.md

---

### TASK-P2: Make Concise Output Default
**Status:** [x] COMPLETE
**Effort:** 2-3 hours
**Priority:** CRITICAL

**Goal:** Reduce console output to ≤20 lines by default

**Acceptance Criteria:**
- [x] Console output ≤20 lines for typical session
- [x] Remove `--concise` flag, make it default behavior
- [x] Add `--verbose` flag to show full output (current behavior)
- [x] Key sections only: Flow state, Resume point, Next action, Warnings

**Completed Actions:**
- Swapped default: concise is now default, `--verbose` shows full output
- Redesigned `formatHumanOutput()` in output-formatter.ts
- Updated CLI flags in index.ts (deprecated `--minimal`, removed `--concise`)
- New format: Status line, Resume, Sprint, Branch, Warnings, Next action

**Files:**
- packages/cli/src/commands/start/start-reflection.ts
- packages/cli/src/lib/output-formatter.ts
- packages/cli/src/index.ts

---

### TASK-P3: Single Next Action Signal
**Status:** [x] COMPLETE
**Effort:** 1-2 hours
**Priority:** HIGH

**Goal:** Clear, unambiguous "what to do next" signal

**Acceptance Criteria:**
- [x] Single source of truth for next action
- [x] Priority order: Explicit sprint task marker > Most recent event hint > Generic prompt
- [x] No conflicting signals (resume point vs next action vs sprint task)
- [x] Remove "$ code .ginko/context/index.json" style commands (too specific)

**Completed Actions:**
- Implemented priority-based next action logic in start-reflection.ts
- Removed `suggestedCommand` generation from synthesis.ts
- Sprint in-progress tasks now take precedence over stale resume events
- Resume point and next action now tell coherent story

**Files:**
- packages/cli/src/commands/start/start-reflection.ts
- packages/cli/src/utils/synthesis.ts

---

### TASK-P4: Prune Stale Session Cursors
**Status:** [x] COMPLETE
**Effort:** 1 hour
**Priority:** MEDIUM

**Goal:** Clean up orphaned session cursors

**Acceptance Criteria:**
- [x] Remove cursors older than 7 days with no activity
- [x] Keep only most recent active cursor per branch
- [ ] Add cursor cleanup on `ginko start` (automatic) - deferred
- [x] Reduce cursors.json from 47 entries to ~5

**Completed Actions:**
- Cleaned cursors.json: 47 → 1 cursor (kept most recent)
- Removed all cursors with last_active before 2025-11-17
- File reduced from 545 lines to 18 lines

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/cursors.json

---

### TASK-P5: Archive Completed Sprint Files
**Status:** [x] COMPLETE
**Effort:** 30 min (actual)
**Priority:** LOW

**Goal:** Move completed sprints to archive to reduce noise

**Acceptance Criteria:**
- [x] Move SPRINT-2025-* completed files to docs/sprints/archive/
- [x] Keep only active/future sprints in main folder
- [x] Update CURRENT-SPRINT.md to point to new sprint

**Completed Actions:**
- Archived 6 completed sprint files (Oct 27, Nov 10, Nov 18 sprints)
- Archived 5 old planning documents
- Updated CURRENT-SPRINT.md to reference SPRINT-2025-11-24-polish-ux
- Main folder now contains only active/future sprints

**Files:**
- docs/sprints/*.md
- docs/sprints/archive/

---

### TASK-P6: Validate 9/10 AI Readiness
**Status:** [x] COMPLETE
**Effort:** 30 min
**Priority:** HIGH

**Goal:** Confirm polishing achieved target readiness

**Acceptance Criteria:**
- [x] Fresh `ginko start` produces ≤20 lines (actual: 10 lines)
- [x] AI can identify clear next action in <5 seconds
- [x] No conflicting or confusing signals
- [x] Rate readiness at 8.5-9/10

**Validation Results:**
- Output reduced from ~80 lines to 10 human-relevant lines
- Clear status line: "Ready | Hot (10/10) | Think & Build mode"
- Single resume point (no conflicting signals)
- Sprint task clearly marked with [@]
- Branch + uncommitted count visible
- Single "Next:" action prompt
- AI readiness: **8.5-9/10** (up from 7.5/10)

---

## Testing & Validation

**Validation Protocol:**
1. Run `ginko start` after all tasks complete
2. Count output lines (target: ≤20)
3. Time to identify next action (target: <5 seconds)
4. Rate subjective readiness (target: 9/10)
5. Document any remaining friction

---

## Related Documents

- **Completed**: [EPIC-001 Sprints](./SPRINT-2026-02-polish-and-validation.md)
- **ADRs**: ADR-047, ADR-048

---

**Sprint Status**: COMPLETE ✅
**Last Updated**: 2025-11-24
**Progress**: 100% (6/6 tasks complete)
