# Epic Index

This document maintains the official registry of all Epics to ensure unique numbering and provide a central reference.

## Active Epics

| Epic # | Title | Status | File |
|--------|-------|--------|------|
| [EPIC-001](EPIC-001-strategic-context-and-dynamic-adaptivity.md) | Strategic Context & Dynamic Adaptivity | Complete | `EPIC-001-strategic-context-and-dynamic-adaptivity.md` |
| [EPIC-002](EPIC-002-ai-native-sprint-graphs.md) | AI-Native Sprint Graphs | Complete | `EPIC-002-ai-native-sprint-graphs.md` |
| [EPIC-003](EPIC-003-marketing-launch.md) | Marketing & Launch Readiness | Active | `EPIC-003-marketing-launch.md` |
| [EPIC-004](EPIC-004-ai-to-ai-collaboration.md) | AI-to-AI Collaboration | Complete | `EPIC-004-ai-to-ai-collaboration.md` |
| [EPIC-005](EPIC-005-market-readiness.md) | Market Readiness (Beta 1) | Complete | `EPIC-005-market-readiness.md` |
| [EPIC-006](EPIC-006-ux-polish-uat.md) | UX Polish and UAT | Complete | `EPIC-006-ux-polish-uat.md` |
| [EPIC-007](EPIC-007-cross-platform-ai-instructions.md) | Cross-Platform AI Instructions | Planned | `EPIC-007-cross-platform-ai-instructions.md` |
| [EPIC-008](EPIC-008-team-collaboration.md) | Team Collaboration | Complete | `EPIC-008-team-collaboration.md` |
| [EPIC-009](EPIC-009-product-roadmap.md) | Product Roadmap Visualization | Active | `EPIC-009-product-roadmap.md` |
| [EPIC-010](EPIC-010-mvp-marketing-strategy.md) | MVP Marketing Strategy | Active | `EPIC-010-mvp-marketing-strategy.md` |
| [EPIC-011](EPIC-011-graph-explorer-v2.md) | Graph Explorer v2 - UX Polish & Advanced Features | Proposed | `EPIC-011-graph-explorer-v2.md` |
| [EPIC-012](EPIC-012-web-collaboration-gui.md) | Web Collaboration GUI | Proposed | `EPIC-012-web-collaboration-gui.md` |
| [EPIC-013](EPIC-013-codex-integration.md) | Ginko + OpenAI Codex Integration | Proposed | `EPIC-013-codex-integration.md` |

## Maintenance Epics

Maintenance epics (ADR-059) are containers for ongoing operational work. They are hidden from the roadmap by default.

| Epic # | Title | Status | File |
|--------|-------|--------|------|
| [EPIC-014](EPIC-014-dashboard-maintenance-q1-2026.md) | Dashboard Maintenance Q1-2026 | Active | `EPIC-014-dashboard-maintenance-q1-2026.md` |

## Status Summary

| Status | Count | Epics |
|--------|-------|-------|
| Complete | 6 | 001, 002, 004, 005, 006, 008 |
| Active | 3 | 003, 009, 010 |
| Proposed | 3 | 011, 012, 013 |
| Planned | 1 | 007 |

### EPIC-010: MVP Marketing Strategy
**Goal:** Drive ginko MVP adoption through data-driven, multi-channel marketing that positions the product as the essential context management tool for AI-assisted development. Build a content-first funnel leveraging blog posts as the foundation for social engagement, video content, and community building.

**Sprints:**
1. Analytics Foundation (GA4, PostHog, UTM tracking, event taxonomy)
2. Landing Page Optimization (conversion best practices, A/B testing, social proof)
3. Content & Multi-Channel Funnel (blog strategy, Reddit, X.com, LinkedIn, YouTube)
4. Launch, Community & Iteration (MVP launch, Discord setup, metric reviews)

**Key Features:**
- Blog as content hub (posts → social threads → videos → discussions)
- Analytics infrastructure from day one (data-driven iteration)
- Multi-platform organic presence (Reddit, X.com, LinkedIn, YouTube, Discord)
- Authentic developer engagement (no marketing fluff)
- A/B testing framework for continuous optimization

**Success Criteria:**
- Landing page conversion rate >3%
- 200+ organic visitors/week
- 25+ CLI installs from tracked campaigns
- Discord community with 25+ active members
- Active presence on 3+ platforms

**Status:** Active, planning complete 2026-01-06

---

## Epic Naming Convention

- **EPIC-XXX**: Sequential numbering starting from 001 (zero-padded to 3 digits)
- **Title**: Clear, descriptive name (45 chars max recommended)
- **Scope**: 2-6 sprints (4-12 weeks) typically
- **Deliverables**: Concrete features or capabilities
- **Validation**: Measurable success criteria

## Epic Lifecycle

1. **Proposed** - Vision defined, not yet scheduled
2. **Planned** - Scoped and prioritized, awaiting resources
3. **Ready to Execute** - Sprints planned, dependencies clear
4. **In Progress** - Active development
5. **Active** - Ongoing work (less formal than In Progress)
6. **Complete** - All sprints delivered, success criteria met
7. **Archived** - Historical record

## Notes

- EPIC-012 was renumbered from EPIC-010 on 2026-01-07 to resolve ID conflict with MVP Marketing Strategy
- EPIC-011 was renumbered from EPIC-006 on 2026-01-07 to resolve ID conflict
- EPIC-010 (MVP Marketing Strategy) created by xtophr, synced from graph on 2026-01-07
- Orphan entity `epic_ginko_1763746656116` deleted on 2026-01-07 (timestamp-based ID bug)

---

*Last updated: 2026-01-12*
*Added EPIC-014: Dashboard Maintenance Q1-2026 (first maintenance epic per ADR-059)*
