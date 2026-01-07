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
| Sprint 1 | e009_s01 | Schema & Data Migration | 1 week | Not Started |
| Sprint 2 | e009_s02 | CLI & API | 1 week | Not Started |
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

### v1.0.0 - 2026-01-03
- Initial epic creation
- Participants: Chris Norton, Claude
- Based on collaborative design session for ADR-056
