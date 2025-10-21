---
id: TASK-006
type: task
title: Implement functional --quick flag for ginko init
parent:
  - SPRINT-2025-08-28-enhanced-ginko-init
status: todo
priority: high
created: '2025-10-20T21:00:00.000Z'
updated: '2025-10-20T21:00:00.000Z'
effort: 1 hour
tags: [init, cli, ux, quick-win]
sprint: null
size: S
author: chris@watchhill.ai
---

# Implement functional --quick flag for ginko init

## Description
The --quick flag is defined in the CLI interface (`packages/cli/src/index.ts:59`) and accepted by the init command (`packages/cli/src/commands/init.ts:28`), but it's non-functional. The flag doesn't actually skip analysis as intended.

**Current behavior**:
- `ginko init --quick` still runs full project analysis

**Expected behavior**:
- `ginko init --quick` should skip analysis and use minimal setup for fast initialization

## Checklist
- [ ] Add logic in `init.ts` to check `options.quick` flag
- [ ] When `--quick` is true, set `options.analyze = false`
- [ ] Verify minimal setup completes in <5 seconds
- [ ] Update help text to clarify --quick behavior
- [ ] Test on Node, Python, and Go projects
- [ ] Document --quick flag usage in README

## Technical Implementation

**Location**: `packages/cli/src/commands/init.ts`

**Change needed** (around line 102):
```typescript
// Add before analysis check:
if (options.quick) {
  spinner.text = 'Quick initialization mode...';
  // Skip analysis
} else if (options.analyze !== false) {
  // Existing analysis logic
  spinner.text = 'Analyzing project structure...';
  // ...
}
```

## Notes
- This is a quick win (1 hour) with immediate user value
- --quick flag already documented in CLI help: "Quick initialization without project analysis"
- Should still create all required directories and files, just skip ProjectAnalyzer
- Consider adding a note in output: "Skipped analysis (use --analyze for tech stack detection)"
- Related to ADR-026 success criterion: "<5 minutes from init to productive"
