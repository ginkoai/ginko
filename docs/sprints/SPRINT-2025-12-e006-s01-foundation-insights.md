# SPRINT: UX Polish Sprint 1 - Foundation + Insights Polish

## Sprint Overview

**Epic:** EPIC-006 (UX Polish and UAT)
**Sprint Goal**: Create foundational components (Dialog, Principle node type) and polish the Insights section with recommendation modals and evidence timestamps.

**Duration**: 5-6 days
**Type**: Foundation + Polish sprint
**Progress:** 100% (4/4 tasks complete) ✓

**Success Criteria:**
- [x] Dialog component created (Radix-based)
- [x] Recommendations link to Principle modals
- [x] Evidence shows datetime with source modal option
- [x] Insights sidebar collapsible to icons
- [x] Principle node type added to schema

---

## Sprint Tasks

### TASK-1: Dialog Component + Recommendation Modals (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s01_t01

**Goal:** Create reusable Dialog component and implement recommendation modals on insights.

**Implementation:**
1. Create Dialog component using Radix UI primitives (consistent with Shadcn/UI pattern)
2. Add PrinciplePreviewModal component for showing principle details
3. Update InsightCard to make recommendations clickable
4. Modal shows: Principle name, theory (why it matters), related patterns

**Files:**
- `dashboard/src/components/ui/dialog.tsx` (new - based on @radix-ui/react-dialog)
- `dashboard/src/components/insights/PrinciplePreviewModal.tsx` (new)
- `dashboard/src/components/insights/InsightCard.tsx` (update recommendations section)

---

### TASK-2: Evidence Timestamps + Detail Modal (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**ID:** e006_s01_t02

**Goal:** Enhance evidence display with full datetime and optional modal for viewing source records.

**Implementation:**
1. Update InsightEvidence type to ensure timestamp is datetime (not just date)
2. Add "View Source" button on evidence items with links
3. Create EvidenceDetailModal for viewing full event/task/commit details
4. Modal fetches actual record from graph API when available

**Files:**
- `dashboard/src/lib/insights/types.ts` (add optional `sourceUrl` field)
- `dashboard/src/components/insights/EvidenceDetailModal.tsx` (new)
- `dashboard/src/components/insights/InsightCard.tsx` (update evidence section)

---

### TASK-3: Collapsible Insights Sidebar (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**ID:** e006_s01_t03

**Goal:** Make the Insights page category nav collapsible to icon-only state.

**Implementation:**
1. Create insights-specific sidebar for category filtering
2. Add collapsible state with icon-only mode (like TreeExplorer pattern)
3. Persist collapse state in localStorage
4. Smooth transition animation using Framer Motion

**Files:**
- `dashboard/src/components/insights/InsightsSidebar.tsx` (new)
- `dashboard/src/app/dashboard/insights/page-client.tsx` (update layout)

---

### TASK-4: Principle Node Type - Schema + API (4h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e006_s01_t04

**Goal:** Add Principle node type to the graph schema and API.

**Schema:**
```typescript
interface PrincipleNode {
  principle_id: string;           // PRINCIPLE-001
  name: string;                   // "Preserve Session Context"
  theory: string;                 // Markdown explanation
  related_principles: string[];   // ["PRINCIPLE-002", ...]
  type: 'Standard' | 'Custom';    // Standard = read-only
  version: string;                // "1.0.0"
  status: 'active' | 'deprecated';
}
```

**Relationships:**
- `(Principle)-[:GUIDES]->(Pattern|ADR|Task)`
- `(Pattern)-[:IMPLEMENTS_PRINCIPLE]->(Principle)`

**Files:**
- `dashboard/src/lib/graph/types.ts` (add Principle to NodeLabel union)
- `dashboard/src/lib/node-schemas.ts` (add PRINCIPLE_SCHEMA - custom only editable)
- `src/graph/schema/011-principle-nodes.cypher` (new Neo4j migration)

---

### TASK-5: Standard Principles Seeding (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**ID:** e006_s01_t05

**Goal:** Create standard principles from CLAUDE.md, ADRs, and vendor best practices.

**Implementation:**
1. Parse CLAUDE.md for key principles (context loading, defensive logging, etc.)
2. Extract principles from relevant ADRs (ADR-002, ADR-033, ADR-043)
3. Research vendor best practices (Anthropic, OpenAI documentation)
4. Create seed script to initialize standard principles
5. Mark as `type: 'Standard'` so they're read-only

**Initial Principles:**
- PRINCIPLE-001: AI-Optimized File Discovery (ADR-002)
- PRINCIPLE-002: Defensive Logging at Low Pressure (ADR-033)
- PRINCIPLE-003: Event-Based Context Loading (ADR-043)
- PRINCIPLE-004: Git as Source of Truth
- PRINCIPLE-005: Sprint Progress Tracking
- PRINCIPLE-006: Session Continuity
- (+ additional from vendor research)

**Files:**
- `packages/cli/src/data/standard-principles.ts` (new - principle definitions)
- `packages/cli/src/commands/principles/seed.ts` (new - seed to graph)

---

## Accomplishments This Sprint

[To be updated as tasks complete]

---

## Next Steps

After Sprint 1 complete → Proceed to Sprint 2 (C4-Style Graph Navigation)

---

## Blockers

[To be updated if blockers arise]
