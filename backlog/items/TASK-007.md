---
id: TASK-007
type: task
title: Add comprehensive test coverage for ginko init functionality
parent:
  - SPRINT-2025-08-28-enhanced-ginko-init
status: todo
priority: critical
created: '2025-10-20T21:00:00.000Z'
updated: '2025-10-20T21:00:00.000Z'
effort: 12-17 hours
tags: [testing, init, quality, technical-debt]
sprint: null
size: L
author: chris@watchhill.ai
---

# Add comprehensive test coverage for ginko init functionality

## Description
Sprint audit revealed **0% test coverage** for core init functionality. ProjectAnalyzer, ProgressiveLearning, init command, and E2E init flow are completely untested, creating significant production risk.

**Current state**:
- ❌ `ProjectAnalyzer` - 0% coverage
- ❌ `ProgressiveLearning` - 0% coverage
- ❌ `init` command - 0% coverage
- ❌ E2E init flow - 0% coverage

**Risks without tests**:
- False project type detection
- Intrusive hints disrupting flow
- File system corruption on errors
- Cross-platform compatibility issues (Windows/Mac/Linux)

## Checklist

### ProjectAnalyzer Tests (4-6 hours)
- [ ] Create `packages/cli/test/analysis/project-analyzer.test.ts`
- [ ] Test package manager detection (npm/yarn/pnpm/bun)
- [ ] Test project type classification (webapp/api/cli/library/monorepo)
- [ ] Test framework detection (React/Next.js/Vue/Express/NestJS)
- [ ] Test language detection (TypeScript/JavaScript/Python/Go/Rust)
- [ ] Test test setup detection (Jest/Vitest/pytest/go test)
- [ ] Test command extraction from package.json
- [ ] Test error handling (missing package.json, invalid JSON)
- [ ] Test `quickAnalyze()` static method

### ProgressiveLearning Tests (3-4 hours)
- [ ] Create `packages/cli/test/utils/progressive-learning.test.ts`
- [ ] Test `getUserProgress()` creates new progress
- [ ] Test `updateProgress()` increments command usage
- [ ] Test `getContextualHint()` applies all filters correctly
- [ ] Test hint dependencies and ordering logic
- [ ] Test experience level calculation (beginner/intermediate/advanced)
- [ ] Test showOnce behavior prevents repeat hints
- [ ] Test file I/O error handling (graceful failures)
- [ ] Test smart suggestions based on git status

### Init Command Tests (3-4 hours)
- [ ] Create `packages/cli/test/commands/init.test.ts`
- [ ] Test directory structure creation (.ginko/sessions, patterns, context)
- [ ] Test config.json generation with correct defaults
- [ ] Test .gitignore updates (append vs create)
- [ ] Test integration with ProjectAnalyzer
- [ ] Test integration with AiInstructionsTemplate
- [ ] Test already-initialized detection (current dir)
- [ ] Test already-initialized detection (parent dir)
- [ ] Test error handling and cleanup on failure
- [ ] Test user session directory setup with email slug

### E2E Init Flow Tests (2-3 hours)
- [ ] Create `packages/cli/test/e2e/init-flow.test.ts`
- [ ] Test complete init in temp directory (setup/teardown)
- [ ] Test React project initialization
- [ ] Test API project initialization
- [ ] Test CLI project initialization
- [ ] Test monorepo initialization
- [ ] Test no package.json scenario (generic init)
- [ ] Verify all files created correctly
- [ ] Verify CLAUDE.md content quality
- [ ] Test --quick flag behavior
- [ ] Test --analyze flag behavior

### Test Infrastructure
- [ ] Fix TypeScript compilation errors in existing tests
- [ ] Resolve Vitest vs Jest conflicts
- [ ] Ensure all tests can run with `npm test`
- [ ] Add coverage reporting to package.json scripts

## Technical Notes

**Test locations**:
- Unit tests: `packages/cli/test/analysis/`, `packages/cli/test/utils/`, `packages/cli/test/commands/`
- E2E tests: `packages/cli/test/e2e/`

**Test patterns to follow**:
- Use existing template test as reference: `packages/cli/test/templates/ai-instructions-template.test.ts` (HIGH quality, 17 test cases)
- Use session logging e2e test as reference: `packages/cli/test/e2e/session-logging-flow.test.ts` (455 lines, comprehensive)

**Testing strategy**:
- Mock file system operations where appropriate
- Use temp directories for E2E tests
- Test edge cases (no git, Windows paths, permission errors)
- Validate error messages are helpful
- Test cross-platform compatibility

## Success Criteria
- [ ] All 4 test suites created and passing
- [ ] Test coverage >80% for ProjectAnalyzer
- [ ] Test coverage >80% for ProgressiveLearning
- [ ] Test coverage >70% for init command
- [ ] E2E tests validate complete init flow
- [ ] `npm test` runs successfully with no compilation errors
- [ ] CI pipeline includes these tests

## Notes
- **Priority: CRITICAL** - This is blocking production confidence
- Sprint success criterion claimed "All core functionality implemented and tested" but tests don't exist
- Testing was estimated at 3 hours in sprint plan (lines 70, 87-91) but actual need is 12-17 hours
- Consider breaking into sub-tasks if needed (one per test suite)
- Related ADRs: ADR-026 (Enhanced ginko init)
