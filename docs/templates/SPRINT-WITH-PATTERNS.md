# SPRINT-YYYY-MM-sprint-name

## Sprint Overview

**Sprint Goal**: [One sentence describing what this sprint achieves]
**Duration**: [2 weeks] (YYYY-MM-DD to YYYY-MM-DD)
**Type**: [Feature | Infrastructure | Bugfix | Research]
**Progress:** 0% (0/N tasks complete)

**Success Criteria:**
- [Measurable outcome 1]
- [Measurable outcome 2]
- [Performance target if applicable]

---

## Sprint Tasks

### TASK-1: [Task Title] (Xh)
**Status:** [ ] Not Started
**Priority:** [CRITICAL | HIGH | MEDIUM | LOW]
**Owner:** [Name]

**Goal:** [What this task accomplishes]

**Implementation Notes:**
Use pattern from packages/cli/src/lib/event-queue.ts for the queue structure.
Apply pattern_exponential_backoff for retry logic.
Avoid the timer-unref-gotcha that causes process hang.
Watch out for async cleanup issues.

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]

**Files:**
- Create: `path/to/new/file.ts`
- Update: `path/to/existing/file.ts`

Follow: ADR-002, ADR-043

---

### TASK-2: [Task Title] (Xh)
**Status:** [ ] Not Started
**Priority:** HIGH
**Owner:** [Name]

**Goal:** [What this task accomplishes]

**Implementation Notes:**
See example from src/services/cache.ts for caching approach.
Use pattern_lru_cache for eviction strategy.
Beware of stale cache entries causing inconsistent state.

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Files:**
- Update: `relevant/files.ts`

Follow: ADR-033, ADR-043

---

## Related Documents

- **EPIC**: [Link to parent epic if applicable]
- **ADRs**: ADR-002, ADR-033, ADR-043
- **PRD**: [Link to product requirements if applicable]

---

**Sprint Status**: Not Started
**Start Date**: YYYY-MM-DD
**Created By**: [Name]

---

## Pattern & Gotcha Reference Guide

### Pattern Reference Syntax

Tasks can reference reusable patterns in several ways:

| Syntax | Example | Graph Result |
|--------|---------|--------------|
| `Use pattern from file.ts` | `Use pattern from event-queue.ts` | `pattern_event_queue_ts` |
| `pattern_xxx` | `pattern_exponential_backoff` | `pattern_exponential_backoff` |
| `See example from file.ts` | `See example from cache.ts` | `pattern_cache_ts` |
| `Apply pattern_xxx` | `Apply pattern_cursor` | `pattern_cursor` |

### Gotcha Warning Syntax

Tasks can warn about known pitfalls:

| Syntax | Example | Graph Result |
|--------|---------|--------------|
| `Avoid X` | `Avoid the timer-unref-gotcha` | `gotcha_timer_unref` |
| `Watch out for X` | `Watch out for memory leaks` | `gotcha_memory_leaks` |
| `Beware of X` | `Beware of race conditions` | `gotcha_race_conditions` |
| `Gotcha: X` | `Gotcha: null pointer in parser` | `gotcha_null_pointer_in_parser` |
| `xxx-gotcha` | `memory-leak-gotcha` | `gotcha_memory_leak_gotcha` |

### Graph Relationships Created

| Relationship | Direction | Purpose |
|-------------|-----------|---------|
| CONTAINS | Sprint → Task | Sprint contains which tasks |
| NEXT_TASK | Sprint → Task | Points to first incomplete task |
| MUST_FOLLOW | Task → ADR | Task must follow ADR constraints |
| MODIFIES | Task → File | Task modifies which files |
| APPLIES_PATTERN | Task → Pattern | Task should use this pattern |
| APPLIED_IN | Pattern → File | Pattern is used in this file |
| AVOID_GOTCHA | Task → Gotcha | Task should avoid this pitfall |

### Example Task with All Context Types

```markdown
### TASK-5: Refactor Context Loader
**Status:** [@] In Progress
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Optimize context loading for sub-second startup

**Implementation Notes:**
Use pattern from context-loader-events.ts for streaming approach.
Apply pattern_cursor for efficient pagination.
Apply pattern_exponential_backoff for API retry.
Avoid the memory-leak-gotcha when processing large event streams.
Watch out for timeout issues with slow network connections.
Beware of race conditions in concurrent cursor updates.

**Acceptance Criteria:**
- [ ] Startup time < 2 seconds
- [ ] Memory usage < 100MB
- [ ] No process hangs

**Files:**
- Update: `packages/cli/src/lib/context-loader.ts`
- Update: `packages/cli/src/lib/session-cursor.ts`
- Create: `packages/cli/src/lib/stream-processor.ts`

Follow: ADR-002, ADR-033, ADR-043
```

This creates:
- 3 MUST_FOLLOW relationships (to ADR-002, ADR-033, ADR-043)
- 3 APPLIES_PATTERN relationships (cursor, exponential_backoff, context-loader-events)
- 3 AVOID_GOTCHA relationships (memory-leak, timeout-issues, race-conditions)
- 3 MODIFIES relationships (to the 3 files)

### AI Session Context Display

At session start, the AI sees:

```
Sprint: Active Sprint (20%)
  [@] TASK-5: Refactor Context Loader
      Follow: ADR-002, ADR-033, ADR-043
      Patterns: cursor, exponential-backoff, streaming
      Avoid: memory-leak, timeout-issues, race-conditions
```

This comprehensive context enables:
1. **Constraint awareness** - AI follows architectural decisions
2. **Pattern reuse** - AI applies proven approaches
3. **Gotcha prevention** - AI avoids known pitfalls
