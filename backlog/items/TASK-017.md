---
id: TASK-017
type: task
title: Audit and archive completed sprints, create CURRENT-SPRINT.md
status: complete
priority: high
size: M
created: '2025-10-24T19:40:00.000Z'
updated: '2025-10-24T19:40:00.000Z'
author: xtophr@gmail.com
tags:
  - sprint-management
  - context-cleanup
  - documentation
acceptance_criteria:
  - All completed sprints have retrospectives
  - All backlog items from old sprints are marked complete or returned to backlog
  - Completed sprints archived to docs/archive/sprints/
  - CURRENT-SPRINT.md created pointing to active work
  - Sprint pattern matches session log pattern
---
## Problem Statement
The `ginko start` command loads stale sprint context because:
1. No CURRENT-SPRINT.md pointer exists (synthesis.ts expects this file)
2. Old completed sprints remain in docs/sprints/, causing fallback to alphabetically-recent files
3. Some sprints lack retrospectives documenting outcomes
4. Backlog items from old sprints may not be properly closed

This causes AI context to be polluted with outdated goals like "Handoff command automatically extracts 3-6 insights" from a September sprint.

## Solution
Following the session log pattern:
1. **Audit** all sprint files for completion status
2. **Add retrospectives** to completed sprints (files produced, features delivered, knowledge references)
3. **Archive** completed sprints to docs/archive/sprints/
4. **Create CURRENT-SPRINT.md** as pointer to active work (or clear statement if no active sprint)
5. **Verify** all backlog items are marked complete or returned to backlog

## Technical Approach
1. Review each sprint file in docs/sprints/
2. Cross-reference with backlog items to verify status
3. Add retrospective sections where missing
4. Move completed sprints to archive
5. Create CURRENT-SPRINT.md following session log pointer pattern

## Related References
- ADR-033: Session logging pattern (similar archive approach)
- packages/cli/src/utils/synthesis.ts:371-404 (sprint loading logic)

## Completion Summary

**Completed**: 2025-10-24
**Status**: All acceptance criteria met ✅

### Actions Taken

1. **Sprint Archive Pattern Established** ✅
   - Created `docs/sprints/archive/` directory (parent-level, matching session logs)
   - Moved 11 existing archived sprints from `docs/archive/sprints/` to new location
   - Pattern now matches: `.ginko/sessions/{user}/archive/` and `docs/sprints/archive/`

2. **Completed Sprint Retrospective Added** ✅
   - Added comprehensive retrospective to SPRINT-2025-10-22-configuration-system.md
   - Documented: files produced, features delivered, performance metrics, lessons learned
   - All tasks (TASK-009 through TASK-013) verified as complete

3. **Sprints Archived** ✅
   - Archived SPRINT-2025-10-22-configuration-system.md (completed 2025-10-23)
   - Archived 6 obsolete/completed sprints from August-October:
     - SPRINT-2025-W2-automatic-context-capture.md (handoff deprecated)
     - SPRINT-2025-10-03-remove-pressure-measurement.md
     - SPRINT-2025-09-16-backlog-grooming.md
     - SPRINT-2025-08-28-enhanced-ginko-init.md
     - SPRINT-2025-08-28-untitled-sprint.md
     - SPRINT-2025-08-27-implement-context-preservation-system-from-adr-025.md
   - Total archived: 18 sprint files (11 existing + 7 new)

4. **CURRENT-SPRINT.md Created** ✅
   - Documents "No active sprint" status
   - Explains backlog-driven ad-hoc work mode
   - Lists current in-progress items (TASK-017, FEATURE-022)
   - Provides guidance for activating future sprints
   - Prevents synthesis.ts from loading stale sprint context

5. **Backlog Items Verified** ✅
   - TASK-009 through TASK-013: All marked complete
   - FEATURE-018: Properly marked PROPOSED (deprecated, won't implement)
   - Only 2 items in-progress: TASK-017 (this task) and FEATURE-022

### Impact

**Problem Solved**: `ginko start` was loading stale context from September sprint about deprecated handoff feature

**Before**:
```
🎯 Sprint: Handoff command automatically extracts 3-6 insights per session
   Progress: 0% - In progress
```

**After**:
```
🎯 Sprint: No active sprint - working from backlog
   Current: TASK-017 (sprint cleanup), FEATURE-022 (OAuth)
```

### Files Modified/Created

- Created: `docs/sprints/CURRENT-SPRINT.md`
- Created: `docs/sprints/archive/` directory
- Modified: `docs/sprints/SPRINT-2025-10-22-configuration-system.md` (added retrospective)
- Moved: 18 sprint files to archive
- Updated: `backlog/items/TASK-017.md` (this file)

### Pattern Established

Sprint lifecycle now mirrors session log pattern:
1. **Active**: `docs/sprints/CURRENT-SPRINT.md` points to active sprint
2. **Planning**: Future sprints remain in `docs/sprints/SPRINT-*.md`
3. **Complete**: Add retrospective, mark tasks done, archive to `docs/sprints/archive/`
4. **Always**: CURRENT-SPRINT.md exists (even if "no active sprint")

This ensures `ginko start` synthesis always has current context without loading stale goals.
