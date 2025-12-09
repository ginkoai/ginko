---
epic_id: EPIC-005
status: active
created: 2025-12-09
updated: 2025-12-09
target: 2026-01 (when-ready)
---

# EPIC-005: Market Readiness (Beta 1)

## Vision

Prepare ginko for public beta launch by crystallizing product positioning and transforming the dashboard into a compelling, value-demonstrating experience. ginko has evolved from a simple session-handoff utility into a full-fledged AI collaboration platform. This epic ensures we can articulate that value clearly and demonstrate it tangibly.

## Goal

Launch ginko beta 1 with clear product positioning for two audiences (indie developers and SWE leaders) and a dashboard that demonstrates the platform's unique value through graph visualization, coaching insights, and knowledge management.

## Success Criteria

### Theme 1: Product Positioning
- [ ] Concise tagline for ginko
- [ ] Concise product description (e.g., "ginko is an AI collaboration platform")
- [ ] Elevator pitch for indie developer segment
- [ ] Elevator pitch for SWE leader segment
- [ ] Branding and copy for each major component (CLI, collaboration graph, dashboard, autonomous agent collaboration)
- [ ] GitHub-focused open-source presence for developers
- [ ] Enterprise persuasion tools (infographics, ROI talking points, TCO analysis)

### Theme 2: Dashboard UX & Value
- [ ] Collapsible tree explorer for hierarchical elements (Project → Charter/Epics/Sprints/Tasks/Commits)
- [ ] Card-based exploration for multi-relation nodes (ADRs, PRDs, Patterns, Gotchas)
- [ ] C4-style zoom: summary cards → focused view with 1-hop adjacencies
- [ ] AI-driven coaching insights engine (CLI-first, results in Supabase)
- [ ] Coaching insights displayed in dashboard
- [ ] Knowledge node CRUD operations in dashboard
- [ ] CLI sync-on-demand for knowledge changes (diff, merge, push to git)
- [ ] Notification scheme for unsynced knowledge nodes
- [ ] Visual consistency with marketing site (dark theme, ginko green, JetBrains Mono + Inter)

## Scope

### In Scope

**Product Positioning:**
- Tagline, product description, elevator pitches
- Dual-track messaging (indie devs / SWE leaders)
- Component branding (CLI, graph, dashboard, agents)
- GitHub README and open-source presence refinement
- Marketing collateral for SWE leaders (infographics, ROI, talking points)

**Dashboard UX:**
- Graph visualization (bi-modal: tree explorer + card-based navigation)
- Coaching insights engine and display
- Knowledge node editing with git sync
- Visual refresh to match marketing site branding

### Out of Scope
- Team/organization features (multi-user collaboration)
- Billing and subscription management
- Enterprise SSO/SAML authentication
- Cross-project pattern discovery
- ML-based pattern recommendation
- Real-time collaboration features
- Mobile app or responsive mobile dashboard

### Dependencies
- Neo4j graph database (operational)
- Supabase for insights storage (operational)
- Marketing site branding established (complete)
- ADR-002 frontmatter standard (complete)

## Sprint Breakdown

| Sprint | Goal | Duration | Status |
|--------|------|----------|--------|
| Sprint 1 | Product Positioning + Dashboard Foundation | 2 weeks | Not Started |
| Sprint 2 | Graph Visualization | 2 weeks | Not Started |
| Sprint 3 | Coaching Insights Engine | 2 weeks | Not Started |
| Sprint 4 | Knowledge Editing + Beta Polish | 2 weeks | Not Started |

## Audience Strategy

### Indie Developers
**Channel:** GitHub, npm, developer communities
**Message:** Quick to try, zero friction, immediate value
**Collateral:**
- Clear README with install command
- 30-second demo GIF
- "Get Started" docs

### SWE Leaders
**Channel:** Marketing site, LinkedIn, enterprise outreach
**Message:** Team productivity, measurable ROI, governance
**Collateral:**
- Infographics showing productivity gains
- ROI calculator or talking points
- Case study format for internal advocacy
- "How to pitch to decision makers" guide

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Graph visualization performance with large graphs | Medium | High | Implement pagination, lazy loading, node limits |
| Coaching insights quality/usefulness unclear | Medium | Medium | Start minimal, iterate based on feedback |
| Git sync conflicts with dashboard edits | Low | Medium | Clear conflict resolution UI, prefer git as source of truth |
| Scope creep into team features | Medium | High | Strict scope boundaries, defer to EPIC-006 |

## Technical Considerations

### Dashboard Stack
- Next.js (existing)
- Tailwind CSS (align with marketing site tokens)
- React components for graph visualization
- Supabase for insights storage

### Graph Visualization Options
- Tree explorer: Custom React component or react-arborist
- Card navigation: Custom grid with filtering
- Consider: react-flow for potential future force-directed needs

### Coaching Insights Architecture
- CLI command: `ginko insights` (MVP)
- Analysis runs locally, results stored in Supabase
- Dashboard fetches and displays insights
- Categories: session efficiency, pattern adoption, collaboration quality, anti-patterns

---

## Changelog

### v1.0.0 - 2025-12-09
- Initial epic creation
- Defined 4-sprint structure
- Established dual-audience positioning strategy
- Participants: chris@watchhill.ai, Claude
