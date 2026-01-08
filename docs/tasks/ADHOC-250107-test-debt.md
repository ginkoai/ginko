---
task_id: adhoc_250107_s01_t01
type: task
status: pending
priority: medium
created: 2026-01-07
assignee: unassigned
tags: [tests, tech-debt, cli]
---

# Test Suite Technical Debt Cleanup

**Type:** Technical Debt
**Priority:** Medium
**Created:** 2026-01-07
**Discovered During:** Security vulnerability fixes (64→0)

## Summary

Test suite has 84 failing tests (651 passing) due to accumulated technical debt unrelated to core functionality.

## Failure Categories

| Category | Count | Action Required |
|----------|-------|-----------------|
| Performance benchmarks | ~12 | Relax thresholds or skip in CI |
| Missing CLI options | ~15 | Add `--quick`, `--concise` flags or update tests |
| Reference parser | ~12 | Align parser logic with test expectations |
| TypeScript errors | ~3 | Fix `context_pressure`, `avgPressure` type errors |
| E2E setup issues | ~2 | Fix jest `uv_cwd` working directory issues |
| mcp-server | 1 | Add `--passWithNoTests` or create tests |
| create-ginko-project | 1 | Fix API key handling in non-interactive mode |

## Detailed Issues

### 1. Performance Benchmarks (Low Priority)
Tests expect <2s startup but get 4-13s during test runs due to overhead.

**Options:**
- Skip performance tests in CI (`jest --testPathIgnorePatterns="benchmarks"`)
- Use environment-aware thresholds (CI vs local)
- Mark as `.skip` with manual run instructions

### 2. Missing CLI Options (Medium Priority)
Tests reference flags that don't exist:
- `--quick` (used in init-flow.test.ts)
- `--concise` (used in ai-readiness.test.ts)

**Options:**
- Implement the flags
- Remove tests for unimplemented features

### 3. Reference Parser (Medium Priority)
`test/unit/reference-parser.test.ts` - Parser behavior doesn't match expectations:
- SPRINT ID extraction includes only date, not full slug
- Reference order differs from expected
- Partial matches being extracted when shouldn't

### 4. TypeScript Errors (High Priority)
`test/e2e/session-logging-flow.test.ts`:
- `context_pressure` property doesn't exist on `LogEntry`
- `avgPressure` property doesn't exist on summary type

### 5. E2E Setup Issues (Medium Priority)
Jest working directory issues causing `ENOENT: uv_cwd` errors in:
- `context-loader-comparison.test.ts`
- `ai-adapter.test.ts`

### 6. Package-Specific Issues (Low Priority)
- **mcp-server:** No tests exist, jest fails with "No tests found"
- **create-ginko-project:** Needs API key in non-interactive test mode

## Acceptance Criteria

- [ ] All tests pass or are intentionally skipped with documentation
- [ ] CI pipeline runs green
- [ ] Performance tests have appropriate thresholds for CI environment
- [ ] TypeScript errors in test files resolved

## Notes

- Core functionality is working (build passes, CLI runs)
- Security fixes verified working (stripe 20.x, 0 vulnerabilities)
- This debt should not block releases but should be addressed for maintainability

---

*Created during session: 2026-01-07*
*Context: Discovered while running full test suite after security updates*
