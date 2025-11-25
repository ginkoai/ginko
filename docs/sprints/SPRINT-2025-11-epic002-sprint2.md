# SPRINT: EPIC-002 Sprint 2 - Pattern & Constraint Library

## Sprint Overview

**Sprint Goal**: Reduce rework through constraint awareness and pattern reuse
**Duration**: 3 weeks (2025-11-25 to 2025-12-15)
**Type**: Feature sprint (Graph relationships + Context modules)
**Progress:** 80% (4/5 tasks complete)

**Success Criteria:**
- Decision accuracy > 85% (AI chooses correct patterns)
- Rework rate < 10% (fewer "redo" events)
- Gotcha rediscovery < 5% (AI learns from past mistakes)
- Context module taxonomy operational

---

## Sprint Tasks

### TASK-1: Context Module Taxonomy (4-6h)
**Status:** [x] Complete
**Priority:** CRITICAL
**Owner:** Chris Norton

**Goal:** Define and implement context module types for graph storage

**Acceptance Criteria:**
- [x] Define module types: Pattern, Gotcha, Decision, Discovery
- [x] Create Neo4j node labels for each type
- [x] API endpoint: POST /api/v1/context-module (create)
- [x] API endpoint: GET /api/v1/context-module/:id (retrieve)
- [x] Schema migration for context module nodes

**Implementation:**
Already implemented. Uses single `ContextModule` node type with `category` property:
- `category: 'pattern' | 'gotcha' | 'decision' | 'discovery'`
- Schema: `002-pattern-gotcha-nodes.cypher`, `004-contextmodule-nodes.cypher`
- API: `/api/v1/knowledge/nodes` (supports ContextModule type)
- Relationships: `APPLIES_TO`, `MITIGATED_BY`, `EXHIBITS_PATTERN`

**Files:**
- Existing: `src/graph/schema/002-pattern-gotcha-nodes.cypher`
- Existing: `src/graph/schema/004-contextmodule-nodes.cypher`
- Existing: `dashboard/src/app/api/v1/knowledge/nodes/route.ts`
- Existing: `dashboard/src/app/api/v1/knowledge/nodes/[id]/route.ts`

Related: ADR-002, ADR-033

---

### TASK-2: Pattern → APPLIED_IN → File Relationships (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Track where patterns are used in the codebase

**Acceptance Criteria:**
- [x] Extract pattern references from sprint task definitions
- [x] Create APPLIED_IN relationships (Pattern → File)
- [x] Create APPLIES_PATTERN relationships (Task → Pattern)
- [ ] API endpoint: GET /api/v1/pattern/:id/usages (deferred)
- [ ] Display pattern usage in ginko start context (deferred)

**Implementation:**
- Extended sprint sync to extract pattern references from task sections
- Pattern detection: "use pattern from file.ts", explicit "-pattern" names
- Creates Task → APPLIES_PATTERN → Pattern relationships
- Creates Pattern → APPLIED_IN → File relationships

**Files:**
- Modified: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Modified: `packages/cli/src/lib/sprint-loader.ts`

Related: ADR-002, ADR-043

---

### TASK-3: Task → APPLIES_PATTERN Relationships (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Link tasks to patterns they should use

**Acceptance Criteria:**
- [x] Parse pattern references from sprint task definitions
- [x] Create APPLIES_PATTERN relationships in graph sync
- [ ] API endpoint: GET /api/v1/task/:id/patterns (deferred)
- [ ] Display pattern guidance in ginko start output (deferred)

**Implementation:**
Completed as part of TASK-2. Task → APPLIES_PATTERN relationships
created during sprint sync.

**Files:**
- Modified: `packages/cli/src/lib/sprint-loader.ts` (TASK-2)
- Modified: `dashboard/src/app/api/v1/sprint/sync/route.ts` (TASK-2)

Related: ADR-002, ADR-043

---

### TASK-4: Gotcha Detection & AVOID_GOTCHA Relationships (6h)
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Capture and surface gotchas to prevent AI from repeating mistakes

**Acceptance Criteria:**
- [x] Add 'gotcha' category to LogCategory type
- [x] Add Gotchas section to session log template
- [x] Extract gotchas from sprint task definitions
- [x] Create Gotcha nodes in graph with context
- [x] Create AVOID_GOTCHA relationships (Task → Gotcha)
- [ ] API endpoint: GET /api/v1/task/:id/gotchas (deferred)
- [ ] Display gotcha warnings in ginko start output (deferred)

**Implementation:**
- Added 'gotcha' to LogCategory union type
- Added ## Gotchas section to session log template with dual-routing
- Gotcha detection patterns in command-helpers.ts
- Sprint loader extracts gotcha references ("avoid X", "-gotcha" suffix)
- Sprint sync creates Gotcha nodes and AVOID_GOTCHA relationships

**Files:**
- Modified: `packages/cli/src/core/session-log-manager.ts`
- Modified: `packages/cli/src/utils/command-helpers.ts`
- Modified: `packages/cli/src/lib/sprint-loader.ts`
- Modified: `dashboard/src/app/api/v1/sprint/sync/route.ts`

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
