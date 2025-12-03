# TASK-P3: Single Clear Next Action Signal - Implementation Summary

## Problem Statement
The `ginko start` command output had conflicting signals about what to do next:
- Resume Point showed one thing (e.g., "All edge case tests passing")
- Next Action showed something different (e.g., "Continue implementing feature")
- Stale commands like `$ code .ginko/context/index.json` were displayed that might be outdated
- Sprint task state wasn't properly reconciled with resume events

## Solution Implemented

### 1. Priority-Based Next Action Logic
Implemented a clear priority order in the display layer (`start-reflection.ts`):

```typescript
// Priority order (TASK-P3):
// 1. If sprint has in_progress task -> "Continue: [task title]"
// 2. If resume event has explicit nextAction -> use it
// 3. Default -> "What would you like to work on?"
```

### 2. Single Source of Truth
- Sprint task state takes priority over synthesis events
- Resume Point and Next Action now tell a coherent story
- No conflicting information displayed to user

### 3. Removed Stale Commands
- Removed `suggestedCommand` generation from synthesis layer
- Commands like `code path/to/file` are too specific and often stale
- Context files only shown when relevant (no sprint task present)

## Files Changed

### `/packages/cli/src/commands/start/start-reflection.ts`
**Lines 550-595**: Implemented priority-based next action logic
- Checks sprint task state first
- Falls back to synthesis resume point
- Provides generic fallback if neither available
- Removes display of stale suggested commands

### `/packages/cli/src/utils/synthesis.ts`
**Lines 266-315**: Updated `generateResumePointFromEvents()`
- Removed `suggestedCommand` generation (now returns empty string)
- Made next actions more generic
- Display layer reconciles with sprint task state

**Lines 744-794**: Updated `generateResumePoint()`
- Same changes as above for consistency
- Both static and instance methods updated

## Testing

### Build Status
✅ CLI builds successfully (`cd packages/cli && npm run build`)

### Test Results
✅ Synthesis tests pass (24/24 passing)
✅ Sprint loader tests pass
✅ No regression in core functionality

Pre-existing test failures unrelated to this task:
- Some validator tests have pre-existing issues
- Document tests have missing vitest dependencies
- These were failing before TASK-P3 changes

## Impact

### User Experience Improvements
1. **Eliminates ambiguity**: Single, clear next action signal
2. **Reduces cognitive load**: No conflicting information to reconcile
3. **Sprint-aware**: In-progress tasks properly prioritized
4. **No stale references**: Removed outdated file/command suggestions

### Before/After Example

**Before:**
```
⚡ Resume Point:
   All edge case tests passing (test-suite.ts)

📍 Next Action:
   Continue implementing feature
   $ code .ginko/context/index.json

📋 Active Sprint Tasks:
   [@] TASK-P3: Single Clear Next Action Signal
```

**After:**
```
⚡ Resume Point:
   All edge case tests passing

📍 Next Action:
   Continue: Single Clear Next Action Signal

📋 Active Sprint Tasks:
   [@] TASK-P3: Single Clear Next Action Signal
```

## Next Steps

1. ✅ Build and test changes
2. ✅ Document implementation
3. ⏳ Manual testing with `ginko start` in live session
4. ⏳ Commit changes to repository

## Technical Notes

### Design Decision: Display Layer Priority
The priority logic lives in the **display layer** (start-reflection.ts) rather than the synthesis layer because:
1. Synthesis should remain generic and reusable
2. Display layer has access to both sprint and synthesis data
3. Easier to modify display behavior without changing synthesis logic
4. Single responsibility: synthesis generates data, display reconciles it

### Empty Suggested Commands
Returning empty strings for `suggestedCommand` maintains interface compatibility while removing the problematic feature. Future refactoring could remove the field entirely from the `ResumePoint` interface.

## Related Files

- Primary implementation: `/packages/cli/src/commands/start/start-reflection.ts`
- Synthesis updates: `/packages/cli/src/utils/synthesis.ts`
- Sprint loader (provides task state): `/packages/cli/src/lib/sprint-loader.ts`
- Documentation: `/docs/changes/TASK-P3-single-next-action.md`
