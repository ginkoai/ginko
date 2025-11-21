# EPIC-001: Strategic Context & Dynamic Adaptivity

## Epic Overview

**Epic Goal**: Transform Ginko from filesystem-based context loading to graph-native cognitive scaffolding that enables AI-centric sprint management (EPIC-002). Build the graph relationships infrastructure that powers explicit AI guidance, constraint awareness, and strategic grounding.

**Business Value**: Enable EPIC-002's AI-native sprint graphs through graph-first architecture. Eliminate 14-18 hours of rework by building relationships (not text displays) from the start. Foundation for 5-10x AI productivity improvements.

**Duration**: 4 sprints (~4 weeks)

**Type**: Architecture + Infrastructure (Graph-native foundation)

**Status**: Planning → Realigned (2025-11-21)

**Strategic Pivot**: Realigned to support EPIC-002 (AI-Native Sprint Graphs). Focus shifted from text displays to graph relationships for AI cognitive scaffolding.

---

## The Problem

### Current State: Filesystem-Based Context Loading

**What Works:**
- ✅ Tactical context excellent (flow state, resume points, uncommitted files)
- ✅ Event-based loading fast (<2s startup)
- ✅ Charter creation works (AI-mediated)
- ✅ Events stored in graph (via TASK-013 reliability work)

**What's Missing (Architecture Level):**
- ❌ **No graph relationships** - Context stored as files, not semantic connections
- ❌ **No task-centric guidance** - AI infers action from text, not explicit relationships
- ❌ **No constraint awareness** - Patterns/gotchas are markdown files, not graph nodes
- ❌ **No strategic grounding** - Charter is filesystem, not graph (Epic→Problem→User chain)
- ❌ **No dependency tracking** - Task relationships implicit, not explicit

**Impact on EPIC-002:**
Without graph-native context, we cannot implement:
- `(Sprint)-[:NEXT_TASK]->(Task)` - Explicit priority guidance
- `(Task)-[:APPLIES_PATTERN]->(Pattern)` - Constraint awareness
- `(Task)-[:MODIFIES]->(File)` - Attention direction (ADR-002)
- `(Task)-[:MUST_FOLLOW]->(ADR)` - Architectural compliance
- `(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)` - Strategic grounding

**AI Partner Experience:**
- Must read text files and infer relationships
- No explicit "what to work on" guidance
- Patterns/gotchas require tag matching and text parsing
- Strategic context disconnected from tactical work
- 10-15 minute orientation time (vs. <3s with graph)

### Target State: Graph-Native Cognitive Scaffolding

**Graph Relationships Established:**
- ✅ `(Sprint)-[:CONTAINS]->(Task)` - Sprint structure in graph
- ✅ `(Sprint)-[:NEXT_TASK]->(Task)` - Explicit priority/hotness
- ✅ `(Task)-[:MODIFIES]->(File)` - Attention direction
- ✅ `(Task)-[:RECENT_ACTIVITY]->(Event)` - Momentum awareness
- ✅ `(Task)-[:APPLIES_PATTERN]->(Pattern)` - Constraint guidance
- ✅ `(Task)-[:AVOID_GOTCHA]->(Gotcha)` - Error prevention
- ✅ `(Task)-[:MUST_FOLLOW]->(ADR)` - Architectural compliance
- ✅ `(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)` - Strategic grounding

**Infrastructure Ready:**
- ✅ Graph query API operational (<200ms)
- ✅ Context modules converted to graph nodes
- ✅ Charter problems synced to graph
- ✅ Task relationships auto-detected from sprint files
- ✅ Mode-aware graph traversal depth

**AI Partner Experience:**
- Graph query returns explicit guidance: "Work on TASK-014, follow ADR-046, see log.ts, avoid in-memory gotcha"
- <3 second session start (vs. 10-15 min with text inference)
- Zero "sorry, that violates our pattern" rework cycles
- Strategic context integrated with tactical work
- Foundation ready for EPIC-002's full cognitive scaffolding

---

## Success Criteria

### Quantitative Metrics (Infrastructure Foundation)

1. **Graph Relationships Established**: 100% of core relationships implemented
   - `(Sprint)-[:CONTAINS/NEXT_TASK]->(Task)` ✅
   - `(Task)-[:MODIFIES]->(File)` ✅
   - `(Task)-[:RECENT_ACTIVITY]->(Event)` ✅
   - `(Task)-[:APPLIES_PATTERN/AVOID_GOTCHA/MUST_FOLLOW]->(Context)` ✅
   - `(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)` ✅

2. **Graph Query Performance**: <200ms for AI session start query
   - Measurement: p95 latency for `/api/v1/context/ai-session-start`
   - Target: Return full graph structure in single query

3. **Session Startup Time**: <2.5s total (foundation for EPIC-002's <3s)
   - Measurement: p95 startup time with graph query
   - No performance regression from current <2s baseline

4. **Context Module Migration**: 100% of patterns/gotchas/ADRs in graph
   - Parse `.ginko/context/modules/*.md` → graph nodes
   - Tags, impact, related files extracted as properties

5. **Sprint File Sync**: Automatic graph sync from sprint markdown
   - Task detection from markdown
   - Relationship extraction from "Files:", "Related:", etc.
   - Auto-update on sprint file changes

6. **Zero Rework for EPIC-002**: Direct foundation, no architectural changes needed
   - Measurement: EPIC-002 implementation starts with existing graph
   - No need to rebuild relationships

### Qualitative Success (Architecture Quality)

1. **Graph-First Architecture**: All new context stored as graph relationships first, text display second
2. **Task-Centric Design**: AI gets explicit guidance (not text inference)
3. **Semantic Relationships**: Rich metadata enables AI traversal
4. **Mode-Aware Depth**: Graph traversal respects work mode (Hack & Ship: shallow, Full Planning: deep)
5. **EPIC-002 Ready**: Infrastructure supports all Tier 1-3 relationships without modification

### EPIC-002 Enablement Success

**Tier 1 (Actionable Context)** - Ready:
- ✅ NEXT_TASK relationship (explicit priority)
- ✅ RECENT_ACTIVITY → Event (hot/cold detection)
- ✅ MODIFIES → File (attention direction)

**Tier 2 (Architectural Constraints)** - Ready:
- ✅ MUST_FOLLOW → ADR (compliance)
- ✅ APPLIES_PATTERN → Pattern (guidance)
- ✅ AVOID_GOTCHA → Gotcha (prevention)

**Tier 3 (Strategic Context)** - Ready:
- ✅ IMPLEMENTS → Epic → SOLVES → Problem (grounding)
- ✅ DEPENDS_ON → Task (ordering)
- ✅ BLOCKED_BY → Blocker (warnings)

---

## Strategic Context

### The Insight: AI-UX Principles

**Ginko is primarily a tool for AI partners to understand work.** While humans use it, AI development partners (Claude, GPT-4) are the primary users executing commands.

**Key Principles:**
1. **Information architecture optimized for AI cognition**
   - Structured & dense (use tokens efficiently)
   - Metadata-rich (timestamps, tags, relationships)
   - Scannable markers (emoji/bold for quick parsing)
   - Pointer architecture (summaries + drill-down commands)

2. **Dynamic adaptivity over static configuration**
   - Sense project maturity (solo → team, simple → complex)
   - Recommend appropriate rigor level
   - Nudge for documentation at right moments
   - Learn from user preferences over time

3. **Separate human UX from AI UX**
   - Console output: Concise, human-readable
   - Context data: Rich, structured, metadata-heavy
   - Optimize each for its consumer

4. **Progressive disclosure for missing context**
   - Gentle nudging, not blocking
   - Show value proposition
   - Respect dismissals
   - Track and learn patterns

### Philosophy: Human-AI Partnership

**Comparative Advantages:**
- **AI**: Pattern recognition, knowledge recall, consistency, speed
- **Human**: Judgment, creativity, prioritization, context

**Optimal collaboration:**
- AI handles tactical execution with strategic awareness
- Human provides vision, priorities, and course corrections
- System adapts to project maturity and team dynamics

---

## Epic Structure

This epic is delivered through 4 sprints (Realigned 2025-11-21):

### Sprint 1: Graph Infrastructure & Core Relationships (2 weeks)
**Duration**: 2 weeks
**Focus**: Build graph-native context system, establish Tier 1 relationships
**Deliverables**:
- Sprint → Task graph structure (CONTAINS, NEXT_TASK)
- Task → File relationships (MODIFIES - attention direction)
- Task → Event relationships (RECENT_ACTIVITY - momentum)
- Charter → Graph sync (Epic → Problem nodes)
- Graph query API: `/api/v1/sprint/active`

**Success Metrics**:
- Graph relationships operational
- Query API <200ms
- Session start <2.5s
- Charter synced to graph

### Sprint 2: Pattern & Constraint Graph (2 weeks)
**Duration**: 2 weeks
**Focus**: Convert context modules to graph relationships (Tier 2)
**Deliverables**:
- Context modules → Graph nodes (Pattern, Gotcha, ADR, Discovery)
- Task → Pattern relationships (APPLIES_PATTERN)
- Task → Gotcha relationships (AVOID_GOTCHA)
- Task → ADR relationships (MUST_FOLLOW)
- Pattern application tracking (APPLIED_IN → File)

**Success Metrics**:
- 100% context modules migrated
- Constraint relationships established
- AI gets explicit pattern guidance

### Sprint 3: Strategic Dependencies & Blockers (1.5 weeks)
**Duration**: 1.5 weeks
**Focus**: Complete strategic grounding (Tier 3)
**Deliverables**:
- Task dependency tracking (DEPENDS_ON)
- Sprint blocker relationships (BLOCKED_BY)
- Problem impact chain (IMPACTS → User)
- Strategic context complete

**Success Metrics**:
- Dependency graph operational
- Blocker warnings explicit
- Strategic grounding complete

### Sprint 4: Graph Query API & Integration (1 week)
**Duration**: 1 week
**Focus**: Unified graph query for AI session start
**Deliverables**:
- Consolidated API: `/api/v1/context/ai-session-start`
- CLI integration in `start-reflection.ts`
- Mode-aware graph traversal
- Performance optimization
- Validation testing

**Success Metrics**:
- <3s session start with full graph
- AI gets explicit guidance
- Zero rework for EPIC-002
- Foundation validated

---

## Dependencies & Prerequisites

### Technical Dependencies
- ✅ Graph API infrastructure exists (`/api/v1/context/initial-load`)
- ✅ Event schema supports team filtering (shared=true)
- ✅ Charter creation works (`ginko charter`)
- ✅ Mode-aware context loading exists
- ⚠️ Need consolidated API endpoint for parallel queries
- ⚠️ Need charter sync to graph (currently filesystem only)

### Knowledge Dependencies
- ✅ AI-UX principles documented (this epic)
- ✅ Work mode patterns established (ADR-046)
- ✅ Context pressure mitigation (ADR-033)
- ✅ Event-based loading architecture (ADR-043)

### Team Dependencies
- Charter creation command exists and works
- Signal detection patterns established (charter conversation)
- Quality scoring infrastructure in place
- Session synthesis working

---

## Risks & Mitigations

### High-Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Performance regression | High | Medium | Parallel queries, caching, lazy loading, optional `--skip-strategic` flag |
| Nudging becomes nagging | High | Medium | Significance scoring, dismiss tracking, mode-aware frequency, learn from patterns |
| Maturity detection inaccurate | Medium | Medium | Multi-signal scoring, user can override, learn from corrections |
| Charter drift false positives | Medium | Low | High threshold, only warn on significant drift, show rationale |

### Medium-Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Mode recommendations ignored | Medium | Medium | Non-blocking, show value proposition, track acceptance rate |
| Strategic context too verbose | Medium | Low | Mode-aware display, compact format, hide when irrelevant |
| Token budget exceeded | Medium | Low | Compact format (~800 tokens max), structured for efficiency |
| Missing data (no charter/patterns) | Low | High | Graceful fallbacks, gentle nudging, progressive disclosure |

---

## Testing Strategy

### Unit Testing Requirements

**Coverage Target**: >80% for all new code

**Test Categories:**
1. **Context Loading**
   - Charter parsing (valid/invalid/missing)
   - Team event queries (solo/team, recent/old)
   - Pattern matching (tag overlap, relevance scoring)

2. **Maturity Detection**
   - Git analysis (commit count, contributors, age)
   - Complexity metrics (files, LOC, dependencies)
   - Mode recommendations (solo → Hack & Ship, team → Think & Build)

3. **Significance Detection**
   - Keyword matching (architectural terms)
   - Impact analysis (high impact events)
   - Nudge throttling (dismiss tracking)

4. **Charter Drift**
   - Goal alignment (work vs charter goals)
   - Scope boundaries (in-scope vs out-of-scope)
   - Drift thresholds (minor vs significant)

### Human UAT Requirements

**Test Scenarios** (per sprint):
1. **New solo project** (Hack & Ship mode)
   - No charter → gentle nudge after 3 sessions
   - Simple project → appropriate minimal context

2. **Growing team project** (Think & Build mode)
   - Charter exists → displayed in start
   - 3 contributors → team activity visible
   - Moderate complexity → balanced context

3. **Complex established project** (Full Planning mode)
   - Charter + ADRs/PRDs → rich context with breadcrumbs
   - 5+ contributors → full team feed
   - High complexity → comprehensive context

4. **Project without charter** (any mode)
   - Friendly nudging (not blocking)
   - Value proposition clear
   - Dismissal respected

5. **Project with stale charter** (any mode)
   - Freshness warning shown
   - Drift detection alerts
   - Update suggestion provided

**Success Criteria** (per scenario):
- AI partner asks 1-3 clarifying questions (not 5-7)
- Appropriate mode recommended (70%+ accuracy)
- Strategic context relevant and complete
- No performance degradation (< 2.5s startup)
- Nudging helpful (not annoying)

---

## Post-MVP Enhancements

**Not included in MVP, consider for future:**

1. **Semantic Context Queries**
   - "Show me auth-related decisions"
   - "What patterns exist for API design?"
   - "Find gotchas for React hooks"

2. **Cross-Project Learning**
   - Patterns discovered in other projects
   - Common gotchas across repositories
   - Team best practices library

3. **Predictive Context Loading**
   - "You're editing auth.ts, relevant: Pattern-JWT, Gotcha-CORS"
   - "Last 3 sessions had auth work, loading auth context"

4. **Visual Graph Traversal**
   - Interactive exploration of WHY→WHAT→HOW chains
   - Graph visualization in dashboard

5. **Team Dashboard**
   - Real-time view of who's working on what
   - Document collision detection
   - Work distribution visualization

6. **AI Learning System**
   - Learn nudge acceptance patterns
   - Adapt significance thresholds per user/team
   - Personalized context recommendations

---

## Success Metrics Tracking

### Sprint-by-Sprint Goals

**Sprint 1: Strategic Context Surfacing**
- Target: Charter + team + patterns visible
- Metric: 80% context coverage
- Test: 3 UAT scenarios

**Sprint 2: Dynamic Adaptivity**
- Target: Maturity detection + mode recommendations
- Metric: 70% recommendation accuracy
- Test: 5 project types

**Sprint 3: Intelligent Knowledge Capture**
- Target: Significance detection + nudging
- Metric: 60% nudge acceptance
- Test: 10 significant events

**Sprint 4: Polish & Validation**
- Target: Performance + UX + comprehensive testing
- Metric: <2.5s startup, 7-8/10 readiness
- Test: Full end-to-end scenarios

### Final MVP Validation

**Validation Scenarios:**
1. Fresh start on new project → 7/10 readiness
2. Resume work on team project → 8/10 readiness
3. Complex project with full context → 9/10 readiness
4. Project without charter → 6.5/10 readiness (nudged to create)
5. Stale charter detected → drift warning + update suggestion

**Acceptance Criteria:**
- Average readiness: 7-8/10
- Average questions: 1-3 (down from 5-7)
- Startup time: <2.5s (p95)
- Mode accuracy: 70%+
- Nudge acceptance: 60%+

---

## Related Documents

### Architecture Decision Records
- **[ADR-002](../adr/ADR-002-ai-readable-code-frontmatter.md)** - AI-Optimized File Discovery
- **[ADR-033](../adr/ADR-033-context-pressure-mitigation-strategy.md)** - Context Pressure Mitigation
- **[ADR-039](../adr/ADR-039-knowledge-discovery-graph.md)** - Knowledge Discovery Graph
- **[ADR-042](../adr/ADR-042-ai-assisted-graph-quality.md)** - AI-Assisted Graph Quality
- **[ADR-043](../adr/ADR-043-event-based-context-loading.md)** - Event-Based Context Loading
- **[ADR-046](../adr/ADR-046-command-patterns-reflection-vs-utility.md)** - Command Patterns
- **ADR-047** (to be created): Strategic Context Surfacing
- **ADR-048** (to be created): Dynamic Adaptivity & Mode Sensing

### Sprint Plans
- **[SPRINT-2025-12: Strategic Context Surfacing](../sprints/SPRINT-2025-12-strategic-context-surfacing.md)**
- **[SPRINT-2026-01-A: Dynamic Adaptivity](../sprints/SPRINT-2026-01-dynamic-adaptivity.md)**
- **[SPRINT-2026-01-B: Intelligent Knowledge Capture](../sprints/SPRINT-2026-01-intelligent-knowledge-capture.md)**
- **[SPRINT-2026-02: Polish & Validation](../sprints/SPRINT-2026-02-polish-and-validation.md)**

### Planning Documents
- **[Planning Session Transcript](../planning/2025-11-19-strategic-context-planning.md)** (this conversation)
- **[Gap Analysis](../planning/2025-11-19-gap-analysis.md)** (current vs target state)
- **[AI-UX Principles](../planning/AI-UX-PRINCIPLES.md)** (design philosophy)

---

## Changelog

**2025-11-21**: Strategic realignment to support EPIC-002 (AI-Native Sprint Graphs)
- **CRITICAL PIVOT**: Shifted from text display to graph-first architecture
- Updated epic goal: Filesystem → Graph-native cognitive scaffolding
- Revised all 4 sprints to focus on graph relationships (not text surfacing)
- Sprint 1: Graph infrastructure & Tier 1 relationships (Sprint→Task, Task→File, Task→Event)
- Sprint 2: Pattern & constraint graph (Tier 2 - APPLIES_PATTERN, AVOID_GOTCHA, MUST_FOLLOW)
- Sprint 3: Strategic dependencies (Tier 3 - DEPENDS_ON, BLOCKED_BY, SOLVES→Problem)
- Sprint 4: Graph query API & CLI integration
- Updated success criteria: Infrastructure foundation (not user-facing features)
- **Rework avoided**: 14-18 hours saved by aligning with EPIC-002 before implementation
- Foundation ready: Zero architectural changes needed for EPIC-002

**2025-11-19**: Epic created from comprehensive planning session
- Gap analysis completed (current 6.5/10 → target 7-8/10)
- AI-UX principles established
- 4 sprints planned with detailed tasks
- Testing strategy defined (unit + UAT)
- Success criteria quantified

---

**Epic Status**: Planning → Realigned (2025-11-21)
**Start Date**: TBD
**Target Completion**: TBD (4 weeks from start)
**Owner**: Chris Norton
**AI Partner**: Claude (Sonnet 4.5)
