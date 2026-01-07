---
epic_id: EPIC-011
status: proposed
created: 2025-12-11
updated: 2026-01-07
tags: [graph-explorer, ux, dashboard, visualization]
---

# EPIC-011: Graph Explorer v2 - UX Polish & Advanced Features

**Status:** Proposed
**Priority:** Medium
**Estimated Duration:** 2-3 sprints (4-6 weeks)
**Prerequisite:** EPIC-005 Sprint 2 complete

> **Note:** Renumbered from EPIC-006 on 2026-01-07 to resolve duplicate ID conflict.
> Original EPIC-006 is "UX Polish and UAT" (complete).

---

## Vision

Transform the Graph Explorer from a technical data browser into an intuitive knowledge navigation tool that non-technical users can use effectively. Make the graph's power accessible to everyone on the team.

---

## Problem Statement

The current Graph Explorer (EPIC-005 Sprint 2) provides solid technical infrastructure but has usability gaps:

1. **Relationships not visible** - Users can't see how nodes connect to each other
2. **No edit capability** - Project documentation nodes (ADR, Charter, etc.) can't be modified in-place
3. **Missing hierarchy in tree view** - Sprints aren't nested under Epics
4. **Limited node visibility** - Only some Epics display; Charter node missing
5. **UX alien to non-technical users** - Data explorer paradigm vs. knowledge discovery

---

## Proposed Features

### Sprint 1: Relationship Visualization & Navigation

**Goal:** Make connections visible and navigable

**Tasks:**
- [ ] Display relationship lines between nodes in card grid view
- [ ] Add "Connections" tab in detail panel showing all relationships
- [ ] Implement relationship-based navigation ("Show related nodes")
- [ ] Add relationship type filtering (IMPLEMENTS, REFERENCES, BELONGS_TO, etc.)
- [ ] Create mini-map for large graphs
- [ ] Performance optimization for large relationship sets

**Success Criteria:**
- Users can see how any node connects to others
- Clicking a relationship navigates to the connected node
- Graph remains responsive with 500+ visible relationships

---

### Sprint 2: Edit Capability & Node Management

**Goal:** Enable in-place editing of project documentation

**Tasks:**
- [ ] Add edit mode toggle for editable node types (ADR, Charter, Pattern, Gotcha)
- [ ] Implement inline editing for node properties
- [ ] Add node creation capability (Create ADR, Create Pattern, etc.)
- [ ] Implement node deletion with confirmation
- [ ] Add version history / change tracking
- [ ] Sync edits back to git-native files (CLAUDE.md, docs/*.md)

**Editable Node Types:**
- Charter (purpose, goals, success criteria)
- ADR (decision, consequences, status)
- Pattern (description, confidence, example code)
- Gotcha (description, severity, mitigation)

**Non-Editable (Generated):**
- Event (auto-logged from sessions)
- Commit (from git)
- Session (from ginko start/handoff)

**Success Criteria:**
- Users can edit ADR content directly in the explorer
- Changes sync bidirectionally with filesystem
- Audit trail shows who changed what

---

### Sprint 3: UX Refinement & Accessibility

**Goal:** Make the explorer intuitive for non-technical users

**Tasks:**
- [ ] Redesign tree view with proper Epic → Sprint → Task hierarchy
- [ ] Add Charter node to tree (currently missing)
- [ ] Display all Epics (currently only showing 1)
- [ ] Add "Getting Started" overlay for first-time users
- [ ] Implement search with natural language queries
- [ ] Add keyboard shortcuts with discoverability
- [ ] Create view presets ("Project Overview", "Active Sprint", "Architecture Decisions")
- [ ] Add export capability (PDF, Markdown summary)
- [ ] Mobile-responsive design

**UX Research Questions:**
- How do product managers expect to use this?
- What mental model do non-engineers have for "knowledge graph"?
- What terminology resonates vs. confuses?

**Success Criteria:**
- Product manager can navigate and understand project state in <2 minutes
- New team member can find relevant ADRs without assistance
- Mobile users can view (read-only) the graph

---

## Technical Considerations

### API Additions Needed
- `PUT /api/v1/graph/nodes/:id` - Update node properties
- `DELETE /api/v1/graph/nodes/:id` - Delete node
- `GET /api/v1/graph/relationships` - List relationships with filtering
- Webhook for file sync on edit

### Performance Requirements
- Lazy load relationships (not all at once)
- Virtualize tree view for large projects
- Cache aggressively with smart invalidation

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Screen reader support for tree navigation
- Keyboard-only operation possible

---

## Backlog Items (Not Yet Scheduled)

These items emerged from EPIC-005 Sprint 2 polish but weren't in scope:

1. **Green corner brackets missing upper-right and lower-left** - Fixed in Sprint 2
2. **Padding between brackets and cards too big** - Fixed in Sprint 2
3. **404 on adjacencies API** - Fixed in Sprint 2 (route was missing)
4. **Tree-view selection not syncing to grid-view** - Fixed in Sprint 2
5. **ADR descriptions not displaying** - Fixed in Sprint 2

### Known Issues for v2
- Minor UI polish items TBD from visual QA
- Performance with large graphs (>1000 nodes) not tested
- Real-time collaboration not considered yet

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to find relevant ADR | Unknown | <30 seconds |
| Non-engineer usability score | Unknown | >4/5 |
| Edit completion rate | N/A | >90% |
| Mobile usage | 0% | >10% |

---

## Dependencies

- EPIC-005 Sprint 2 complete (graph foundation)
- User research with non-technical stakeholders
- Design review of proposed UX changes

---

*Created: 2025-12-11 during EPIC-005 Sprint 2 TASK-8*
*Author: Chris Norton, Claude Code*
*Renumbered: 2026-01-07 (was EPIC-006, conflicted with UX Polish epic)*
