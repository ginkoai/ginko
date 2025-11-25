# SPRINT: EPIC-002 Sprint 2 - Pattern & Constraint Library

## Sprint Overview

**Sprint Goal**: Reduce rework through constraint awareness and pattern reuse
**Duration**: 3 weeks (2025-11-25 to 2025-12-15)
**Type**: Feature sprint (Graph relationships + Context modules)
**Progress:** 0% (0/5 tasks complete)

**Success Criteria:**
- Decision accuracy > 85% (AI chooses correct patterns)
- Rework rate < 10% (fewer "redo" events)
- Gotcha rediscovery < 5% (AI learns from past mistakes)
- Context module taxonomy operational

---

## Sprint Tasks

### TASK-1: Context Module Taxonomy (4-6h)
**Status:** [ ] Todo
**Priority:** CRITICAL
**Owner:** Chris Norton

**Goal:** Define and implement context module types for graph storage

**Acceptance Criteria:**
- [ ] Define module types: Pattern, Gotcha, Decision, Discovery
- [ ] Create Neo4j node labels for each type
- [ ] API endpoint: POST /api/v1/context-module (create)
- [ ] API endpoint: GET /api/v1/context-module/:id (retrieve)
- [ ] Schema migration for context module nodes

**Implementation:**
Context modules capture reusable knowledge extracted from sessions.

**Files:**
- Create: `src/graph/schema/009-context-modules.cypher`
- Create: `dashboard/src/app/api/v1/context-module/route.ts`
- Create: `dashboard/src/app/api/v1/context-module/[id]/route.ts`

Related: ADR-002, ADR-033

---

### TASK-2: Pattern → APPLIED_IN → File Relationships (4h)
**Status:** [ ] Todo
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Track where patterns are used in the codebase

**Acceptance Criteria:**
- [ ] Extract pattern references from events and session logs
- [ ] Create APPLIED_IN relationships (Pattern → File)
- [ ] API endpoint: GET /api/v1/pattern/:id/usages
- [ ] Display pattern usage in ginko start context

**Implementation:**
When a pattern is applied, record the file(s) where it was used.
This enables "see X for example" guidance to AI.

**Files:**
- Modify: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Create: `dashboard/src/app/api/v1/pattern/[id]/usages/route.ts`
- Modify: `packages/cli/src/lib/output-formatter.ts`

Related: ADR-002, ADR-043

---

### TASK-3: Task → APPLIES_PATTERN Relationships (4h)
**Status:** [ ] Todo
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Link tasks to patterns they should use

**Acceptance Criteria:**
- [ ] Parse pattern references from sprint task definitions
- [ ] Create APPLIES_PATTERN relationships in graph sync
- [ ] API endpoint: GET /api/v1/task/:id/patterns
- [ ] Display pattern guidance in ginko start output

**Implementation:**
Similar to MUST_FOLLOW for ADRs, but for reusable code patterns.
Tasks can reference patterns: "Use retry pattern from graph-health-monitor.ts"

**Files:**
- Modify: `packages/cli/src/lib/sprint-loader.ts`
- Modify: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Create: `dashboard/src/app/api/v1/task/[id]/patterns/route.ts`

Related: ADR-002, ADR-043

---

### TASK-4: Gotcha Detection & AVOID_GOTCHA Relationships (6h)
**Status:** [ ] Todo
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Capture and surface gotchas to prevent AI from repeating mistakes

**Acceptance Criteria:**
- [ ] Extract gotchas from session logs (error patterns, workarounds)
- [ ] Create Gotcha nodes in graph with context
- [ ] Create AVOID_GOTCHA relationships (Task → Gotcha)
- [ ] API endpoint: GET /api/v1/task/:id/gotchas
- [ ] Display gotcha warnings in ginko start output
- [ ] ginko log --gotcha flag for explicit gotcha capture

**Implementation:**
Gotchas are "lessons learned the hard way" - things that caused problems.
Example: "EventQueue timer keeps process alive - use .unref()"

**Files:**
- Modify: `packages/cli/src/commands/log.ts`
- Modify: `packages/cli/src/lib/sprint-loader.ts`
- Create: `dashboard/src/app/api/v1/task/[id]/gotchas/route.ts`
- Modify: `packages/cli/src/lib/output-formatter.ts`

Related: ADR-033, ADR-043

---

### TASK-5: Integration Testing & Documentation (3h)
**Status:** [ ] Todo
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Validate pattern/gotcha system end-to-end

**Acceptance Criteria:**
- [ ] Integration tests for context module CRUD
- [ ] Integration tests for pattern relationships
- [ ] Integration tests for gotcha relationships
- [ ] Update ADR-002 with pattern/gotcha examples
- [ ] Create example sprint using patterns and gotchas

**Files:**
- Create: `packages/cli/test/integration/context-modules.test.ts`
- Update: `docs/adr/ADR-002-ai-readable-code-frontmatter.md`
- Create: `docs/templates/SPRINT-WITH-PATTERNS.md`

Related: ADR-002, ADR-033, ADR-043

---

## Related Documents

- **EPIC**: [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- **Previous Sprint**: [EPIC-002 Sprint 1](./SPRINT-2025-11-epic002-phase1.md)
- **ADRs**: ADR-002, ADR-033, ADR-043

---

**Sprint Status**: Active
**Start Date**: 2025-11-25
**Created By**: Chris Norton
