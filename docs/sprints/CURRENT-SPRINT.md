# Current Sprint Status

**Status**: Active Sprint
**Sprint**: SPRINT-2025-10-27-cloud-knowledge-graph
**Mode**: Implementation
**Started**: 2025-10-27
**Duration**: 4 weeks (ending 2025-11-24)

## Active Sprint

See: **[SPRINT-2025-10-27: Cloud-First Knowledge Graph Platform](./SPRINT-2025-10-27-cloud-knowledge-graph.md)**

### Sprint Goal

Launch MVP of cloud-first knowledge graph platform with GitHub OAuth, graph database, GraphQL API, and CLI integration.

**Strategic Pivot**: Moving from file-based local knowledge to cloud-first SaaS platform.

### Current Week: Week 1 (Research & Foundation)

**Focus**: Graph database evaluation, GitHub OAuth, multi-tenancy schema

**Active Tasks**:
- TASK-018: Graph database evaluation (PostgreSQL+AGE, Neo4j, DGraph, EdgeDB)
- TASK-019: GitHub OAuth implementation
- TASK-020: Multi-tenancy database schema

**Week 1 Goals**:
- ✅ Select and deploy graph database (staging)
- ✅ GitHub OAuth working end-to-end
- ✅ Users can authenticate via `ginko login`

### Sprint Overview

**Week 1**: Research & Foundation (database selection, auth)
**Week 2**: Core CRUD + Authorization (knowledge nodes, projects, teams)
**Week 3**: GraphQL API + CLI Integration (queries, knowledge commands)
**Week 4**: Public Discovery + Polish (OSS catalog, production deployment)

### Key Deliverables

- Cloud graph database infrastructure
- Multi-tenant platform (GitHub OAuth, teams, projects)
- GraphQL API (per ADR-039 schema)
- CLI integration (`ginko knowledge` commands)
- Public OSS catalog
- Production deployment

### Related Documents

- **PRD**: [PRD-010: Cloud-First Knowledge Graph Platform](../PRD/PRD-010-cloud-knowledge-graph.md)
- **Architecture**: [ADR-039: Knowledge Discovery Graph](../adr/ADR-039-graph-based-context-discovery.md) (cloud-first variant)

## Recent Completions (Pre-Sprint)

- **TASK-017**: Sprint archive cleanup (Oct 24)
- **TASK-016**: Real-time insight promotion (Oct 24)
- **TASK-015**: Core context modules system (Oct 24)
- **ADR-039**: Unified Knowledge Graph architecture (Oct 24)
- **TASK-009 through TASK-013**: Configuration sprint (Oct 23)

## Future Sprint Candidates

Potential upcoming sprints (planning phase):
- Browser Extension (SPRINT-2025-01-BROWSER-EXTENSION.md)
- Q1 Monetization Platform (SPRINT-2025-Q1-monetization-platform.md)
- Phase 1 Planning (sprint-plan-phase-1.md)

## How This Works

When a sprint becomes active:
1. Move/copy the sprint plan to docs/sprints/SPRINT-YYYY-MM-DD-name.md
2. Update this file to reference it: `See: SPRINT-YYYY-MM-DD-name.md`
3. The synthesis loader will pick up the active sprint automatically
4. When complete, add retrospective and archive to docs/sprints/archive/

When working from backlog only (like now):
- This file serves as the placeholder
- `ginko start` synthesis will fall back to loading active backlog items
- Work remains visible through session logs and git history

## Session Log Integration

Even without a sprint, context is maintained through:
- **Session logs**: `.ginko/sessions/{user}/current-session-log.md`
- **Backlog items**: Referenced via TASK-XXX, FEATURE-XXX in session logs
- **Strategic loading**: Context loader follows references automatically

---

*This file exists to prevent `ginko start` from loading stale sprint context. When a sprint is active, update this file to point to it.*
