# SPRINT: UX Polish Sprint 2 - C4-Style Graph Navigation

## Sprint Overview

**Epic:** EPIC-006 (UX Polish and UAT)
**Sprint Goal**: Implement three-view navigation model (Project/Category/Node) with breadcrumb navigation and Summary Cards.

**Duration**: 7-8 days
**Type**: Feature sprint
**Progress:** 0% (0/6 tasks complete)

**Success Criteria:**
- [ ] Project View shows Charter with metrics and Summary Cards
- [ ] Category View displays grid of condensed cards by type
- [ ] Node View provides full-page detail with breadcrumbs
- [ ] Summary Cards show count + status preview
- [ ] Navigation transitions work smoothly
- [ ] Tree Explorer integrates with new views

---

## Sprint Tasks

### TASK-6: ViewMode State + URL Routing (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s02_t06

**Goal:** Implement view mode state management with URL sync.

**View Modes:**
- `project` - Charter as root with metrics
- `category` - Grid of condensed cards for a node type
- `node` - Full node detail with breadcrumb navigation

**URL Pattern:**
- `/dashboard/graph` - Project view (default)
- `/dashboard/graph?view=category&type=ADR` - Category view
- `/dashboard/graph?view=node&node=<id>` - Node view

**Implementation:**
1. Create ViewMode type and context
2. Update URL sync logic in graph/page.tsx
3. Create ViewModeProvider for state management

**Files:**
- `dashboard/src/lib/graph/view-mode.ts` (new - types and context)
- `dashboard/src/app/dashboard/graph/page.tsx` (update routing logic)

---

### TASK-7: Project View Component (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s02_t07

**Goal:** Create Project View showing Charter as root with project metrics.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ PROJECT CHARTER (Hero Card)                     │
│ Purpose summary, key goals                      │
├─────────────────────────────────────────────────┤
│ METRICS ROW                                     │
│ [Completion %] [Days Remaining] [Blockers]      │
├─────────────────────────────────────────────────┤
│ SUMMARY CARDS GRID                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ EPICS   │ │ PRDs    │ │ ADRs    │            │
│ │ 5 Total │ │ 3 Total │ │ 12 Total│            │
│ │ ███░░   │ │ ███░    │ │ ██████░ │            │
│ └─────────┘ └─────────┘ └─────────┘            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Patterns│ │ Gotchas │ │Principles│           │
│ │ 8 Total │ │ 5 Total │ │ 10 Total│            │
│ │ ████░░  │ │ ███░░   │ │ ████████│            │
│ └─────────┘ └─────────┘ └─────────┘            │
└─────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/components/graph/ProjectView.tsx` (new)
- `dashboard/src/components/graph/SummaryCard.tsx` (new)
- `dashboard/src/components/graph/MetricsRow.tsx` (new)

---

### TASK-8: Category View Component (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s02_t08

**Goal:** Create Category View showing grid of condensed cards for a node type.

**Implementation:**
1. Reuse CardGrid component with condensed card variant
2. Add type-specific header with count and actions
3. Back navigation to Project View
4. Click on card navigates to Node View

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Back to Project    ADRs (12 total)            │
├─────────────────────────────────────────────────┤
│ [Search...] [Sort ▼] [Filter]                   │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ ADR-001  │ │ ADR-002  │ │ ADR-003  │         │
│ │ Title... │ │ Title... │ │ Title... │         │
│ │ accepted │ │ accepted │ │ proposed │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/components/graph/CategoryView.tsx` (new)
- `dashboard/src/components/graph/CondensedNodeCard.tsx` (new - smaller variant)

---

### TASK-9: Node View + Breadcrumb Navigation (5h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s02_t09

**Goal:** Refactor NodeDetailPanel to full-page Node View with breadcrumb navigation.

**Key Changes:**
1. Node View replaces current view (not overlay panel)
2. Breadcrumbs show navigation path (Project > Category > Node)
3. Related Nodes section shows Summary Cards by type
4. Clicking related node replaces view and updates breadcrumb

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Project > ADRs > ADR-054 Knowledge Editing      │
├─────────────────────────────────────────────────┤
│ [ADR] ADR-054                        [Edit]     │
│ Knowledge Editing Architecture                  │
│ Status: accepted                                │
├─────────────────────────────────────────────────┤
│ DECISION                                        │
│ Bidirectional sync between dashboard and git... │
├─────────────────────────────────────────────────┤
│ RELATED NODES                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Tasks   │ │ Patterns│ │ Sprints │            │
│ │ 3 refs  │ │ 2 refs  │ │ 1 ref   │            │
│ └─────────┘ └─────────┘ └─────────┘            │
└─────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/components/graph/NodeView.tsx` (new - full page version)
- `dashboard/src/components/graph/RelatedNodesSummary.tsx` (new)
- `dashboard/src/components/graph/Breadcrumbs.tsx` (new - reusable component)
- `dashboard/src/app/dashboard/graph/page.tsx` (update to use NodeView)

---

### TASK-10: Navigation Transitions (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s02_t10

**Goal:** Wire up navigation between views with smooth transitions.

**Implementation:**
1. Add view transitions using Framer Motion
2. Ensure URL updates on navigation
3. Handle browser back/forward buttons
4. Preserve scroll position where appropriate

**Files:**
- `dashboard/src/components/graph/ViewTransition.tsx` (new)
- `dashboard/src/app/dashboard/graph/page.tsx` (update transition logic)

---

### TASK-11: Tree Explorer Updates (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s02_t11

**Goal:** Update Tree Explorer to work with new navigation model.

**Changes:**
1. Clicking node navigates to Node View (not just selects)
2. Add "View in Grid" action to navigate to Category View
3. Maintain collapse state across view changes

**Files:**
- `dashboard/src/components/graph/tree-explorer.tsx` (update)
- `dashboard/src/components/graph/tree-node.tsx` (update click handling)

---

## Accomplishments This Sprint

[To be updated as tasks complete]

---

## Next Steps

After Sprint 2 complete → Proceed to Sprint 3 (Polish + UAT)

---

## Blockers

[To be updated if blockers arise]
