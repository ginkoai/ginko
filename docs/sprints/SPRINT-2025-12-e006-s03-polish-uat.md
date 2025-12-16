# SPRINT: UX Polish Sprint 3 - Polish + UAT

## Sprint Overview

**Epic:** EPIC-006 (UX Polish and UAT)
**Sprint Goal**: Final polish, Principle UI integration, mobile responsiveness, and User Acceptance Testing preparation.

**Duration**: 4-5 days
**Type**: Polish + Testing sprint
**Progress:** 0% (0/6 tasks complete)

**Success Criteria:**
- [ ] Edit modal integrated with Node View
- [ ] Principle nodes styled and visible in all views
- [ ] Recommendations link to Principles
- [ ] Mobile responsive at all breakpoints
- [ ] UAT checklist created and executed
- [ ] Documentation updated

---

## Sprint Tasks

### TASK-12: Edit Mode Integration (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s03_t12

**Goal:** Add edit button to Node View that opens NodeEditor modal.

**Implementation:**
1. Add "Edit" button to NodeView header (for editable types)
2. Open NodeEditor in modal overlay
3. After save, refresh node data
4. Show "Pending Sync" indicator for unsynced nodes

**Editable Types:**
- ADR, PRD, Pattern, Gotcha, Charter (project docs)
- Custom Principles (not Standard)

**Files:**
- `dashboard/src/components/graph/NodeView.tsx` (add edit button)
- `dashboard/src/components/graph/NodeEditorModal.tsx` (new - modal wrapper)

---

### TASK-13: Principle Node UI (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s03_t13

**Goal:** Add Principle nodes to all views with proper styling.

**Implementation:**
1. Add Principle to NodeCard icon/color mapping (suggest: indigo/violet)
2. Add Principle to TreeExplorer hierarchy
3. Add Principle Summary Card to Project View
4. Add Principle detail view in NodeView
5. Show "Standard" badge for read-only principles

**Color Scheme:**
```typescript
Principle: {
  bg: 'bg-indigo-500/10',
  text: 'text-indigo-400',
  border: 'border-indigo-500/30',
  icon: BookOpen or Lightbulb
}
```

**Files:**
- `dashboard/src/components/graph/node-card.tsx` (add Principle colors/icon)
- `dashboard/src/components/graph/adjacency-list.tsx` (add Principle support)
- `dashboard/src/lib/graph/types.ts` (already updated in Sprint 1)

---

### TASK-14: Recommendation-to-Principle Linking (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s03_t14

**Goal:** Link insight recommendations to Principle nodes.

**Implementation:**
1. Store principle_id references in recommendations
2. Update PrinciplePreviewModal to fetch from graph
3. Add "View in Graph" link in modal
4. Navigate to Principle in Graph section when clicked

**Data Flow:**
```
InsightCard → Click recommendation
  → PrinciplePreviewModal (shows theory, related)
    → "View in Graph" button
      → Navigate to /dashboard/graph?view=node&node=principle_id
```

**Files:**
- `dashboard/src/lib/insights/types.ts` (add principle_id to recommendations)
- `dashboard/src/components/insights/PrinciplePreviewModal.tsx` (update)
- `dashboard/src/components/insights/InsightCard.tsx` (update linking)

---

### TASK-15: Mobile Responsive Polish (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s03_t15

**Goal:** Ensure all new views work on mobile/tablet.

**Test Breakpoints:**
- `sm`: 640px (mobile)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)

**Key Adjustments:**
1. Project View: Stack Summary Cards vertically on mobile
2. Category View: Single column card grid on mobile
3. Node View: Full-width on mobile, scrollable
4. Breadcrumbs: Truncate middle items on narrow screens
5. Modals: Full-screen on mobile, scrollable content

**Files:**
- Various component files (responsive Tailwind adjustments)

---

### TASK-16: UAT Testing Checklist (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**ID:** e006_s03_t16

**Goal:** Create and execute UAT testing checklist.

**Test Scenarios:**

**Navigation Flow:**
- [ ] Navigate Project → Category → Node
- [ ] Use breadcrumbs to return to Project
- [ ] Browser back/forward buttons work
- [ ] URL reflects current view state

**Insights Section:**
- [ ] Click recommendation opens Principle modal
- [ ] Modal shows theory and related patterns
- [ ] Evidence shows full datetime
- [ ] Evidence "View Source" opens detail modal
- [ ] Sidebar collapses to icons
- [ ] Collapse state persists on refresh

**Graph Section:**
- [ ] Project View shows Charter and metrics
- [ ] Summary Cards show count + progress
- [ ] Category View displays filtered cards
- [ ] Node View shows full detail
- [ ] Edit button opens modal (editable types only)
- [ ] "Pending Sync" indicator shows for unsynced

**Principle Nodes:**
- [ ] Standard Principles display with badge
- [ ] Standard Principles are not editable
- [ ] Custom Principles are editable
- [ ] Principles appear in tree, cards, and modals

**Cross-Browser:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

**Files:**
- `docs/uat/EPIC-006-UAT-CHECKLIST.md` (new)

---

### TASK-17: Documentation Updates (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**ID:** e006_s03_t17

**Goal:** Update user guides for new features.

**Updates:**

1. **GRAPH-VISUALIZATION.md**
   - Add C4-style navigation explanation
   - Document Project/Category/Node views
   - Update navigation instructions
   - Add breadcrumb usage

2. **COACHING-INSIGHTS.md**
   - Add recommendation modal instructions
   - Document Principle linking
   - Update evidence display description

3. **New Screenshots**
   - Project View
   - Category View
   - Node View with breadcrumbs
   - Recommendation modal

**Files:**
- `docs/guides/GRAPH-VISUALIZATION.md` (update)
- `docs/guides/COACHING-INSIGHTS.md` (update)

---

## Accomplishments This Sprint

[To be updated as tasks complete]

---

## Next Steps

After Sprint 3 complete → EPIC-006 Complete, ready for beta testing

---

## Blockers

[To be updated if blockers arise]
