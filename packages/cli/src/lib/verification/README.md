# Verification Module

**EPIC-004 Sprint 3: Verification & Quality**

Autonomous quality assessment utilities for task acceptance criteria validation.

## Purpose

Enables agents to self-validate their work through structured verification:
- Run tests and parse results
- Verify builds succeed
- Check lint errors
- Execute custom acceptance criteria

## Components

### Test Runner (`test-runner.ts`)

Detects test framework, runs tests, parses output.

**Usage:**
```typescript
import { runTests } from './lib/verification';

const result = await runTests('/path/to/project', {
  timeout: 300000 // 5 minutes
});

if (result.passed) {
  console.log(`✓ ${result.passCount} tests passed`);
} else {
  console.log(`✗ ${result.failCount} tests failed`);
}
```

**Supported Frameworks:**
- Jest (auto-detected from package.json or jest.config.*)
- Vitest (auto-detected from package.json or vitest.config.*)
- Mocha (auto-detected from package.json or .mocharc.*)
- Generic npm test (fallback)

**Detection Logic:**
1. Check package.json `scripts.test` for framework name
2. Check devDependencies/dependencies for framework packages
3. Check for config files (jest.config.js, vitest.config.ts, etc.)
4. Fall back to `npm test`

**Output Parsing:**
- **Jest/Vitest:** `Tests: X passed, Y failed, Z total`
- **Mocha:** `X passing`, `Y failing`
- **Coverage:** Extracts percentage from coverage reports

**Interface:**
```typescript
interface TestResult {
  passed: boolean;        // true if all tests passed
  passCount: number;      // Number of tests that passed
  failCount: number;      // Number of tests that failed
  coverage?: number;      // Coverage percentage (if available)
  output: string;         // Full stdout/stderr output
  duration_ms: number;    // Execution time in milliseconds
}

interface TestOptions {
  timeout?: number;       // Max execution time (default: 300000ms = 5 min)
}
```

### Build Check (`build-check.ts`)

_Coming in Sprint 3 TASK-4_

Verifies project builds successfully.

### Lint Check (`lint-check.ts`)

_Coming in Sprint 3 TASK-5_

Checks for lint errors, compares to baseline.

## Integration with Acceptance Criteria

Sprint files can define acceptance criteria:

```markdown
### TASK-1: Implement feature
**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] No new lint errors
- [ ] API response < 200ms
```

The verification API will:
1. Parse criteria from sprint file (TASK-1)
2. Run appropriate checks (test-runner, build-check, etc.)
3. Return structured pass/fail results
4. Store results in graph for audit trail

## CLI Command

_Coming in Sprint 3 TASK-6_

```bash
ginko verify TASK-1

Verifying TASK-1: Implement user authentication

Criteria:
  ✓ Unit tests pass (142 passed, 0 failed)
  ✓ Build succeeds (12.3s)
  ✓ No new lint errors (0 new)
  ✗ API response < 200ms (actual: 342ms)

Result: FAILED (3/4 criteria passed)
```

## Error Handling

- **Timeout:** Process killed after configured timeout, returns timeout result
- **Missing command:** Returns failure with clear error message
- **Parse failure:** Returns counts of 0, includes raw output for debugging
- **Spawn error:** Catches and returns error details

## Future Enhancements

- Custom criterion execution (arbitrary shell commands)
- Performance threshold validation (response times, build times)
- Security checks (dependency vulnerabilities, secrets detection)
- Visual regression testing integration
- Parallel criterion execution for speed

## Related

- Sprint file: `/docs/sprints/SPRINT-2025-12-epic004-sprint3-verification.md`
- Tasks: TASK-3 (test-runner), TASK-4 (build-check), TASK-5 (lint-check)
