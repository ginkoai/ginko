---
id: TASK-018
type: task
title: Remove Deprecated Automation Code Artifacts
parent: null
status: PROPOSED
priority: LOW
created: 2025-11-06
updated: 2025-11-06
effort: 2 hours
tags: [cleanup, technical-debt, deprecated]
sprint: null
---

# Remove Deprecated Automation Code Artifacts

## Description

During CLAUDE.md optimization (2025-11-06), identified deprecated "Intelligent Automation" features that were removed from documentation but may still have code artifacts in the codebase.

**Deprecated Features:**
- SessionAgent (auto-saves context every 5 minutes)
- CoachingAgent (real-time collaboration coaching via status line)
- Achievement System (gamified skill development tracking)
- Status Line Coaching (live hints system)

These were early development concepts that have been superseded by:
- Event-based context loading (ADR-043)
- Defensive logging (ADR-033)
- Git-native session management

## Checklist

- [ ] Search codebase for SessionAgent references
  ```bash
  grep -r "SessionAgent" packages/ --include="*.ts"
  ```
- [ ] Search for CoachingAgent references
  ```bash
  grep -r "CoachingAgent" packages/ --include="*.ts"
  ```
- [ ] Search for Achievement System references
  ```bash
  grep -r "AchievementSystem\|Achievement.*track" packages/ --include="*.ts"
  ```
- [ ] Check for status line coaching code
  ```bash
  grep -r "StatusLineCoach\|status.*line.*coach" packages/ --include="*.ts"
  ```
- [ ] Review findings and determine what's safe to remove
- [ ] Remove unused code
- [ ] Remove unused dependencies (if any)
- [ ] Update any stale tests
- [ ] Run full test suite to verify nothing breaks
- [ ] Document removal in commit message

## Notes

**Context:**
- These features were mentioned in CLAUDE.md lines 7-14 (old version)
- Removed during 2025-11-06 optimization that reduced CLAUDE.md from 848 → 401 lines (53% reduction)
- User confirmed these are "deprecated features from earlier development"

**Search locations:**
- `packages/cli/src/`
- `packages/mcp-server/src/`
- `packages/claude-sdk/src/`
- `packages/shared/src/`

**Safety check:**
Before removing any code, verify it's truly unused:
1. Check for imports of the code
2. Search for references in tests
3. Look for configuration files
4. Check if any MCP tools expose the functionality

**If found to be still in use:**
- Re-evaluate whether it should be deprecated
- If truly deprecated but still referenced, plan migration path
- Update task status and escalate to higher priority
