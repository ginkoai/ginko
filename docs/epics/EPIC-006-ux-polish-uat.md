---
epic_id: EPIC-006
status: complete
created: 2025-12-16
updated: 2026-01-03
completed: 2026-01-03
target: 2026-01 (when-ready)
---

# EPIC-006: UX Polish and UAT

## Vision

Extend ginko's promise of "Flow state in seconds" throughout the entire dashboard experience. Create a magical UX that helps users quickly orient themselves in their project, understand AI collaboration principles, and navigate knowledge seamlessly.

## Goal

Polish the Dashboard for User Acceptance Testing with C4-style graph navigation, Principle-backed coaching insights, and refined interaction patterns that make complex project knowledge instantly accessible.

## Success Criteria

### Theme 1: Insights Polish (Sprint 1 - Complete)
- [x] Recommendations link to modal dialogs showing underlying Principles
- [x] Evidence entries display full datetime with modal to view source records
- [x] Collapsible left-nav (icon-only mode)

### Theme 2: C4-Style Graph Navigation (Sprint 2 - Complete)
- [x] Project View: Charter as root with project metrics and Summary Cards
- [x] Category View: Grid of condensed cards for selected node type
- [x] Node View: Full-page detail with breadcrumb navigation
- [x] Summary Cards show count + status preview (e.g., "5 Tasks ███░░ 3/5")
- [x] Related nodes display as Summary Cards by type
- [x] Breadcrumb navigation for deep exploration

### Theme 3: Principle Node Type (Sprint 1 - Complete)
- [x] Principle schema: principle_id, name, theory, related_principles, type, version
- [x] Standard Principles seeded from CLAUDE.md, ADRs, vendor best practices
- [x] Standard Principles are read-only; Custom Principles are editable
- [x] Recommendations reference Principles via principle_id

## Scope

### In Scope

**Insights Section:**
- Recommendation → Principle modal linking
- Evidence timestamp and source modal
- Collapsible category sidebar

**Graph Section:**
- Three-view navigation model (Project/Category/Node)
- Breadcrumb-based navigation spine
- Summary Cards with status preview
- Edit modal integration
- View transitions with Framer Motion

**Principle Node Type:**
- New node type in graph schema
- Neo4j migration
- Standard principles seeding (~10-15 foundational)
- UI integration in all views

### Out of Scope
- CLI UX polish (deferred to future epic)
- Team/organization features
- Mobile app (desktop-first)
- Real-time collaboration
- ML-based recommendations

### Dependencies
- EPIC-005 complete (graph visualization, insights, knowledge editing)
- Neo4j operational
- Supabase operational

## Sprint Breakdown

| Sprint | Goal | Duration | Status |
|--------|------|----------|--------|
| Sprint 1 | Foundation + Insights Polish | 5-6 days | Complete |
| Sprint 2 | C4-Style Graph Navigation | 7-8 days | Complete |
| Sprint 3 | Polish + UAT | 4-5 days | Complete |

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Project node | Charter-as-root | No new node type; Charter already has project metadata |
| Practice nodes | Pattern with category tag | Reuse existing infrastructure vs. new node type |
| Navigation model | Replace + breadcrumb | Simpler mental model than sliding panels |
| Standard principles | Read-only | Preserve curated guidance; users create Custom |
| Summary Cards | Count + status preview | Extra info worth the complexity |

## Technical Considerations

### New Components (11 total)

```
dashboard/src/components/
├── ui/dialog.tsx
├── insights/
│   ├── PrinciplePreviewModal.tsx
│   ├── EvidenceDetailModal.tsx
│   └── InsightsSidebar.tsx
└── graph/
    ├── ProjectView.tsx
    ├── CategoryView.tsx
    ├── NodeView.tsx
    ├── SummaryCard.tsx
    ├── MetricsRow.tsx
    ├── CondensedNodeCard.tsx
    ├── RelatedNodesSummary.tsx
    ├── Breadcrumbs.tsx
    ├── ViewTransition.tsx
    └── NodeEditorModal.tsx
```

### Database Changes

**Neo4j Migration (011-principle-nodes.cypher):**
```cypher
CREATE CONSTRAINT principle_id IF NOT EXISTS FOR (p:Principle) REQUIRE p.id IS UNIQUE;
CREATE INDEX principle_type IF NOT EXISTS FOR (p:Principle) ON (p.type);
```

### Principle Schema

```typescript
interface PrincipleNode {
  principle_id: string;           // PRINCIPLE-001
  name: string;                   // "Preserve Session Context"
  theory: string;                 // Markdown explanation
  related_principles: string[];   // ["PRINCIPLE-002", ...]
  type: 'Standard' | 'Custom';
  version: string;                // "1.0.0"
  status: 'active' | 'deprecated';
}
```

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| View transition complexity | Medium | Medium | Use existing Framer Motion patterns |
| Breadcrumb state sync | Medium | Medium | Centralize in ViewModeProvider |
| Principle content quality | Medium | High | Review with domain experts |
| Mobile layout issues | Medium | Medium | Test early at breakpoints |

## Estimated Duration

- Sprint 1: 5-6 days (17h)
- Sprint 2: 7-8 days (26h)
- Sprint 3: 4-5 days (18h)
- **Total: ~17 days / 61 hours**

---

## Changelog

### v1.0.0 - 2025-12-16
- Initial epic creation
- Defined 3-sprint structure
- Established C4-style navigation model
- Added Principle node type design
- Participants: chris@watchhill.ai, Claude
