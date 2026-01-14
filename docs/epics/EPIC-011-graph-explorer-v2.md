---
epic_id: EPIC-011
status: active
created: 2025-12-11
updated: 2026-01-14
roadmap_lane: now
roadmap_status: not_started
tags: [graph-explorer, ux, dashboard, visualization, hierarchy]
---

# EPIC-011: Graph Explorer v2 - Hierarchy Navigation & UX Polish

**Status:** Active
**Priority:** High
**Estimated Duration:** 3 sprints (4-6 weeks)
**Prerequisite:** EPIC-009 complete (Roadmap Canvas)

---

## Vision

Transform the Graph Explorer into an intuitive hierarchy navigator that matches users' mental model: **Epics contain Sprints which contain Tasks**. Related knowledge (ADRs, Patterns, Gotchas) surfaces through explicit references, not complex graph topology.

---

## Problem Statement

User feedback from EPIC-009 revealed key insights:

### What Works
- Hierarchy navigation is intuitive (Epic → Sprint → Task)
- C4-style drill-down pattern resonates with users
- Breadcrumbs help orientation

### What Doesn't Work
- Box-and-line relationship diagrams are "messy and confusing"
- Sprints appear in their own top-level Nav Tree branch (should nest under Epics)
- Parent context missing from detail cards
- Related nodes (ADRs, Patterns) not visible in context

### Data Model Gaps (Blocking)
- Sprint nodes lack `epic_id` / parent relationships
- Only 5 of ~30 sprints synced to graph
- Task nodes not synced at all
- Epic nodes not visible via standard nodes API

---

## Revised Approach

### Design Principles (from User Feedback)

1. **Hierarchy over topology** - Users think in trees, not graphs
2. **One level at a time** - Epic shows Sprints (not Tasks), Sprint shows Tasks
3. **Parent context always visible** - "Parent: EPIC-009" at top of detail card
4. **References below children** - ADRs, Patterns shown in separate section
5. **Browser-native navigation** - Back button works with breadcrumbs

### Key UX Patterns

**Detail Card Layout:**
```
┌─────────────────────────────────────┐
│ Parent: EPIC-009                    │  ← Parent link
├─────────────────────────────────────┤
│ Sprint: e009_s05 UAT & Polish       │  ← Node title
│ Status: Complete | 6 tasks          │
│                                     │
│ [Description/Content]               │
│                                     │
├─────────────────────────────────────┤
│ Tasks (6)                           │  ← Child summary cards
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ t01 │ │ t02 │ │ t03 │ ...        │
│ └─────┘ └─────┘ └─────┘            │
├─────────────────────────────────────┤
│ References                          │  ← Related via REFERENCES edge
│ ADR-056: Roadmap as Epic View       │
│ Pattern: DnD Kit Integration        │
└─────────────────────────────────────┘
```

**Nav Tree Structure:**
```
📁 Project
├── 📋 EPIC-009: Product Roadmap
│   ├── 🏃 Sprint 1: Schema Migration
│   ├── 🏃 Sprint 2: CLI & API
│   └── 🏃 Sprint 5: UAT & Polish
├── 📋 EPIC-010: Marketing Strategy
│   └── 🏃 Sprint 1: Analytics
└── 📚 Knowledge
    ├── ADRs (24)
    ├── Patterns (8)
    └── Gotchas (5)
```

---

## Sprint Breakdown

| Sprint | ID | Goal | Duration | Status |
|--------|-----|------|----------|--------|
| Sprint 0 | e011_s00 | Data Model & Sync Fixes | 1 week | Complete |
| Sprint 1 | e011_s01 | Hierarchy Navigation UI | 1-2 weeks | Not Started |
| Sprint 2 | e011_s02 | Edit Capability & Sync | 1-2 weeks | Not Started |
| Sprint 3 | e011_s03 | Polish & Accessibility | 1 week | Not Started |

**Total Duration:** ~5 weeks
**Total Effort:** ~60 hours

---

## Sprint 0: Data Model & Sync Fixes (Prerequisite)

**Goal:** Fix graph data model so hierarchy navigation has data to display

**Key Tasks:**
1. Fix nodes API to return Epic nodes (query/label bug)
2. Sync all Sprint files to graph (currently 5 of ~30)
3. Add `epic_id` property and `BELONGS_TO` relationship on Sprint nodes
4. Sync Task nodes from sprint files
5. Add `sprint_id` property and `BELONGS_TO` relationship on Task nodes
6. Verify REFERENCES relationships exist for ADR/Pattern/Gotcha links

**Success Criteria:**
- All 14 Epics visible via nodes API
- All ~30 Sprints synced with parent Epic relationships
- Tasks extracted and linked to parent Sprints
- `ginko graph explore EPIC-009` shows child sprints

---

## Sprint 1: Hierarchy Navigation UI

**Goal:** Implement tree-based navigation matching user mental model

**Key Tasks:**
1. Refactor Nav Tree to show Epic → Sprint → Task hierarchy
2. Remove flat "Sprints" top-level branch
3. Add "Parent: X" link at top of detail cards
4. Show child summary cards at footer of parent nodes
5. Show referenced nodes (ADRs, Patterns) in separate section
6. Ensure breadcrumbs work with browser back button
7. Fix BUG-002: ADR edit modal not loading content

**Success Criteria:**
- Nav Tree shows nested Epic/Sprint/Task hierarchy
- Clicking Epic shows its Sprints as summary cards
- Clicking Sprint shows its Tasks as summary cards
- Referenced ADRs/Patterns visible on relevant nodes
- Browser back button navigates breadcrumb trail

---

## Sprint 2: Edit Capability & Sync

**Goal:** Enable in-place editing with bidirectional git sync

**Key Tasks:**
1. Implement inline editing for editable node types
2. Add node creation UI (Create ADR, Create Pattern)
3. Sync edits back to git-native files
4. Add change tracking / audit trail
5. Handle edit conflicts gracefully

**Editable:** Charter, ADR, Pattern, Gotcha, Epic, Sprint
**Non-Editable:** Event, Commit (auto-generated)

**Success Criteria:**
- Users can edit ADR content in explorer
- Changes sync to `docs/adr/*.md` files
- Edit history visible in node detail

---

## Sprint 3: Polish & Accessibility

**Goal:** Production-ready UX for all users

**Key Tasks:**
1. Mobile-responsive design (read-only)
2. Keyboard navigation with shortcuts
3. View presets ("Active Sprint", "Architecture Decisions")
4. Search with filtering
5. First-time user onboarding overlay
6. WCAG 2.1 AA compliance

**Success Criteria:**
- Non-technical users can navigate without assistance
- Mobile users can view project state
- Keyboard-only operation possible

---

## Technical Considerations

### API Changes Needed
- Fix `GET /api/v1/graph/nodes?label=Epic` (returns 0, should return 13)
- Add parent/child relationship queries
- Add `BELONGS_TO` relationship creation in sync

### Data Model
```
(Epic)-[:CONTAINS]->(Sprint)-[:CONTAINS]->(Task)
(Sprint)-[:REFERENCES]->(ADR)
(Task)-[:REFERENCES]->(Pattern)
```

### Performance
- Lazy load children (don't fetch all tasks for all sprints)
- Virtualize Nav Tree for large projects
- Cache with smart invalidation on sync

---

## Deferred Items

- Real-time multi-user collaboration
- ML-based suggestions
- Export to PDF/Markdown
- Integration with external tools (Jira, Linear)

---

## Changelog

### v2.0.0 - 2026-01-14 (Scope Revision)
- Major scope revision based on user feedback from EPIC-009
- Removed box-and-line relationship visualization (users found confusing)
- Added Sprint 0 for data model fixes (blocking issue)
- Reframed as "Hierarchy Navigation" vs "Relationship Visualization"
- Added UX patterns from user testing
- Participants: Chris Norton, Claude

### v1.0.0 - 2025-12-11
- Initial epic creation during EPIC-005 Sprint 2
- Participants: Chris Norton, Claude
