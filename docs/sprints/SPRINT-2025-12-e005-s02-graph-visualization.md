# SPRINT: EPIC-005 Sprint 2 - Graph Visualization

**Epic**: EPIC-005 Market Readiness

## Sprint Overview

**Sprint Goal**: Build the graph visualization layer that demonstrates ginko's unique value - showing how knowledge compounds and connections emerge across AI collaboration sessions.

**Duration**: 2 weeks
**Type**: Feature sprint
**Progress:** 100% (8/8 tasks complete)

**Success Criteria:**
- [x] Collapsible tree explorer for hierarchical elements
- [x] Card-based exploration for multi-relation nodes
- [x] C4-style zoom: summary cards → focused view with adjacencies
- [x] Graph data fetching and caching layer

---

## Sprint Tasks

### TASK-1: Graph Data Architecture (3h)
**Status:** [ ] Todo
**Priority:** HIGH
**ID:** e005_s02_t01

**Goal:** Design the data fetching and caching layer for graph visualization.

**Context:**
- Dashboard currently fetches from `/api/v1/graph/` endpoints
- Need efficient caching for graph traversal
- Support both tree hierarchy and card-based views

**Deliverables:**
- Data fetching hooks (`useGraphNodes`, `useNodeAdjacencies`)
- Caching strategy (React Query or SWR)
- Type definitions for graph entities
- API client consolidation

**Files:**
- `dashboard/src/lib/graph/` (new directory)
- `dashboard/src/hooks/useGraph.ts` (new)

---

### TASK-2: Tree Explorer Component (4h)
**Status:** [ ] Todo
**Priority:** HIGH
**ID:** e005_s02_t02

**Goal:** Build collapsible tree explorer for hierarchical navigation.

**Hierarchy Structure:**
```
Project (root)
├── Charter
├── Epics
│   └── Epic
│       └── Sprints
│           └── Sprint
│               └── Tasks
│                   └── Task
├── ADRs
├── Patterns
└── Gotchas
```

**Deliverables:**
- TreeExplorer component with expand/collapse
- TreeNode component with type-specific icons
- Selection state management
- Keyboard navigation (up/down/left/right/enter)

**Files:**
- `dashboard/src/components/graph/tree-explorer.tsx` (new)
- `dashboard/src/components/graph/tree-node.tsx` (new)

Follow: Marketing site aesthetic (dark theme, ginko green highlights)

---

### TASK-3: Node Card Component (3h)
**Status:** [ ] Todo
**Priority:** HIGH
**ID:** e005_s02_t03

**Goal:** Create card component for displaying node summaries.

**Card Variants:**
- ADR card (title, status, summary)
- Pattern card (name, confidence, description)
- Gotcha card (title, severity, description)
- Task card (title, status, assignee)
- Sprint card (name, progress, dates)

**Deliverables:**
- NodeCard base component
- Type-specific card variants
- Hover/selected states
- Connection indicators

**Files:**
- `dashboard/src/components/graph/node-card.tsx` (new)
- `dashboard/src/components/graph/card-variants/` (new directory)

Follow: Corner brackets aesthetic for cards

---

### TASK-4: Card Grid View (3h)
**Status:** [ ] Todo
**Priority:** HIGH
**ID:** e005_s02_t04

**Goal:** Build card grid for exploring non-hierarchical nodes.

**Features:**
- Filterable by node type (ADR, Pattern, Gotcha, etc.)
- Searchable by name/content
- Sortable by date, name, relevance
- Responsive grid layout

**Deliverables:**
- CardGrid component
- Filter bar component
- Search input with debounce
- Sort controls

**Files:**
- `dashboard/src/components/graph/card-grid.tsx` (new)
- `dashboard/src/components/graph/filter-bar.tsx` (new)

---

### TASK-5: Node Detail Panel (4h)
**Status:** [ ] Todo
**Priority:** HIGH
**ID:** e005_s02_t05

**Goal:** Build the focused view panel for selected nodes.

**Panel Features:**
- Full node content display
- 1-hop adjacencies (related nodes)
- Breadcrumb navigation
- Action buttons (edit, sync status)

**C4-Style Zoom Pattern:**
1. User clicks card in grid → Panel slides in
2. Panel shows full content + immediate connections
3. Clicking connection zooms to that node

**Deliverables:**
- NodeDetailPanel component
- AdjacencyList component
- Breadcrumb navigation
- Panel animations

**Files:**
- `dashboard/src/components/graph/node-detail-panel.tsx` (new)
- `dashboard/src/components/graph/adjacency-list.tsx` (new)

---

### TASK-6: Graph Page Layout (3h)
**Status:** [ ] Todo
**Priority:** MEDIUM
**ID:** e005_s02_t06

**Goal:** Create the main graph exploration page layout.

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│ Header (existing nav)                               │
├──────────────┬──────────────────────────────────────┤
│ Tree Explorer│ Card Grid / Detail Panel             │
│ (collapsible)│                                      │
│              │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Features:**
- Resizable sidebar (tree explorer)
- Toggle between grid/detail views
- Maintain selection state across views

**Deliverables:**
- Graph page layout component
- Resizable panel implementation
- View state management

**Files:**
- `dashboard/src/app/dashboard/graph/page.tsx` (new)
- `dashboard/src/app/dashboard/graph/layout.tsx` (new)

---

### TASK-7: Graph Navigation Integration (2h)
**Status:** [ ] Todo
**Priority:** MEDIUM
**ID:** e005_s02_t07

**Goal:** Integrate graph explorer into dashboard navigation.

**Navigation Updates:**
- Add "Graph" to sidebar navigation
- Update dashboard home to link to graph
- Add breadcrumbs for deep navigation
- URL-based node selection (shareable links)

**Deliverables:**
- Sidebar nav update
- Route configuration
- URL state management
- Deep linking support

**Files:**
- `dashboard/src/components/dashboard/dashboard-sidebar.tsx`
- `dashboard/src/app/dashboard/graph/[nodeId]/page.tsx` (new)

---

### TASK-8: Sprint 2 Polish and Documentation (2h)
**Status:** [x] Complete
**Priority:** LOW
**ID:** e005_s02_t08

**Goal:** Polish, test, and document the graph visualization features.

**Deliverables:**
- [x] Component documentation
- [x] Visual QA against marketing site
- [x] Performance testing with sample data
- [x] Sprint retrospective
- [x] Bug fixes (corner brackets, adjacencies API, description display, tree-grid sync)
- [x] Created EPIC-006 backlog for future enhancements

**Files:**
- Sprint file updates
- `docs/epics/EPIC-006-graph-explorer-v2.md` (new)

**Bug Fixes Completed (2025-12-11):**
1. Fixed missing corner brackets on grid cards (all 4 corners now display)
2. Reduced excessive padding between brackets and cards
3. Created missing `/api/v1/graph/adjacencies/[nodeId]` route (was causing 404)
4. Fixed tree-view selection not scrolling to card in grid-view
5. Added more property fallbacks for node descriptions (content, context, purpose)

---

## Technical Notes

### Graph API Endpoints (existing)
- `GET /api/v1/graph/nodes` - List nodes by type
- `GET /api/v1/graph/query` - Semantic search
- `GET /api/v1/graph/adjacencies/:nodeId` - Get related nodes

### State Management
- Use React Query for server state (caching, refetching)
- Zustand or context for UI state (selection, view mode)
- URL params for shareable state (selected node, filters)

### Performance Considerations
- Lazy load adjacencies on node selection
- Virtualize long lists (tree nodes, card grids)
- Debounce search input
- Cache traversed paths

---

## Blockers

None yet.

---

## Next Steps

After Sprint 2:
- Sprint 3: Coaching Insights Engine
- Sprint 4: Knowledge Editing + Beta Polish

---

**Sprint Status: NOT STARTED**
**Sprint Start: 2025-12-11**
