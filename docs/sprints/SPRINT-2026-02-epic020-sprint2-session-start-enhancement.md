# SPRINT: Session Start Enhancement

## Sprint Overview

**Sprint Goal**: `ginko start` provides complete context from graph alone — no file reads needed.
**Duration**: 1 week
**Type**: Feature sprint
**Progress:** 0% (0/7 tasks complete)

**Success Criteria:**
- [ ] `--clean-slate` merged into default `ginko start` behavior
- [ ] Start output shows WHY (problem) not just WHAT (title)
- [ ] Start output shows STOPPED AT with context
- [ ] Start output shows FILES (entry points)
- [ ] Start output shows recent DECISIONS
- [ ] Context scoring auto-runs after synthesis
- [ ] Low scores (<7) trigger enrichment suggestions

---

## Sprint Tasks

### e020_s02_t01: Merge --clean-slate to default start (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 90%

**Problem:** The `--clean-slate` flag adds friction — users must remember to use it for full context.

**Solution:** Make clean-slate the default `ginko start` behavior. Remove the flag.

**Approach:** Remove the `--clean-slate` flag from the start command. Move the clean-slate synthesis logic into the default start flow in `start-reflection.ts`. Ensure backward compatibility for users who still pass the flag (no-op, no error).

**Scope:**
  - Includes: start command, start-reflection.ts, flag removal
  - Excludes: New synthesis logic (uses existing clean-slate code)

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/commands/start/index.ts`

---

### e020_s02_t02: Display WHY in start output (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 85%

**Problem:** Only task title is shown at start — no problem statement or motivation.

**Solution:** Show the problem statement from the current task's 3x5 card in the RESUME block.

**Approach:** Extract `problem` field from `ActiveSprintData.currentTask` (added in Sprint 1). Format as `WHY: {first sentence of problem}` in the start output.

**Scope:**
  - Includes: Start output formatting, problem extraction
  - Excludes: Problem generation (must exist in graph)

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/output-formatter.ts`

---

### e020_s02_t03: Show STOPPED AT with context (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 80%

**Problem:** The stopping point in the resumption brief is truncated and lacks file context.

**Solution:** Show full stopping point with the file being edited when work stopped.

**Approach:** Enhance the resumption brief synthesis to include file context from the last session's events. Format as `STOPPED AT: {description} in {file}`.

**Scope:**
  - Includes: Resumption brief enhancement, file context extraction
  - Excludes: Git diff integration

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/synthesis/`

---

### e020_s02_t04: Show entry point FILES (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 85%

**Problem:** No visibility into where to start coding — AI must search for files.

**Solution:** Display the task's entry point files prominently in start output.

**Approach:** Pull `files` array from `ActiveSprintData.currentTask` (added in Sprint 1). Display top 3 files as `FILES: {file1}, {file2}, {file3}`.

**Scope:**
  - Includes: Start output formatting, file list display
  - Excludes: File existence validation

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/output-formatter.ts`

---

### e020_s02_t05: Surface recent DECISIONS (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 75%

**Problem:** Key decisions from previous sessions exist in events but are hidden from start output.

**Solution:** Show the most recent decision from the last session in the start output.

**Approach:** Extract decision events from the session event log. Display the most relevant decision as `DECISION: {description} (ADR-XXX)`.

**Scope:**
  - Includes: Decision extraction from events, start output formatting
  - Excludes: Multi-session decision aggregation

**Uncertainties:**
- How to rank decisions by relevance when multiple exist

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/synthesis/`

---

### e020_s02_t06: Auto context scoring after synthesis (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 85%

**Problem:** Context scoring doesn't auto-run — relies on AI remembering the reflex.

**Solution:** Automatically run the context scoring reflex after synthesis completes.

**Approach:** Add a scoring call at the end of the start-reflection flow. Log the score to events via `ginko context score`. Include the score in start output.

**Scope:**
  - Includes: Auto-scoring call, event logging, start output
  - Excludes: Score-based routing (future)

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/commands/context/score.ts`

---

### e020_s02_t07: Low score enrichment suggestions (2h)
**Status:** [ ] Not Started
**Priority:** LOW
**Confidence:** 80%

**Problem:** Low context scores (<7) are not actionable — no suggestions for improvement.

**Solution:** When any dimension scores below 7, suggest specific enrichment actions.

**Approach:** Check dimension scores after auto-scoring. For each low dimension, generate a targeted suggestion (e.g., Direction <7 → "Run `ginko task show` for task details"). Display suggestions in start output.

**Scope:**
  - Includes: Score checking, suggestion generation, start output
  - Excludes: Automatic enrichment execution

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/output-formatter.ts`

---

## Dependencies

- **EPIC-020 Sprint 1:** Graph Content Enrichment (must complete first)
- **EPIC-018 Sprint 1:** Resumption brief synthesis (complete)
