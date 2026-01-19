# Sprint: Dashboard Maintenance - UI and Data Fixes

**ID:** `adhoc_260119_s01`
**Type:** Maintenance / Bug Fixes
**Priority:** HIGH
**Created:** 2026-01-19

## Problem Statement

Multiple UI issues and data inconsistencies in the dashboard affecting user experience.

### Issues Identified

1. **Badge hidden under avatar** - Notification badge in header is clipped behind avatar
2. **Project-root 404 error** - Clicking "Project" in nav tree causes infinite API 404 errors
3. **Current sprint in ProjectView** - Duplicated info already shown in Focus page, and had broken status logic
4. **Duplicate ginko projects in Settings** - Two separate "ginko" teams appear (data issue)
5. **Sprint titles showing "string };"** - Some sprints display malformed titles
6. **Epics showing no Sprints/Tasks** - Epics 13, 12, 11, 7, 1 and Dashboard Maintenance Epic display empty

---

## Tasks

### Code Fixes (Complete)

- [x] **adhoc_260119_s01_t01** - Fix notification badge z-index
  - File: `dashboard/src/components/dashboard/dashboard-nav.tsx:235`
  - Issue: Badge had `absolute -top-1 -right-1` but no z-index, clipped behind avatar border
  - Fix: Added `z-10` class to badge span

- [x] **adhoc_260119_s01_t02** - Fix project-root 404 error
  - Files: `dashboard/src/app/dashboard/graph/page.tsx:326,363-374`
  - Issue: "project-root" is a virtual tree node (not in Neo4j), clicking triggered DB fetch which 404'd
  - Fix: Added explicit check for `nodeId === 'project-root'` - now navigates to project view

- [x] **adhoc_260119_s01_t03** - Remove current sprint from ProjectView
  - File: `dashboard/src/components/graph/ProjectView.tsx`
  - Issue: Duplicated Focus page, had broken status logic (checked for 'active' but sprints use 'in_progress')
  - Fix: Removed `activeSprint`, `sprintMetrics` state and the "Consolidated Sprint Metrics Card" section

- [x] **adhoc_260119_s01_t04** - Create admin endpoints for investigation
  - File: `dashboard/src/app/api/v1/admin/teams/route.ts` (NEW)
  - File: `dashboard/src/app/api/v1/admin/diagnostics/route.ts` (NEW)
  - Teams endpoint: List all teams, delete by ID
  - Diagnostics endpoint: Analyze epics, sprints, malformed titles

### Data Fixes (Complete)

- [x] **adhoc_260119_s01_t05** - Delete duplicate ginko team
  - Root cause: Team "ginko" (1 member) created 2026-01-18 was duplicate of "Ginko Core Team" (3 members)
  - Fix: Deleted duplicate team via admin endpoint
  - Team ID deleted: `c17690f4-9f0f-4f8f-8284-947fc0ece58f`

- [x] **adhoc_260119_s01_t06** - Fix malformed sprint titles
  - Found 4 sprints with titles like "string;" or "string };"
  - Root cause: TypeScript type annotation accidentally stored as title (CLI bug)
  - Fixed via PATCH to node endpoint:
    - `SPRINT-2025-12-epic004-sprint4-orchestration` → "Sprint 4: Orchestration Layer"
    - `SPRINT-2025-12-graph-infrastructure` → "SPRINT: Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)"
    - `SPRINT-2026-01-e009-s02-cli-api` → "SPRINT: Product Roadmap Sprint 2 - CLI & API"
    - `SPRINT-2026-01-epic008-sprint2` → "SPRINT: Team Collaboration Sprint 2 - Visibility & Coordination"

- [x] **adhoc_260119_s01_t07** - Investigate Epics with no children
  - Finding: Epics 001, 007, 011, 012, 013, 014 genuinely have no sprints in Neo4j
  - EPIC-011 has local sprint files (e011_s00 through e011_s03) but they haven't been synced to graph
  - Other epics are either empty or their sprints haven't been created yet
  - Tree building code is correct - it matches sprints to epics via ID pattern extraction
  - **Resolution:** Not a bug - epics correctly show empty when no sprints exist in graph

---

## Files Modified

| File | Change |
|------|--------|
| `dashboard/src/components/dashboard/dashboard-nav.tsx` | Added `z-10` to notification badge |
| `dashboard/src/app/dashboard/graph/page.tsx` | Handle project-root click, skip fetch |
| `dashboard/src/components/graph/ProjectView.tsx` | Removed current sprint section |
| `dashboard/src/app/api/v1/admin/teams/route.ts` | NEW - Admin team management |
| `dashboard/src/app/api/v1/admin/diagnostics/route.ts` | NEW - Graph diagnostics |

---

## Progress

**Status:** Complete
**Progress:** 100% (7/7 tasks complete)

## Notes

- All code fixes deployed to production
- Duplicate team deleted
- 4 malformed sprint titles corrected in Neo4j
- Empty epics are expected behavior - sprints need to be synced to graph
- EPIC-011 sprints exist locally but need `ginko sync` to push to graph
- Related sprint: `adhoc_260117_s01` (Dashboard Data Isolation) - completed 2026-01-17
