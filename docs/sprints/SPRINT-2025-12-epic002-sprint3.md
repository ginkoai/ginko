# SPRINT: EPIC-002 Sprint 3 - Pattern & Gotcha Surfacing

## Sprint Overview

**Sprint Goal**: Surface pattern guidance and gotcha warnings to AI at session start
**Duration**: 2 weeks (2025-12-01 to 2025-12-15)
**Type**: Feature sprint (UX + API endpoints)
**Progress:** 0% (0/4 tasks complete)

**Success Criteria:**
- Patterns and gotchas visible in ginko start output
- API endpoints for querying task patterns/gotchas
- Gotcha resolution tracking operational
- AI constraint context includes patterns + gotchas

---

## Sprint Tasks

### TASK-1: Display Patterns & Gotchas in ginko start (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Show pattern guidance and gotcha warnings alongside ADR constraints in session start

**Acceptance Criteria:**
- [ ] Patterns displayed under current task: `Patterns: cursor, exponential-backoff`
- [ ] Gotchas displayed under current task: `Avoid: memory-leak, timeout-issues`
- [ ] Work mode affects verbosity (Hack & Ship minimal, Full Planning detailed)
- [ ] Integration with existing sprint checklist display

**Implementation Notes:**
Use pattern from packages/cli/src/lib/output-formatter.ts for display structure.
Apply pattern_sprint_display for checklist formatting.
Avoid the verbose-output-gotcha that overwhelms users with too much context.

**Files:**
- Update: `packages/cli/src/lib/output-formatter.ts`
- Update: `packages/cli/src/lib/sprint-loader.ts`
- Update: `packages/cli/src/commands/start/start-reflection.ts`

Follow: ADR-002, ADR-033, ADR-043

---

### TASK-2: API Endpoints for Pattern & Gotcha Queries (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Enable programmatic access to task patterns and gotchas

**Acceptance Criteria:**
- [ ] GET /api/v1/task/:id/patterns - returns patterns for a task
- [ ] GET /api/v1/task/:id/gotchas - returns gotchas for a task
- [ ] GET /api/v1/pattern/:id/usages - returns where a pattern is applied
- [ ] Response includes relationship metadata (source, extracted_at)

**Implementation Notes:**
See example from dashboard/src/app/api/v1/task/[id]/constraints/route.ts for structure.
Use pattern_cypher_query for Neo4j graph queries.

**Files:**
- Create: `dashboard/src/app/api/v1/task/[id]/patterns/route.ts`
- Create: `dashboard/src/app/api/v1/task/[id]/gotchas/route.ts`
- Create: `dashboard/src/app/api/v1/pattern/[id]/usages/route.ts`

Follow: ADR-043

---

### TASK-3: Pattern Severity & Confidence Levels (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Add metadata to patterns for prioritization and trust

**Acceptance Criteria:**
- [ ] Pattern nodes have `confidence: high | medium | low` property
- [ ] Confidence based on usage count and age
- [ ] Higher confidence patterns shown first in output
- [ ] API endpoints return confidence in response

**Implementation Notes:**
Apply pattern_progressive_trust for confidence calculation.
Watch out for cold-start issues with new patterns (default to medium).

**Files:**
- Update: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Update: `packages/cli/src/lib/sprint-loader.ts`
- Create: `packages/cli/src/utils/pattern-confidence.ts`

Follow: ADR-002

---

### TASK-4: Gotcha Resolution Tracking (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Track when gotchas are encountered and resolved to improve AI learning

**Acceptance Criteria:**
- [ ] Gotcha nodes have `encounters: number` property
- [ ] Gotcha nodes have `resolutions: number` property
- [ ] `ginko log --category=gotcha` increments encounter count
- [ ] Resolution events link to fix commits
- [ ] Gotcha effectiveness score: resolutions / encounters

**Implementation Notes:**
Use pattern from packages/cli/src/lib/event-queue.ts for event tracking.
Beware of over-counting from repeated session starts.
Gotcha: ensure atomic updates to counter properties.

**Files:**
- Update: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Update: `packages/cli/src/utils/command-helpers.ts`
- Create: `dashboard/src/app/api/v1/gotcha/[id]/resolve/route.ts`

Follow: ADR-033, ADR-043

---

## Related Documents

- **EPIC**: [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- **Previous Sprint**: [EPIC-002 Sprint 2](./SPRINT-2025-11-epic002-sprint2.md)
- **ADRs**: ADR-002, ADR-033, ADR-043

---

**Sprint Status**: Not Started
**Start Date**: 2025-12-01
**Created By**: Chris Norton
