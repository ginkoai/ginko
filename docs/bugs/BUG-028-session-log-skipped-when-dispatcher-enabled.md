# Bug Report - 2026-02-23

## Session Context
- **Reporter:** Reese / Claude Opus 4.5
- **Project:** Ginko CLI
- **CLI Version:** 2.5.0
- **Branch:** feature/sunset-rebrand

---

## BUG-028: ginko log skips local session log when dispatcher is enabled [HIGH]

**Status:** Open
**Severity:** HIGH
**Component:** CLI / Session Logging

### Description
`ginko log` writes events to the event stream (`current-events.jsonl`) but does NOT write to the local session log file (`current-session-log.md`) when the WriteDispatcher is initialized. This breaks session continuity and handoff quality.

### Steps to Reproduce
1. Authenticate with `ginko login`
2. Start a session with `ginko start` (creates `current-session-log.md`)
3. Run `ginko log "Test entry" --category=insight`
4. Check `ginko status` - shows "Session Logging: Active, Entries: 0"
5. Read `.ginko/sessions/[user]/current-session-log.md` - file has template only, no entries

### Evidence
```bash
# Log command succeeds
$ ginko log "Testing session log write" --category=insight
✓ Event logged: insight (medium impact) (auto-detected)

# But session log is empty
$ ginko status
📝 Session Logging
  Status: Active
  Entries: 0    # <-- Should be 1
  Files: 0

# Event stream has the entry
$ tail -1 .ginko/sessions/reese-at-ginkoai-com/current-events.jsonl
{"category":"insight","description":"Testing session log write",...}

# Session log file is empty (only template)
$ cat .ginko/sessions/reese-at-ginkoai-com/current-session-log.md
# Shows only YAML frontmatter and section headers, no entries
```

### Expected Behavior
`ginko log` should write to BOTH:
1. Event stream (`current-events.jsonl`) - for graph sync
2. Session log (`current-session-log.md`) - for local context/handoff

### Actual Behavior
When WriteDispatcher is initialized (authenticated users), only event stream receives the entry. Session log file is skipped entirely.

### Root Cause
**File:** `packages/cli/src/utils/dispatcher-logger.ts`
**Lines:** 39-60

```typescript
export async function appendLogEntry(
  sessionDir: string,
  entry: LogEntry,
  userEmail?: string
): Promise<void> {
  // Check if dispatcher is available
  if (isDispatcherInitialized()) {
    try {
      const dispatcher = getDispatcher();
      const document: KnowledgeDocument = convertLogEntryToDocument(entry, userEmail);
      await dispatcher.dispatch(document);
      return; // <-- BUG: Early return skips local write
    } catch (error) {
      // Only falls through on error
    }
  }

  // This line only reached if dispatcher NOT initialized or fails
  await SessionLogManager.appendEntry(sessionDir, entry);
}
```

The `return` on line 49 exits after dispatcher success, skipping `SessionLogManager.appendEntry()`.

### Why Chris's Logs Worked
Chris's session log (`chris-at-watchhill-ai/current-session-log.md`) has entries because either:
1. Logged before dispatcher was added/enabled
2. Or dispatcher failed, triggering the fallback path

### Impact
- Session logs are empty for authenticated users
- `ginko handoff` has no local context to synthesize
- Handoff summaries are lost (only exist in conversation)
- Session continuity broken across AI sessions
- Violates ADR-033 defensive logging strategy

### Suggested Fix
**Option A:** Remove early return, always write locally
```typescript
if (isDispatcherInitialized()) {
  try {
    const dispatcher = getDispatcher();
    const document = convertLogEntryToDocument(entry, userEmail);
    await dispatcher.dispatch(document);
    // Don't return - fall through to local write
  } catch (error) {
    console.warn('[DispatcherLogger] Dispatcher write failed:', error);
  }
}

// Always write to local session log
await SessionLogManager.appendEntry(sessionDir, entry);
```

**Option B:** Use dualWrite config properly
- Set `dualWrite: true` by default in `initializeWriteDispatcher()`
- Ensure local adapter is registered and handles session log writes

### Related Files
- `packages/cli/src/commands/log.ts` - calls `appendLogEntry()` on line 179
- `packages/cli/src/core/session-log-manager.ts` - `appendEntry()` method that should be called
- `packages/cli/src/lib/event-logger.ts` - event stream logging (working correctly)

### Testing
After fix, verify:
1. `ginko log` writes to both event stream AND session log
2. `ginko status` shows correct entry count
3. `ginko log --show` displays logged entries
4. `ginko handoff` can synthesize from session log

---

*Filed during investigation of missing handoff context between AI sessions.*
