# TASK-P3: Single Clear Next Action Signal

## Problem
Current `ginko start` output had conflicting signals:
- "Resume Point" showed one thing (e.g., "All edge case tests passing")
- "Next Action" showed something else (e.g., "Continue implementing feature")
- Included stale commands like `$ code .ginko/context/index.json` that were often outdated

This created confusion about what to actually do next.

## Solution

### 1. Priority-Based Next Action Logic
Implemented clear priority order in `start-reflection.ts`:

```typescript
// Priority order (TASK-P3):
// 1. If sprint has in_progress task -> "Continue: [task title]"
// 2. If resume event has explicit nextAction -> use it
// 3. Default -> "What would you like to work on?"
```

### 2. Removed Stale Commands
- Removed `suggestedCommand` generation from synthesis layer
- Commands like `code path/to/file` are too specific and often stale
- Single source of truth: sprint task state or latest event

### 3. Coherent Story
Resume Point and Next Action now tell a coherent story:
- **Resume Point**: Summary of where you left off
- **Next Action**: Clear, unambiguous statement of what to do next

### Example Output

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

## Files Changed

### `/packages/cli/src/commands/start/start-reflection.ts`
- Lines 550-593: Implemented priority-based next action logic
- Reconciles sprint task state with resume events
- Removes conflicting command suggestions

### `/packages/cli/src/utils/synthesis.ts`
- Lines 266-315: `generateResumePointFromEvents()` - removed suggestedCommand
- Lines 744-794: `generateResumePoint()` - removed suggestedCommand
- Made next actions generic (display layer reconciles with sprint)

## Testing

To test:
1. `npm run build` (or `cd packages/cli && npm run build`)
2. `ginko start`
3. Verify:
   - Resume Point and Next Action tell coherent story
   - No stale `$ code [file]` commands
   - Sprint task (if present) takes priority in Next Action

## Impact
- Eliminates ambiguity in what to do next
- Reduces cognitive load on session resumption
- Sprint tasks properly prioritized over generic resume points
- No more stale file references
