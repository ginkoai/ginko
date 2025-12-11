# SPRINT: Market Readiness Sprint 2 - Graph Visualization

## Sprint Overview

**Sprint Goal**: Build bi-modal graph visualization - collapsible tree explorer for hierarchy and card-based navigation for multi-relation nodes.

**Duration**: 2 weeks
**Type**: Feature sprint
**Progress:** 0% (0/10 tasks complete)

**Success Criteria:**
- [ ] Tree explorer displays Project → Charter/Epics/Sprints/Tasks/Commits hierarchy
- [ ] Card-based view for ADRs, PRDs, Patterns, Gotchas with type filtering
- [ ] Focused view shows node detail + 1-hop adjacencies
- [ ] Graph data loads from API with acceptable performance

---

## Sprint Tasks

### TASK-1: Graph Visualization Architecture Design (3h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Design the component architecture for bi-modal graph visualization.

**Design Decisions:**
- Tree explorer: Custom React component vs react-arborist vs similar
- Card grid: Custom implementation with filtering
- State management: React context vs Zustand
- Data fetching: React Query vs SWR vs custom

**Deliverables:**
- Architecture decision document
- Component hierarchy diagram
- Data flow diagram

**Files:**
- `docs/adr/ADR-XXX-graph-visualization-architecture.md` (new)

---

### TASK-2: Graph API Enhancement (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Ensure graph API supports all queries needed for visualization.

**Required Endpoints:**
- GET `/api/v1/graph/tree` - Hierarchical structure for tree explorer
- GET `/api/v1/graph/nodes?labels=ADR&limit=N` - Filtered node lists
- GET `/api/v1/graph/node/:id` - Single node with relationships
- GET `/api/v1/graph/node/:id/adjacent` - 1-hop neighbors

**Implementation:**
- Review existing graph API capabilities
- Add missing endpoints
- Optimize queries for performance

**Files:**
- `dashboard/src/app/api/v1/graph/tree/route.ts` (new)
- `dashboard/src/app/api/v1/graph/node/[id]/route.ts` (new or update)
- `dashboard/src/app/api/v1/graph/node/[id]/adjacent/route.ts` (new)

---

### TASK-3: Tree Explorer Component (8h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Build collapsible tree explorer for hierarchical elements.

**Tree Structure:**
```
Project
├── Charter
├── Epics
│   ├── EPIC-001
│   │   ├── Sprint-1
│   │   │   ├── TASK-1
│   │   │   ├── TASK-2
│   │   │   └── ...
│   │   └── Sprint-2
│   └── EPIC-002
├── Sprints (isolated)
│   ├── Sprint-A
│   └── Sprint-B
├── ADRs
│   ├── ADR-001
│   └── ADR-002
├── PRDs
│   ├── PRD-001
│   └── PRD-002
├── Patterns
└── Gotchas
```

**Features:**
- Expand/collapse nodes
- Visual indicators for node types
- Click to select and show details
- Keyboard navigation (bonus)

**Files:**
- `dashboard/src/components/graph/TreeExplorer.tsx` (new)
- `dashboard/src/components/graph/TreeNode.tsx` (new)
- `dashboard/src/hooks/useGraphTree.ts` (new)

Follow: Marketing site visual style

---

### TASK-4: Node Card Component (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create reusable card component for displaying node summaries.

**Card Content:**
- Node type badge (ADR, PRD, Pattern, Gotcha, etc.)
- Node ID and title
- Brief description/excerpt
- Status indicator (if applicable)
- Last updated date

**Variants:**
- Summary card (for grid view)
- Detail card (for focused view)
- Mini card (for adjacent nodes in focused view)

**Files:**
- `dashboard/src/components/graph/NodeCard.tsx` (new)
- `dashboard/src/components/graph/NodeCardSummary.tsx` (new)
- `dashboard/src/components/graph/NodeCardDetail.tsx` (new)

Follow: Marketing site card aesthetic (corner brackets)

---

### TASK-5: Card Grid View with Filtering (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Build filterable card grid for browsing multi-relation nodes.

**Features:**
- Type filter (ADRs, PRDs, Patterns, Gotchas, Events)
- Search/filter by title
- Sort options (date, alphabetical)
- Pagination or infinite scroll
- Grid/list view toggle (bonus)

**Layout:**
- Responsive grid (1-4 columns based on viewport)
- Summary cards with hover preview

**Files:**
- `dashboard/src/components/graph/CardGrid.tsx` (new)
- `dashboard/src/components/graph/CardGridFilters.tsx` (new)
- `dashboard/src/hooks/useFilteredNodes.ts` (new)

---

### TASK-6: Focused Node View (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create focused view that shows node detail + 1-hop adjacent nodes.

**Layout (C4-style zoom):**
```
┌─────────────────────────────────────────────────────┐
│  ← Back to Grid                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │           FOCUSED NODE (Detail Card)         │  │
│  │                                               │  │
│  │  ADR-002: AI-Optimized File Discovery        │  │
│  │  [Full content / markdown rendered]          │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Adjacent Nodes (1 hop)                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ TASK-1  │ │ TASK-5  │ │Pattern-3│ │ ADR-033 │   │
│  │ uses    │ │ uses    │ │ related │ │ related │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Breadcrumb navigation
- Full node content (markdown rendered)
- Relationship labels on adjacent nodes
- Click adjacent node to navigate

**Files:**
- `dashboard/src/components/graph/FocusedView.tsx` (new)
- `dashboard/src/components/graph/AdjacentNodes.tsx` (new)

---

### TASK-7: Graph Dashboard Page Integration (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Integrate visualization components into dashboard page.

**Page Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Collaboration Graph                                │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  Tree Explorer   │  Card Grid / Focused View       │
│  (sidebar)       │  (main content area)            │
│                  │                                  │
│  [collapsible]   │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

**Features:**
- Tree explorer as collapsible sidebar
- Main content toggles between card grid and focused view
- URL routing for deep links to specific nodes
- Loading states and error handling

**Files:**
- `dashboard/src/app/graph/page.tsx` (new or update)
- `dashboard/src/app/graph/[nodeId]/page.tsx` (new)

---

### TASK-8: Dashboard Data Display Fix (3h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Fix dashboard to display live collaboration data correctly.

**Issue:**
- API returns mock data when no scorecards exist
- Mock data schema doesn't match what components expect
- Component expects `scores.overallCollaboration`, mock has `scores.overall`
- All scores show as 0% due to property name mismatch

**Fix Options:**
1. Update mock data to match expected schema
2. Update component to be flexible with property names
3. Remove mock data and show proper empty states

**Files:**
- `dashboard/src/app/api/sessions/scorecards/route.ts` (lines 217-328)
- `dashboard/src/components/dashboard/sessions-with-scores.tsx`

---

### TASK-9: Notification Center Design & Implementation (6h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Design and implement the notification center in the dashboard header.

**Current State:**
- Bell icon exists with hardcoded "3" badge
- No dropdown/panel functionality
- No backend for notifications

**Deliverables:**
- Notification dropdown component
- Notification types (session updates, coaching tips, system alerts)
- Read/unread state management
- API endpoint for notifications
- Mark all as read functionality

**Design Requirements:**
- Match ginko dark theme
- Use corner brackets aesthetic
- Smooth animations

**Files:**
- `dashboard/src/components/dashboard/notification-center.tsx` (new)
- `dashboard/src/components/dashboard/dashboard-nav.tsx` (update)
- `dashboard/src/app/api/notifications/route.ts` (new)

---

### TASK-10: Performance Optimization and Testing (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Ensure graph visualization performs well with realistic data volumes.

**Performance Targets:**
- Tree explorer: < 500ms initial load
- Card grid: < 300ms filter response
- Focused view: < 200ms navigation

**Testing:**
- Unit tests for components
- Integration tests for API
- Performance profiling with large graphs

**Files:**
- `dashboard/src/components/graph/__tests__/` (new)
- Performance documentation

Avoid: Premature optimization - test with real data first

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

[To be updated during sprint]

## Blockers

[To be updated if blockers arise]
