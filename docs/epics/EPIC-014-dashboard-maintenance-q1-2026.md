---
epic_id: EPIC-014
status: active
category: maintenance
created: 2026-01-12
updated: 2026-01-12
tags: [maintenance, dashboard, q1-2026]
---

# EPIC-014: Dashboard Maintenance Q1-2026

## Purpose

Ongoing maintenance, bug fixes, and polish work for the Ginko Dashboard (app.ginkoai.com) during Q1 2026.

This is a **maintenance epic** (ADR-059) - a container for operational work that keeps the dashboard healthy. It is hidden from the roadmap by default and does not require commitment decision factors.

## Scope

### In Scope
- Bug fixes discovered through UAT or user feedback
- Mobile responsive polish
- Minor UI/UX improvements
- Performance optimizations
- Accessibility fixes

### Out of Scope
- New features (belong in feature epics)
- Major architectural changes (require their own epic)
- Work on other components (CLI, Infrastructure, Marketing have their own maintenance epics)

## Components Covered

- Dashboard UI (`dashboard/src/components/*`)
- Dashboard pages (`dashboard/src/app/*`)
- Dashboard API routes (`dashboard/src/app/api/*`)
- Insights view
- Graph Explorer
- Roadmap view
- Settings

## Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| e014_s01 | Insights Mobile UAT & Polish | Active |

## Success Criteria

Maintenance epics don't have traditional success criteria. Success is measured by:
- Bugs resolved
- User-reported issues addressed
- Dashboard stability maintained
- Mobile experience functional

## References

- ADR-059: Maintenance Epics
- EPIC-006: UX Polish and UAT (predecessor feature epic)
