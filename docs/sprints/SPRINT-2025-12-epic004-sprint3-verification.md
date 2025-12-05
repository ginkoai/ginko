---
sprint_id: EPIC-004-S3
epic_id: EPIC-004
status: not_started
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
depends: EPIC-004-S2
---

# Sprint 3: Verification & Quality

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Agents can verify task completion, not just mark done
**Duration:** 2 weeks
**Type:** Quality
**Depends:** Sprint 2 (Real-Time Coordination)

## Sprint Goal

Enable autonomous quality assessment: structured acceptance criteria, automated verification, pass/fail reporting. This sprint enables agents to self-validate their work.

## Success Criteria

- [ ] Tasks can define acceptance criteria in structured format
- [ ] `ginko verify TASK-X` returns structured pass/fail with details
- [ ] Verification API runs configurable checks (tests, build, lint)
- [ ] Failed verification blocks task completion
- [ ] Verification results stored in graph for audit trail
- [ ] Human can override failed verification (quality exception)

## Tasks

### TASK-1: Acceptance Criteria Schema
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/sprint-loader.ts`

Extend task parsing to extract acceptance criteria:
```markdown
### TASK-1: Implement feature
**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] No new lint errors
- [ ] API response < 200ms
```

Parse into:
```typescript
interface AcceptanceCriterion {
  id: string;
  description: string;
  type: 'test' | 'build' | 'lint' | 'performance' | 'manual' | 'custom';
  threshold?: number;  // For performance criteria
  command?: string;    // For custom criteria
}
```

**Acceptance:**
- [ ] Criteria parsed from markdown
- [ ] Type auto-detected from description
- [ ] Custom commands supported
- [ ] Missing criteria returns empty array (not error)

---

### TASK-2: Verification API
**Status:** [ ]
**Effort:** Large
**Files:** `dashboard/src/app/api/v1/task/[id]/verify/route.ts`

Implement verification endpoint:
- `POST /api/v1/task/:id/verify` - Run all acceptance checks
- Returns structured result:
```typescript
interface VerificationResult {
  taskId: string;
  passed: boolean;
  timestamp: Date;
  criteria: {
    id: string;
    description: string;
    passed: boolean;
    details?: string;
    duration_ms?: number;
  }[];
  summary: string;
}
```

**Acceptance:**
- [ ] Runs all criteria checks
- [ ] Returns pass/fail for each criterion
- [ ] Overall pass requires all criteria pass
- [ ] Stores result in graph

---

### TASK-3: Test Runner Integration
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/verification/test-runner.ts`

Execute project tests and capture results:
- Detect test framework (jest, vitest, mocha, etc.)
- Run tests, capture output
- Parse pass/fail count
- Return structured result

**Acceptance:**
- [ ] Auto-detects test command from package.json
- [ ] Captures stdout/stderr
- [ ] Returns pass count, fail count, coverage %
- [ ] Timeout configurable (default 5 min)

---

### TASK-4: Build Verification
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/verification/build-check.ts`

Verify project builds successfully:
- Detect build command (npm run build, tsc, etc.)
- Run build, capture output
- Return success/failure with details

**Acceptance:**
- [ ] Auto-detects build command
- [ ] Captures error output on failure
- [ ] Returns success boolean + details

---

### TASK-5: Lint Verification
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/verification/lint-check.ts`

Verify no new lint errors:
- Run lint command
- Compare to baseline (if available)
- Return new errors only

**Acceptance:**
- [ ] Auto-detects lint command
- [ ] Baseline comparison optional
- [ ] Returns error count + details

---

### TASK-6: CLI Verify Command
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/commands/verify.ts`

Implement `ginko verify`:
```
ginko verify TASK-1

Verifying TASK-1: Implement user authentication

Criteria:
  ✓ Unit tests pass (142 passed, 0 failed)
  ✓ Build succeeds (12.3s)
  ✓ No new lint errors (0 new)
  ✗ API response < 200ms (actual: 342ms)

Result: FAILED (3/4 criteria passed)
```

**Acceptance:**
- [ ] Shows each criterion with pass/fail
- [ ] Returns exit code 0 on pass, 1 on fail
- [ ] Supports `--json` for structured output
- [ ] Supports `--fix` to attempt auto-fixes

---

### TASK-7: Verification Result Storage
**Status:** [ ]
**Effort:** Small
**Files:** `dashboard/src/app/api/v1/task/[id]/verify/route.ts`

Store verification results in graph:
```cypher
CREATE (v:VerificationResult {
  id: 'ver_xxx',
  task_id: 'TASK-1',
  passed: false,
  timestamp: datetime(),
  criteria_passed: 3,
  criteria_total: 4,
  agent_id: 'agent_xxx'
})
CREATE (t)-[:VERIFIED_BY]->(v)
```

**Acceptance:**
- [ ] Results stored per verification run
- [ ] Queryable by task, agent, time
- [ ] Audit trail preserved

---

### TASK-8: Quality Exception API
**Status:** [ ]
**Effort:** Small
**Files:** `dashboard/src/app/api/v1/task/[id]/override/route.ts`

Allow humans to override failed verification:
- `POST /api/v1/task/:id/override` - Mark task complete despite failures
- Requires human auth (not agent)
- Logs override reason

**Acceptance:**
- [ ] Only human users can override
- [ ] Reason required
- [ ] Override logged in graph
- [ ] Task can proceed to complete

---

### TASK-9: Integration Tests
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/test/integration/verification.test.ts`

Test scenarios:
- Criteria parsing from various formats
- Verification pass/fail flows
- Test runner integration
- Override flow

**Acceptance:**
- [ ] All verification paths tested
- [ ] Edge cases covered (no tests, build fails, etc.)
- [ ] Coverage > 80% for new code

---

## Technical Notes

### Criterion Type Detection

| Pattern | Type |
|---------|------|
| "test", "spec", "unit" | test |
| "build", "compile" | build |
| "lint", "eslint", "prettier" | lint |
| "response", "latency", "ms" | performance |
| "review", "approve" | manual |
| *other* | custom |

### Performance Threshold Parsing
```
"API response < 200ms" → { type: 'performance', threshold: 200 }
"Load time under 3 seconds" → { type: 'performance', threshold: 3000 }
```

### Verification Timeout Strategy
- Test runner: 5 minutes (configurable)
- Build: 10 minutes (configurable)
- Lint: 2 minutes
- Overall: Sum of individual + 1 minute buffer

## Files Summary

**New files:**
- `packages/cli/src/lib/verification/test-runner.ts`
- `packages/cli/src/lib/verification/build-check.ts`
- `packages/cli/src/lib/verification/lint-check.ts`
- `packages/cli/src/lib/verification/index.ts`
- `packages/cli/src/commands/verify.ts`
- `dashboard/src/app/api/v1/task/[id]/verify/route.ts`
- `dashboard/src/app/api/v1/task/[id]/override/route.ts`
- `packages/cli/test/integration/verification.test.ts`

**Modified files:**
- `packages/cli/src/lib/sprint-loader.ts` (criteria parsing)
- `packages/cli/src/index.ts` (add verify command)

## Definition of Done

- [ ] All tasks completed
- [ ] `ginko verify TASK-X` returns structured results
- [ ] Failed verification blocks completion
- [ ] Human override works correctly
- [ ] All verification results stored in graph
- [ ] No regression in existing functionality

---

## Progress

**Started:** Not started
**Completed:** 0/9 tasks

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
