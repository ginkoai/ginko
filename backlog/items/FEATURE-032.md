---
id: FEATURE-032
type: feature
title: Feature Detection and Graceful Degradation for CLI Staleness
status: todo
priority: high
size: M
created: '2025-10-03T19:59:15.673Z'
updated: '2025-10-03T19:59:15.675Z'
author: xtophr@gmail.com
tags:
  - adr-033
  - context-pressure
  - shell-persistence
  - ux
  - feature-detection
related:
  - ADR-033-context-pressure-mitigation-strategy.md
  - start/start-reflection.ts
acceptance_criteria:
  - Detects when session logging unavailable due to stale binary
  - Provides helpful restart instructions to users
  - Works gracefully when features missing (no errors)
  - Clear messaging about how to fix (exec $SHELL)
---
## Problem Statement

**Shell Persistence Issue**: Users commonly use `/clear` in Claude Code to start fresh AI sessions, but this keeps the same shell session active. When `ginko` is updated via `npm install -g`, the shell still references the old binary from PATH cache.

**Impact**: ADR-033 features (session logging, pressure monitoring) silently fail to initialize because the running CLI lacks the required modules. Users get degraded experience with no error message or guidance.

**User Workflow Affected**:
```
1. Terminal open with ginko v0.1.0
2. npm install -g @ginkoai/cli  → Updates to v1.0.0
3. /clear in Claude Code (fresh AI, same shell)
4. ginko start → Still uses v0.1.0 (shell cached)
5. No session log created, no warning shown
```

## Solution

Implement **Feature Detection with Graceful Degradation** (Tier 1 from shell persistence analysis):

1. **Runtime Feature Detection**: Check if `SessionLogManager.hasSessionLog` exists at startup
2. **Graceful Fallback**: If unavailable, skip session logging without errors
3. **Helpful Guidance**: Show clear instructions on how to reload shell
4. **No Breaking Changes**: Existing functionality continues to work

## Technical Approach

**In `start-reflection.ts`:**

```typescript
private detectSessionLogging(): boolean {
  try {
    return typeof SessionLogManager?.hasSessionLog === 'function';
  } catch {
    return false;
  }
}

async execute(intent: string, options: any = {}): Promise<void> {
  // ... existing code ...

  const hasSessionLogging = this.detectSessionLogging();

  if (hasSessionLogging && !options.noLog) {
    await this.initializeSessionLog(context, options);
    spinner.info('Session logging enabled');
  } else if (!hasSessionLogging) {
    spinner.warn('Session logging unavailable (stale CLI binary detected)');
    spinner.info('Fix: Restart terminal or run: exec $SHELL (Linux/Mac) | exec pwsh (Windows)');
  }

  // ... rest of code ...
}
```

**Benefits**:
- Zero breaking changes
- Clear user guidance
- Works with any missing feature
- Foundation for Tier 2 (version checking)

**Follow-up Work** (Separate Features):
- Tier 2: Version checking with build metadata
- Tier 3: `ginko self-check` diagnostic command
- Tier 4: Documentation in first-use experience
