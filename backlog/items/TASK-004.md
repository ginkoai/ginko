---
id: TASK-004
type: task
title: 'BUG: SessionLogger.logEvent() appendEventToFile() silently fails'
status: todo
priority: critical
size: S
created: '2025-10-03T20:20:03.572Z'
updated: '2025-10-03T20:20:03.574Z'
author: xtophr@gmail.com
tags:
  - bug
  - adr-033
  - session-logging
  - critical
  - data-loss
related:
  - ADR-033-context-pressure-mitigation-strategy.md
  - packages/cli/src/utils/session-logger.ts
acceptance_criteria:
  - SessionLogger.logEvent() successfully writes events to file
  - All logged events persist to current-session-log.md
  - No silent failures in file write operations
  - Verify fs-extra async operations work correctly in dist code
---
## Problem Statement

**Critical Bug**: `SessionLogger.logEvent()` silently fails to write events to the session log file. Events are successfully logged to the in-memory `sessionLog` object but `appendEventToFile()` does not persist changes to disk.

**Evidence**:
- Called `logger.logEvent('insight', description, metadata)` multiple times
- In-memory log shows events correctly added to timeline, insights, etc.
- File remains unchanged (only comments visible)
- Manual insertion using identical logic works perfectly

**Impact**:
- ADR-033 continuous session logging is **completely broken**
- Users cannot capture insights throughout sessions
- Handoff synthesis has no log data to work with
- Critical feature non-functional in production

**Reproduction**:
```typescript
const logger = new SessionLogger();
await logger.initialize(sessionDir);
await logger.logEvent('insight', 'Test event', { impact: 'high' });
// Event logged to memory, but file unchanged
```

## Root Cause Analysis

**Likely causes** (in order of probability):

1. **fs-extra import issue**: The transpiled dist code may have incorrect fs-extra imports (ESM vs CommonJS mismatch)
2. **Async/await bug**: `appendEventToFile()` may not be properly awaited in the call chain
3. **File path issue**: Windows path handling in the file write operation
4. **Permission issue**: File permissions preventing writes (unlikely, as manual script works)

**Evidence supporting fs-extra theory**:
- Manual insertion using Node's built-in `fs.readFileSync/writeFileSync` works perfectly
- SessionLogger uses `import fs from 'fs-extra'`
- Transpiled dist code may lose async fs operations

## Solution

1. **Debug async operations**: Add error logging to `appendEventToFile()`
2. **Check fs-extra in dist**: Verify fs-extra imports correctly in transpiled code
3. **Add error handling**: Wrap file operations in try-catch with explicit error messages
4. **Test async await chain**: Ensure `logEvent()` properly awaits `appendEventToFile()`
5. **Consider native fs**: If fs-extra is problematic, switch to native `fs/promises`

## Technical Approach

**Immediate fix** (session-logger.ts:249-285):

```typescript
private async appendEventToFile(event: LogEvent): Promise<void> {
  if (!this.logPath) return;

  try {
    const eventMarkdown = this.formatEventMarkdown(event);

    // Use native fs/promises for reliability
    const { readFile, writeFile } = await import('fs/promises');
    let content = await readFile(this.logPath, 'utf8');

    const sectionMap: Record<EventCategory, string> = {
      fix: '## Timeline',
      feature: '## Timeline',
      decision: '## Key Decisions',
      insight: '## Insights',
      git: '## Git Operations',
      achievement: '## Achievements'
    };

    const section = sectionMap[event.category];
    const sectionIndex = content.indexOf(section);

    if (sectionIndex !== -1) {
      const nextSectionIndex = content.indexOf('\n## ', sectionIndex + section.length);
      const insertPosition = nextSectionIndex === -1 ? content.length : nextSectionIndex;

      content = content.slice(0, insertPosition) +
                '\n' + eventMarkdown + '\n' +
                content.slice(insertPosition);
    } else {
      content += `\n${section}\n\n${eventMarkdown}\n`;
    }

    await writeFile(this.logPath, content, 'utf8');

    if (this.verbose) {
      console.log(`✓ Wrote event to ${this.logPath}`);
    }
  } catch (error) {
    // Critical: Don't fail silently!
    console.error(`ERROR writing event to log: ${error}`);
    throw error;
  }
}
```

**Testing**:
- Unit test for file persistence
- Integration test for full logging flow
- Verify in dist/ transpiled code
