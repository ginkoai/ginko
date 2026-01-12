---
epic_id: EPIC-002
status: in_progress
created: 2025-11-21
updated: 2026-01-11
started: 2025-11-24
owner: Chris Norton
roadmap_lane: done
roadmap_status: completed
tags: [sprint-graphs, cognitive-scaffolding, core-differentiator]
---

# EPIC-002: AI-Native Sprint Graphs

**Status:** In Progress
**Created:** 2025-11-21
**Started:** 2025-11-24
**Owner:** Chris Norton
**Estimated Duration:** 8-12 weeks (4 sprints)
**Priority:** Critical - Core Differentiator

**Current Sprint:** Sprint 2 - Pattern & Constraint Library (SPRINT-2025-11-epic002-sprint2)
**Sprint Goal:** Reduce rework through constraint awareness and pattern reuse

---

## Vision Statement

**"Legacy project tools are human-centric status tracking systems. Ginko is AI-centric cognitive scaffolding."**

Jira, Linear, and GitHub Projects were designed for human project managers to track team velocity and report status. AI agents must infer action from task lists, search for architectural context, and rediscover patterns repeatedly.

Ginko sprint graphs provide **explicit guidance** through semantic relationships: what to work on (NEXT_TASK), what to know (MUST_FOLLOW), what to avoid (GOTCHAS), where to look (MODIFIES), and why it matters (SOLVES).

This is not an incremental improvement - it's a **fundamental rethinking of collaboration management for the AI era**.

---

## The Core Insight

### Human Tools Optimize For:
- Status reporting ("What's the velocity?")
- Resource allocation ("Who's working on what?")
- Timeline forecasting ("When will this ship?")
- Stakeholder communication ("Show me the burndown")

### AI Tools Must Optimize For:
- **Action guidance** ("What should I work on?")
- **Constraint awareness** ("What do I need to know?")
- **Context continuity** ("What just happened?")
- **Attention direction** ("Where do I look?")
- **Problem grounding** ("Why am I doing this?")

**The difference:** Humans read status → infer action. AI needs explicit relationships → direct action.

---

## Quantified Impact

From conversation analysis (2025-11-21):

| Metric | Legacy Tools (Jira/Linear) | Ginko Sprint Graph | Improvement |
|--------|---------------------------|-------------------|-------------|
| Session start time | 10-15 minutes | <2 seconds | **5-7x faster** |
| Tokens to orient | 5,000-10,000 | 500 | **10-20x fewer** |
| Decision accuracy | ~50% correct pattern | ~90% correct | **10x less rework** |
| Duplicate work | Common (no context) | Rare (full history) | **95% reduction** |
| Onboarding time | 15-30 min (human explain) | <3s (self-service) | **300x faster** |
| Context switches | Frequent (must search) | Rare (pre-filtered) | **80% reduction** |
| Blocker discovery | Trial and error | Explicit warnings | **5x faster** |

**Business Impact:**
- AI readiness: 6.5/10 → 8.5/10
- Developer flow state: Preserved (no 15-min context rebuilds)
- Time to productivity: 300x faster for new AI instances
- Rework rate: 95% reduction

---

## Graph Relationships for AI Readiness

### Tier 1: Actionable Context (Highest Value)
```cypher
(Sprint)-[:NEXT_TASK]->(Task)
  // Eliminates "what should I work on?" decision paralysis
  // Explicit priority/hotness signal

(Task)-[:RECENT_ACTIVITY]->(Event)
  // Hot vs. cold tasks (momentum awareness)
  // "TASK-013 has 7 events in last 4h" = active work

(Task)-[:MODIFIES]->(File)
  // Attention direction (where to focus reads)
  // 70% faster file discovery (per ADR-002)
```

### Tier 2: Architectural Constraints
```cypher
(Task)-[:MUST_FOLLOW]->(ADR)
  // "To implement auth, follow ADR-032 reflection pattern"
  // Prevents AI from violating architectural decisions

(Task)-[:APPLIES_PATTERN]->(Pattern)
  // "Use retry pattern from graph-health-monitor.ts"
  // AI reuses proven solutions

(Task)-[:AVOID_GOTCHA]->(Gotcha)
  // "EventQueue timer hangs process - use .unref()"
  // AI learns from past mistakes
```

### Tier 3: Strategic Context
```cypher
(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)
  // Grounds decisions in user problems
  // AI understands "why" not just "what"

(Task)-[:DEPENDS_ON]->(Task)
  // Smart work ordering
  // Prevents wasted effort on blocked tasks

(Sprint)-[:BLOCKED_BY]->(Blocker)
  // Sets expectations
  // Prevents AI from hitting known walls
```

---

## Market Positioning

### Tagline
**"Jira is for reporting to humans. Ginko is for working with AI."**

### Value Proposition
Legacy tools force AI to **infer** action from task lists.
Ginko provides **explicit guidance** through graph relationships.

### Competitive Differentiation

| Tool | AI Experience | Positioning |
|------|---------------|-------------|
| **GitHub Projects** | Task kanban, no AI context | Status tracking |
| **Linear** | Beautiful UI, AI must scrape | Human-optimized |
| **Jira** | Enterprise features, AI-hostile | Manager reports |
| **Ginko** | AI-native relationships | AI partnership |

### Example Pitch
> "With Linear, your AI spends 10 minutes reading tasks and guessing what to do. With Ginko, it gets 'Work on TASK-014, follow ADR-046, see log.ts for example, avoid in-memory gotcha' in 2 seconds. That's the difference between AI assistance and AI partnership."

---

## Success Criteria

### Quantitative
- [ ] Session start time < 3 seconds (vs. 10-15 min with legacy tools)
- [ ] Decision accuracy > 85% (vs. ~50% with flat task lists)
- [ ] Duplicate work < 5% of events (vs. common with legacy tools)
- [ ] AI readiness score 8.5/10+ (vs. 6.5/10 baseline)
- [ ] Token consumption < 1,000 tokens per session start (vs. 5,000-10,000)

### Qualitative
- [ ] AI can answer "What should I work on?" without human input
- [ ] AI knows architectural constraints before starting implementation
- [ ] AI learns from past gotchas automatically
- [ ] New AI instance productive <3 seconds (vs. 15-30 min human onboarding)
- [ ] Zero "sorry, that violates our pattern" rework cycles

### Strategic
- [ ] Ginko positioned as "AI-native project management" in market
- [ ] Case studies demonstrating 5-10x productivity improvements
- [ ] Developer testimonials about flow state preservation
- [ ] Competitive analysis showing legacy tools inadequate for AI collaboration

---

## Implementation Phases

### Phase 1: Core Infrastructure (Sprint 1 - 2 weeks)
**Goal:** Prove the value with minimal viable graph

**Deliverables:**
- Sprint → NEXT_TASK relationship
- Task → MUST_FOLLOW → ADR
- Task → MODIFIES → File
- Task → RECENT_ACTIVITY → Event (count/recency)
- Query API for AI-optimized session start

**Success Metrics:**
- Session start < 3 seconds
- AI gets explicit "next action" guidance
- Tokens < 1,000 per session start

### Phase 2: Pattern & Constraint Library (Sprint 2 - 3 weeks)
**Goal:** Reduce rework through constraint awareness

**Deliverables:**
- Context module taxonomy (Pattern, Gotcha, Decision, Discovery)
- Pattern → APPLIED_IN → File relationships
- Task → APPLIES_PATTERN → Pattern
- Task → AVOID_GOTCHA → Gotcha
- Gotcha detection/prevention system

**Success Metrics:**
- Decision accuracy > 85%
- Rework rate < 10%
- Gotcha rediscovery < 5%

### Phase 3: Strategic Context & Dependencies (Sprint 3 - 3 weeks)
**Goal:** Ground AI decisions in business problems

**Deliverables:**
- Sprint → IMPLEMENTS → Epic → SOLVES → Problem
- Task → DEPENDS_ON → Task (dependency tracking)
- Sprint → BLOCKED_BY → Blocker (explicit warnings)
- Problem → IMPACTS → User (value chain)

**Success Metrics:**
- AI explains "why" for decisions
- Zero wasted effort on blocked tasks
- Scope protection (tasks aligned with problems)

### Phase 4: Validation & Market Launch (Sprint 4 - 2 weeks)
**Goal:** Quantify impact, build case studies, position in market

**Deliverables:**
- Before/after metrics across all workflows
- Case studies (3+ examples of 5-10x improvements)
- Developer testimonials
- Competitive analysis documentation
- Marketing materials (AI-native positioning)
- Demo videos (side-by-side with legacy tools)

**Success Metrics:**
- All quantitative success criteria met
- Market positioning materials complete
- 5+ early adopters using sprint graphs
- Documented evidence of 5-10x improvements

---

## Dependencies

### Technical
- **ADR-043**: Event-based context loading (✅ Complete)
- **TASK-013**: Graph reliability infrastructure (🚧 Phase 1 complete)
- **Graph API**: Event creation/querying operational
- **Context modules**: Taxonomy and lifecycle management

### Strategic
- **EPIC-001**: Strategic context & dynamic adaptivity (foundation)
- **Charter system**: Problem definition and success criteria
- **AI-UX principles**: Flow state, rapport continuity, anxiety-free collaboration

---

## Risks & Mitigations

### Risk: Graph complexity overwhelming
**Mitigation:** Phased rollout, AI-optimized queries (pre-filtered relevance)

### Risk: Maintenance burden (keeping graph current)
**Mitigation:** Automatic sync from events, git ops, and session logs

### Risk: Market doesn't understand "AI-native" positioning
**Mitigation:** Concrete demos showing 5-10x improvements, side-by-side comparisons

### Risk: Over-engineering (YAGNI)
**Mitigation:** Start with Tier 1 relationships only, validate before expanding

---

## Related Documents

- **Conversation:** 2025-11-21 TASK-013 discussion (AI-UX sprint graph analysis)
- **ADR-002:** AI-Optimized File Discovery (70% faster with structured metadata)
- **ADR-033:** Context Pressure Mitigation (defensive logging patterns)
- **ADR-043:** Event-Based Context Loading (token reduction, session speed)
- **ADR-046:** Command Patterns (AI-first UX principles)
- **EPIC-001:** Strategic Context & Dynamic Adaptivity (foundation)
- **PROJECT-CHARTER.md:** Vision (universal human-AI collaboration infrastructure)

---

## Key Insight (Lock This In)

**"AI-UX as a core principle demands a sprint graph that is AI consumable. Legacy tools are simply not well-adapted to the speed at which AI-assisted development occurs. This is a fundamental rethinking of collaboration management for the AI era."**

This is not a feature - it's the core differentiator.

---

*Created during TASK-013 reliability testing session, crystallized through analysis of AI cognitive scaffolding needs vs. human status tracking tools.*
