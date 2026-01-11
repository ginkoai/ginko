---
epic_id: EPIC-009
status: active
created: 2026-01-03
updated: 2026-01-03
tags: [roadmap, product-management, strategic-planning, dashboard]
---

# EPIC-009: Product Roadmap Visualization

## Vision

Enable strategic visibility into committed work through a query-based roadmap view over Epic nodes. Roadmaps are a lens, not an entity—they answer "What work have we committed to?" by surfacing Epic nodes with temporal and commitment metadata.

## Goal

Implement ADR-056 (Roadmap as Epic View) to provide product teams with:
- Clear distinction between committed and exploratory work
- Quarter-based temporal planning (Q1-2026 format)
- Visual canvas for roadmap editing in the dashboard
- CLI visibility into roadmap state
- Change history tracking for accountability

## Success Criteria

- [ ] Epic nodes support roadmap properties (commitment_status, roadmap_status, target quarters)
- [ ] Existing Epics migrated with changelog initialized
- [ ] `ginko roadmap` CLI command displays committed work by quarter
- [ ] Dashboard Roadmap Canvas allows visual editing of Epic placement
- [ ] Changelog tracks all date/status changes with timestamps
- [ ] Uncommitted items validated to have no dates
- [ ] 2-year horizon warning for committed work

## Scope

### In Scope
- Epic schema extension with roadmap properties
- Data migration for existing Epics
- Changelog infrastructure on Epic nodes
- CLI `ginko roadmap` command (read-only)
- API endpoints for roadmap queries
- Dashboard Roadmap Canvas (visual editor)
- Filter controls (status, visibility, tags)
- Curated public roadmap export

### Out of Scope
- Multiple roadmaps per project (1:1 constraint per ADR-056)
- Feature node type (using Epics only)
- ML-based prioritization suggestions
- Integration with external tools (Jira, Linear)
- Real-time multi-user canvas editing

### Dependencies
- ADR-056: Roadmap as Epic View (approved)
- Existing Epic → Sprint → Task hierarchy
- Neo4j graph database
- Dashboard infrastructure (Next.js)

## Sprint Breakdown

| Sprint | ID | Goal | Duration | Status |
|--------|-----|------|----------|--------|
| Sprint 1 | e009_s01 | Schema & Data Migration | 1 week | Complete |
| Sprint 2 | e009_s02 | CLI & API | 1 week | Complete |
| Sprint 3 | e009_s03 | Roadmap Canvas (Dashboard) | 2 weeks | Not Started |
| Sprint 4 | e009_s04 | History & Polish | 1 week | Not Started |

**Total Duration:** ~5 weeks
**Total Effort:** ~64 hours

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration breaks existing queries | High | Test migration on staging first; add properties with safe defaults |
| Canvas performance with many Epics | Medium | Virtualization, pagination, lazy loading |
| Changelog arrays grow unbounded | Low | Prune entries > 2 years old |
| Confusion between commitment_status and roadmap_status | Medium | Clear UI labels, inline help text |

## Architecture Reference

See [ADR-056: Roadmap as Epic View](../adr/ADR-056-roadmap-as-epic-view.md) for full technical specification.

---

## Changelog

### v1.2.0 - 2026-01-11 (Sprint 2 Complete)
- Completed Sprint 2: CLI & API
- Created `ginko roadmap` CLI command with:
  - Default view shows committed epics by quarter
  - `--all` flag includes uncommitted items (ideas/backlog)
  - `--status` filter for not_started, in_progress, completed, cancelled
  - `--json` output for scripting
  - Status icons: ○ not_started, ◐ in_progress, ● completed, ✗ cancelled
- Created API endpoint `GET /api/v1/graph/roadmap`
  - Returns epics grouped by quarter
  - Summary with counts by commitment and status
- Files created:
  - `packages/cli/src/commands/roadmap/index.ts`
  - `dashboard/src/app/api/v1/graph/roadmap/route.ts`
- Participants: Chris Norton, Claude

### v1.1.0 - 2026-01-11 (Sprint 1 Complete)
- Completed Sprint 1: Schema & Data Migration
- Created roadmap types in `packages/shared/src/types/roadmap.ts`
- Implemented quarter parsing utilities in `packages/shared/src/utils/quarter.ts`
- Added Epic validation middleware in `packages/shared/src/validation/epic-roadmap.ts`
- Built CLI migration command: `ginko graph migrate 009`
- Created API migration endpoint at `/api/v1/migrations/009-epic-roadmap`
- Implemented changelog inference in `packages/cli/src/lib/roadmap/changelog-inference.ts`
- Fixed device auth flow (Safari timeout, OAuth redirect issues)
- Fixed API key authentication for CLI → API calls
- Dry-run validated: 29 Epic nodes ready for migration
- Participants: Chris Norton, Claude

### v1.0.0 - 2026-01-03
- Initial epic creation
- Participants: Chris Norton, Claude
- Based on collaborative design session for ADR-056
