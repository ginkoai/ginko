# SPRINT: Graph Explorer v2 Sprint 1 - Hierarchy Navigation UI

## Sprint Overview

**Sprint Goal**: Implement tree-based navigation matching user mental model
**Duration**: 1-2 weeks
**Type**: Feature sprint
**Progress:** 43% (3/7 tasks complete)
**Prerequisite:** Sprint 0 complete (data model fixes)

**Success Criteria:**
- [x] Nav Tree shows nested Epic → Sprint → Task hierarchy
- [x] Parent link visible at top of detail cards
- [x] Child summary cards shown at footer of parent nodes
- [ ] Referenced nodes (ADRs, Patterns) in separate section
- [ ] Browser back button works with breadcrumbs
- [ ] BUG-002 fixed (ADR edit modal loads content)

---

## Design Specifications

### Nav Tree Structure (Target)

**Current (problematic):**
```
📁 Epics
├── EPIC-009
├── EPIC-010
📁 Sprints        ← Flat, not nested
├── Sprint 1
├── Sprint 2
📁 ADRs
├── ADR-001
```

**Target:**
```
📁 Project
├── 📋 EPIC-009: Product Roadmap
│   ├── 🏃 e009_s01: Schema Migration
│   ├── 🏃 e009_s02: CLI & API
│   ├── 🏃 e009_s03: Roadmap Canvas
│   ├── 🏃 e009_s04: History & Polish
│   └── 🏃 e009_s05: UAT & Polish
├── 📋 EPIC-010: Marketing Strategy
│   ├── 🏃 e010_s01: Analytics
│   └── 🏃 e010_s02: Landing Page
└── 📚 Knowledge
    ├── ADRs (24)
    ├── Patterns (8)
    └── Gotchas (5)
```

### Detail Card Layout (Target)

```
┌─────────────────────────────────────────────────┐
│ ← Parent: EPIC-009                              │  Parent link (clickable)
├─────────────────────────────────────────────────┤
│ 🏃 Sprint: e009_s05 - UAT & Polish              │  Title
│ Status: Complete • 6 tasks • 15h total          │  Metadata
├─────────────────────────────────────────────────┤
│                                                 │
│ Sprint Goal: Manual UAT testing and UI/UX      │  Content
│ polish for all roadmap features                │
│                                                 │
├─────────────────────────────────────────────────┤
│ Tasks (6)                                       │  Children section
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ ✓ t01    │ │ ✓ t02    │ │ ✓ t03    │         │
│ │ Card Dup │ │ Desktop  │ │ Mobile   │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ ✓ t04    │ │ ⊘ t05    │ │ ✓ t06    │         │
│ │ Responsive│ │ Blocked │ │ Navigation│        │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ References                                      │  References section
│ 📄 ADR-056: Roadmap as Epic View               │
│ 🎨 Pattern: DnD Kit Integration                │
└─────────────────────────────────────────────────┘
```

---

## Sprint Tasks

### e011_s01_t01: Refactor Nav Tree for Hierarchy (6h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Restructure Nav Tree to show Epic → Sprint → Task nesting

**Current Implementation:**
- `dashboard/src/components/graph/tree-explorer.tsx`
- Flat structure with separate branches for each node type

**Changes Required:**
1. Remove flat "Sprints" top-level branch
2. Nest sprints under their parent Epic
3. Nest tasks under their parent Sprint
4. Keep "Knowledge" branch for ADRs, Patterns, Gotchas
5. Add expand/collapse for hierarchy levels

**Data Requirements (from Sprint 0):**
- Sprints have `epic_id` property
- Tasks have `sprint_id` property
- Hierarchy query API available

**Files:**
- `dashboard/src/components/graph/tree-explorer.tsx`
- `dashboard/src/lib/graph/hooks.ts` - Data fetching

**Acceptance Criteria:**
- [ ] Epics show as top-level items under "Project"
- [ ] Sprints nested under their parent Epic
- [ ] Tasks nested under their parent Sprint (collapsed by default)
- [ ] Expand/collapse icons work correctly
- [ ] Selection state preserved when expanding/collapsing

---

### e011_s01_t02: Add Parent Link to Detail Cards (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Show parent context at top of detail cards

**Implementation:**
1. Add "Parent: X" link at top of NodeView component
2. Link navigates to parent node when clicked
3. Show parent only if node has a parent (not for Epics, ADRs)

**Parent Relationships:**
- Task → Sprint
- Sprint → Epic
- Epic → (none)
- ADR, Pattern, Gotcha → (none, but may have REFERENCES)

**Files:**
- `dashboard/src/components/graph/NodeView.tsx`
- `dashboard/src/lib/graph/api-client.ts` - Add parent fetch

**Acceptance Criteria:**
- [ ] Sprint detail shows "Parent: EPIC-009" link
- [ ] Task detail shows "Parent: e009_s05" link
- [ ] Clicking parent navigates to parent node
- [ ] Parent link styled consistently with breadcrumbs

---

### e011_s01_t03: Show Child Summary Cards (5h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Display child nodes as clickable summary cards at footer

**Implementation:**
1. Add "Children" section below content in NodeView
2. Fetch children using hierarchy API
3. Display as compact cards with key info
4. Clicking card navigates to child detail

**Child Card Content:**
- **Sprint card:** ID, title, status icon, task count
- **Task card:** ID, title, status icon, estimated hours

**Layout:**
- Grid of cards: 3 columns desktop, 2 tablet, 1 mobile
- Max 9 visible, "Show all X" link if more
- Cards are compact (~100px width)

**Files:**
- `dashboard/src/components/graph/NodeView.tsx`
- New: `dashboard/src/components/graph/ChildrenSection.tsx`
- New: `dashboard/src/components/graph/ChildCard.tsx`

**Acceptance Criteria:**
- [ ] Epic shows Sprint cards
- [ ] Sprint shows Task cards
- [ ] Cards show status icon and key metadata
- [ ] Clicking card navigates to child
- [ ] "Show all" appears when >9 children

---

### e011_s01_t04: Show Referenced Nodes Section (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Display ADRs, Patterns, Gotchas referenced by current node

**Implementation:**
1. Add "References" section below children
2. Query REFERENCES relationships from current node
3. Group by node type (ADRs, Patterns, Gotchas)
4. Display as list items with icons

**Query:**
```cypher
MATCH (n {id: $nodeId})-[:REFERENCES]->(ref)
RETURN ref.id, ref.label, ref.title
```

**Display:**
```
References
📄 ADR-056: Roadmap as Epic View
📄 ADR-052: Entity Naming Convention
🎨 Pattern: DnD Kit Integration
⚠️ Gotcha: Neo4j Integer Comparison
```

**Files:**
- `dashboard/src/components/graph/NodeView.tsx`
- New: `dashboard/src/components/graph/ReferencesSection.tsx`
- `dashboard/src/lib/graph/api-client.ts` - Add references fetch

**Acceptance Criteria:**
- [ ] References section shows related ADRs, Patterns, Gotchas
- [ ] Grouped by type with appropriate icons
- [ ] Clicking reference navigates to that node
- [ ] Empty state: "No references" (hidden if none)

---

### e011_s01_t05: Fix Breadcrumb Back Button Navigation (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Ensure browser back button works with breadcrumb navigation

**Current Issue:**
- Breadcrumbs track navigation path
- But browser back may not match breadcrumb state

**Implementation:**
1. Ensure each navigation pushes to browser history
2. Use `router.push()` not `router.replace()` for navigation
3. Handle `popstate` event to sync breadcrumb state
4. Clear breadcrumbs appropriately on back navigation

**Test Scenarios:**
1. Navigate: Epic → Sprint → Task
2. Click back: Should return to Sprint (breadcrumb updates)
3. Click back: Should return to Epic (breadcrumb updates)
4. Click back: Should return to Project view

**Files:**
- `dashboard/src/app/dashboard/graph/page.tsx`
- `dashboard/src/components/graph/Breadcrumbs.tsx`

**Acceptance Criteria:**
- [ ] Browser back button navigates to previous node
- [ ] Breadcrumbs update to reflect back navigation
- [ ] URL stays in sync with displayed node
- [ ] No "flash" of wrong content on back

---

### e011_s01_t06: Fix BUG-002 - ADR Edit Modal Content (4h)
**Status:** [ ] Not Started
**Priority:** HIGH - Deferred from EPIC-009
**Assignee:** TBD

**Bug Description:**
ADR edit modal opens but doesn't load existing content for editing. The content field is empty.

**Investigation Areas:**
1. NodeEditorModal component - How is content loaded?
2. API call to fetch full node content
3. State management - Is content being set correctly?
4. Timing - Does modal open before content loads?

**Files:**
- `dashboard/src/components/graph/NodeEditorModal.tsx`
- `dashboard/src/lib/graph/api-client.ts`

**Acceptance Criteria:**
- [ ] Edit modal loads existing ADR content
- [ ] Content is editable and can be saved
- [ ] Works for all editable node types (ADR, Pattern, Gotcha)

---

### e011_s01_t07: Integration Testing & Polish (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** End-to-end testing of hierarchy navigation

**Test Scenarios:**
1. **Nav Tree Navigation**
   - Expand Epic → See Sprints
   - Expand Sprint → See Tasks
   - Click Task → Detail view opens

2. **Detail Card Navigation**
   - View Sprint → See "Parent: EPIC-X" link
   - Click parent → Navigate to Epic
   - View Sprint → See Task cards
   - Click task card → Navigate to Task

3. **Breadcrumb Navigation**
   - Navigate deep: Epic → Sprint → Task
   - Click breadcrumb → Navigate to that level
   - Browser back → Previous level

4. **References**
   - View Sprint with ADR reference → See in References
   - Click reference → Navigate to ADR

**Acceptance Criteria:**
- [ ] All navigation paths work correctly
- [ ] No broken links or 404s
- [ ] Performance acceptable (<500ms navigation)
- [ ] Mobile layout functional (read-only)

---

## Technical Notes

### Hierarchy API Usage

```typescript
// Fetch children for a node
const { children } = await graphClient.getHierarchy(nodeId, 'children');

// Fetch parent for a node
const { parent } = await graphClient.getHierarchy(nodeId, 'parent');

// Fetch references for a node
const { references } = await graphClient.getReferences(nodeId);
```

### Component Structure

```
graph/
├── tree-explorer.tsx      # Left nav tree
├── NodeView.tsx           # Main detail view
├── ChildrenSection.tsx    # NEW: Child summary cards
├── ChildCard.tsx          # NEW: Individual child card
├── ReferencesSection.tsx  # NEW: Referenced nodes
├── Breadcrumbs.tsx        # Navigation breadcrumbs
└── NodeEditorModal.tsx    # Edit modal (fix BUG-002)
```

---

## UI/UX Notes

### Icons
- 📋 Epic
- 🏃 Sprint
- ✓ Task (complete)
- ○ Task (pending)
- ⊘ Task (blocked)
- 📄 ADR
- 🎨 Pattern
- ⚠️ Gotcha

### Status Colors
- Complete: Green (#22c55e)
- In Progress: Yellow (#eab308)
- Blocked: Red (#ef4444)
- Not Started: Gray (#6b7280)

---

## Dependencies

- Sprint 0 complete (data model fixes)
- Hierarchy API endpoint available
- All sprints synced with `epic_id`
- Tasks synced with `sprint_id`

---

## Sprint Metadata

**Epic:** EPIC-011 (Graph Explorer v2)
**Sprint ID:** e011_s01
**Started:** TBD (after Sprint 0)
**Participants:** TBD
