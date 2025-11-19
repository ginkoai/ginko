# EPIC-001: Strategic Context & Dynamic Adaptivity

## Epic Overview

**Epic Goal**: Transform Ginko from a fast tactical context loader into an intelligent strategic context navigator that achieves 7-8/10 AI partner readiness through dynamic adaptivity, intelligent nudging, and comprehensive strategic context surfacing.

**Business Value**: Enable AI partners to work autonomously with minimal clarifying questions (1-3 vs 5-7), make aligned decisions without constant guidance, and maintain project direction through charter-aware development.

**Duration**: 4 sprints (~4 weeks)

**Type**: Architecture + Features (AI-UX optimization)

**Status**: Planning

---

## The Problem

### Current State (6.5/10 AI Readiness)

**What Works:**
- ✅ Tactical context excellent (flow state, resume points, uncommitted files)
- ✅ Event-based loading fast (<2s startup)
- ✅ Mode-aware context loading strategies exist
- ✅ Charter creation works (AI-mediated)

**What's Missing:**
- ❌ Strategic context not surfaced (charter, team, patterns)
- ❌ Mode sensing is manual, not dynamic
- ❌ No project maturity detection
- ❌ No knowledge capture nudging (ADR/PRD suggestions)
- ❌ No charter drift detection
- ❌ Conflicting work mode implementations

**AI Partner Experience:**
- Must ask 5-7 clarifying questions at session start
- Missing BIG WHY and success criteria
- No team coordination signals
- Reinvents patterns, repeats gotchas
- Can't sense when to suggest documentation

### Target State (7-8/10 AI Readiness - MVP)

**Strategic Context Surfaced:**
- ✅ Charter visible (purpose, goals, success criteria, constraints)
- ✅ Team activity feed (decisions, achievements, blockers)
- ✅ Relevant patterns/gotchas (tag-matched to current work)
- ✅ Decision breadcrumbs (WHY rationale visible)

**Dynamic Adaptivity:**
- ✅ Project maturity detection (solo/simple → team/complex)
- ✅ Mode sensing and recommendations
- ✅ Intelligent nudging for significant decisions
- ✅ Charter drift warnings
- ✅ Mode-aware strategic context display

**AI Partner Experience:**
- Asks 1-3 clarifying questions (priority/approach, not what/why)
- Understands project mission and constraints
- Coordinates with team, avoids conflicts
- Applies accumulated wisdom proactively
- Suggests documentation at right moments

---

## Success Criteria

### Quantitative Metrics

1. **AI Readiness Score**: 7-8/10 (up from 6.5/10)
   - Measurement: Self-reported readiness in standardized test scenarios

2. **Question Reduction**: 1-3 clarifying questions at session start (down from 5-7)
   - Measurement: Count questions in first 5 minutes of test sessions

3. **Context Coverage**: 80% of strategic context surfaced
   - Charter: 100% (when exists)
   - Team activity: 100% (when team > 1)
   - Patterns/gotchas: 60%+ (when relevant)

4. **Maturity Detection Accuracy**: 70%+ correct mode recommendations
   - Measurement: Human validation of AI-detected project maturity

5. **Performance**: Startup time <2.5s (currently <2s)
   - Measurement: p95 startup time with all strategic context

6. **Knowledge Capture**: 60%+ of significant decisions result in ADR/PRD
   - Measurement: Nudge acceptance rate for high-significance events

### Qualitative Success

1. **AI Partner Autonomy**: Makes smart tradeoffs without asking
2. **Team Coordination**: Sees teammate activity, avoids conflicts
3. **Pattern Application**: Proactively applies relevant patterns
4. **Documentation Quality**: Creates ADRs/PRDs for major decisions
5. **Charter Alignment**: Work stays within charter scope boundaries

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

This epic is delivered through 4 sprints:

### [Sprint 1: Strategic Context Surfacing](/docs/sprints/SPRINT-2025-12-strategic-context-surfacing.md)
**Duration**: 1 week
**Focus**: Surface charter, team activity, patterns/gotchas
**Deliverables**: Charter integration, team feed, relevant practices display

### [Sprint 2: Dynamic Adaptivity](/docs/sprints/SPRINT-2026-01-dynamic-adaptivity.md)
**Duration**: 1 week
**Focus**: Project maturity detection, mode consolidation, recommendations
**Deliverables**: Maturity analyzer, consolidated modes, recommendation UI

### [Sprint 3: Intelligent Knowledge Capture](/docs/sprints/SPRINT-2026-01-intelligent-knowledge-capture.md)
**Duration**: 1 week
**Focus**: Significance detection, ADR/PRD nudging, charter drift
**Deliverables**: Significance detector, documentation nudging, drift warnings

### [Sprint 4: Polish & Validation](/docs/sprints/SPRINT-2026-02-polish-and-validation.md)
**Duration**: 1 week
**Focus**: Performance, UX balance, comprehensive testing
**Deliverables**: Optimized performance, dual output system, validated MVP

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

**2025-11-19**: Epic created from comprehensive planning session
- Gap analysis completed (current 6.5/10 → target 7-8/10)
- AI-UX principles established
- 4 sprints planned with detailed tasks
- Testing strategy defined (unit + UAT)
- Success criteria quantified

---

**Epic Status**: Planning
**Start Date**: TBD
**Target Completion**: TBD (4 weeks from start)
**Owner**: Chris Norton
**AI Partner**: Claude (Sonnet 4.5)
