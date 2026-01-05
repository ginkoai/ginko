---
type: decision
status: accepted
updated: 2026-01-05
tags: [velocity, estimation, human-ai, collaboration, planning, retrospective]
related: [ADR-052-unified-entity-naming-convention.md, EPIC-008-team-collaboration.md]
priority: high
audience: [developer, ai-agent, stakeholder, user]
estimated-read: 8-min
dependencies: []
---

# ADR-057: Human+AI Velocity Estimation

**Status:** Accepted
**Date:** 2026-01-05
**Authors:** Chris Norton, Claude
**Reviewers:** —

## Context

### Problem Statement

Traditional software estimation uses story points calibrated to a scrum team's historical velocity. When a Human+AI collaboration delivers work 10-20x faster than traditional estimates, these metrics become meaningless for planning. We need a new framework for estimating and tracking velocity in Human+AI development.

### Business Context

EPIC-008 (Team Collaboration) was estimated at 6-7 weeks using traditional scrum metrics:
- 4 sprints × ~1.5-2 weeks each
- Assumed 2-3 developers with mixed specialties
- Accounted for meetings, code review cycles, QA phases

**Actual delivery: ~3 days** — an acceleration factor of ~15x.

This isn't an anomaly. Human+AI collaboration fundamentally changes the delivery equation by eliminating overhead that traditional estimates bake in as constants.

### Technical Context

Traditional velocity calculations assume:
- **Communication overhead**: 30-50% of developer time in meetings, standups, syncs
- **Context switching**: 20-30 minutes lost per interruption
- **Knowledge ramp-up**: 1-2 days per new subsystem
- **Code review cycles**: PR → review → comments → revise → merge
- **Decision latency**: Schedule meeting → discuss → decide → implement
- **Coordination cost**: N developers × (N-1) communication channels

Human+AI collaboration eliminates most of these:
- **Communication**: Real-time in conversation (~0% overhead)
- **Context switching**: Full context preserved in session
- **Knowledge ramp-up**: Minutes (read files, instant comprehension)
- **Code review**: Inline as code is written
- **Decision latency**: Real-time in conversation
- **Coordination**: Single-threaded focus, no coordination channels

### Key Requirements

1. **Dual tracking**: Maintain both traditional and H+AI velocity metrics
2. **Conversion factor**: Derive a reliable multiplier between estimation modes
3. **Complexity-based**: Estimate in complexity/uncertainty, derive time
4. **Calibration data**: Track actual vs estimated across epics
5. **Mode-aware**: Account for different work modes (Hack & Ship vs Think & Build)

## Decision

### Chosen Solution

**Adopt a dual-track estimation model that maintains traditional estimates for external communication while using complexity-based estimates for actual H+AI planning.**

### The Framework

#### 1. Estimate Complexity, Not Time

Replace time-based sprint estimates with complexity ratings:

| Complexity | Traditional Equivalent | H+AI Equivalent | Characteristics |
|------------|----------------------|-----------------|-----------------|
| **Trivial** | < 1 day | < 1 hour | Single file, obvious change |
| **Low** | 1-3 days | 1-4 hours | Few files, clear pattern |
| **Medium** | 1-2 weeks | 4-8 hours | Multiple subsystems, some unknowns |
| **High** | 2-4 weeks | 1-2 days | Architectural decisions, integration |
| **Very High** | 1-2 months | 3-5 days | Greenfield, major unknowns |

#### 2. Track Acceleration Factors

For each completed epic, record:

```typescript
interface EpicVelocityRecord {
  epicId: string;
  traditionalEstimate: {
    weeks: number;
    basis: 'scrum-team' | 'solo-developer' | 'agency';
  };
  actualDelivery: {
    days: number;
    hours: number;  // Active collaboration time
  };
  accelerationFactor: number;  // traditional / actual
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  greenfield: boolean;  // vs building on existing patterns
  externalDependencies: number;  // APIs, approvals, third parties
  workMode: 'hack-and-ship' | 'think-and-build' | 'full-planning';
}
```

#### 3. EPIC-008 Baseline

| Metric | Value |
|--------|-------|
| Epic | EPIC-008: Team Collaboration |
| Traditional Estimate | 6-7 weeks |
| Actual Delivery | ~3 days |
| Acceleration Factor | ~15x |
| Complexity | High |
| Greenfield | No (built on existing Stripe, Supabase, Neo4j) |
| External Dependencies | 1 (Stripe) |
| Work Mode | Think & Build |

#### 4. Adjustment Factors

Not all work accelerates equally. Apply modifiers:

| Factor | Multiplier | Rationale |
|--------|-----------|-----------|
| Greenfield (no existing patterns) | 0.5x | More exploration, less reuse |
| External dependencies (waiting) | 0.3-0.5x | Can't accelerate third parties |
| Legacy integration | 0.6x | Archaeology and compatibility |
| Well-documented codebase | 1.2x | Faster context loading |
| Existing test coverage | 1.3x | Confidence to move fast |
| Domain familiarity | 1.1-1.5x | Less research needed |

**Adjusted formula:**
```
H+AI Time = (Traditional Estimate / Base Acceleration) × Product(Adjustment Factors)
```

### Implementation Approach

#### Phase 1: Data Collection (Now)

Add velocity metadata to epic files:

```markdown
---
epic_id: EPIC-XXX
traditional_estimate: 6 weeks
actual_delivery: 3 days
acceleration_factor: 14
complexity: high
work_mode: think-and-build
---
```

#### Phase 2: Pattern Recognition (After 5+ Epics)

Analyze completed epics to derive:
- Average acceleration by complexity tier
- Impact of adjustment factors
- Variance by work mode

#### Phase 3: Predictive Estimation (After 10+ Epics)

Build estimation model:
```
Estimated H+AI Time = f(complexity, greenfield, dependencies, domain_familiarity)
```

## Why Traditional Estimates Still Matter

### External Communication

Stakeholders, customers, and executives understand traditional timelines. When asked "how long will this take?", providing both metrics is valuable:

> "A traditional team would estimate 6-8 weeks for this feature. With our Human+AI workflow, we expect 3-5 days of active development, assuming no external blockers."

### Calibration Anchor

Traditional estimates provide a stable reference point. The acceleration factor shows ROI of the H+AI approach:

> "We delivered $X of traditional development value in Y days — a 15x acceleration."

### Contingency Planning

If the H+AI workflow is unavailable (AI outage, human vacation), traditional estimates indicate fallback timelines.

## Comparison: Scrum Team vs Human+AI

### Time Allocation Breakdown

**Traditional Scrum Team (per week):**
| Activity | Hours | % |
|----------|-------|---|
| Coding | 16-20 | 40-50% |
| Meetings (standups, planning, retros) | 8-12 | 20-30% |
| Code review | 4-6 | 10-15% |
| Context switching/interrupts | 4-6 | 10-15% |
| Documentation/admin | 2-4 | 5-10% |

**Human+AI Collaboration (per day):**
| Activity | Hours | % |
|----------|-------|---|
| Active development | 6-8 | 75-100% |
| Planning/clarification | 0.5-1 | 6-12% |
| Testing/validation | 0.5-1 | 6-12% |
| Documentation | 0-0.5 | 0-6% |

### Why Scrum Overhead Exists

Traditional teams need ceremonies because:
1. **Distributed knowledge**: No single person holds full context
2. **Coordination**: Multiple people working on interleaved tasks
3. **Alignment**: Ensuring everyone moves in same direction
4. **Knowledge transfer**: Onboarding, cross-training, bus factor
5. **Quality gates**: Code review as async quality control

Human+AI eliminates these because:
1. **Unified context**: AI has instant access to entire codebase
2. **Single-threaded**: One conversation, one focus
3. **Real-time alignment**: Continuous dialogue, no drift
4. **Instant onboarding**: Session context loads in seconds
5. **Inline quality**: Review happens as code is written

## Consequences

### Positive Impacts

1. **Accurate planning**: Estimates reflect actual H+AI capability
2. **Credibility**: Track record of delivering on estimates
3. **ROI visibility**: Clear metrics on H+AI acceleration
4. **Learning loop**: Data-driven improvement of estimation

### Negative Impacts

1. **Dual bookkeeping**: Maintaining two estimation tracks
2. **Expectation management**: Risk of stakeholders expecting 15x on everything
3. **Edge cases**: Some work doesn't accelerate (waiting on third parties)

### Neutral Impacts

1. **Estimation process changes**: Different mental model for planning
2. **Reporting changes**: New metrics in status updates

## Monitoring and Success Metrics

### Key Performance Indicators

1. **Estimate accuracy**: Actual / Estimated within 2x
2. **Acceleration factor stability**: Consistent within complexity tiers
3. **Adjustment factor predictiveness**: Modifiers improve accuracy

### Success Criteria

- After 10 epics, estimate accuracy within 50% for H+AI timeline
- Acceleration factors cluster predictably by complexity
- Stakeholders trust H+AI estimates for planning

### Failure Criteria

- Estimates consistently off by >3x
- No pattern emerges across epics
- Team reverts to traditional-only estimation

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Over-promising based on best-case acceleration | High | Medium | Always quote ranges, track actuals |
| External dependencies ignored | Medium | Medium | Call out blockers explicitly in estimates |
| AI capability changes (model updates) | Low | Low | Re-calibrate acceleration factors quarterly |
| Stakeholder confusion (two timelines) | Medium | Medium | Clear communication template |

## The Broader Implication

This isn't just about better estimation — it's recognition that Human+AI collaboration is a fundamentally different mode of software development.

Traditional project management assumes:
- Work scales linearly with people (up to a point)
- Communication overhead is a constant
- Context is distributed across team members
- Quality requires process gates

Human+AI collaboration assumes:
- Work scales with AI context window and capability
- Communication overhead approaches zero
- Context is centralized and instantly accessible
- Quality is inline, not gated

**We're not doing scrum faster. We're doing something different that happens to produce the same artifacts (code, tests, documentation) at a different rate.**

## References

### Internal Documentation
- [EPIC-008: Team Collaboration](../epics/EPIC-008-team-collaboration.md) — Source of baseline metrics
- [ADR-033: Context Pressure Mitigation](ADR-033-context-pressure-mitigation-strategy.md) — Session management approach
- [ADR-043: Event-Based Context Loading](ADR-043-event-stream-session-model.md) — Instant context loading

### External References
- [The Mythical Man-Month](https://en.wikipedia.org/wiki/The_Mythical_Man-Month) — Why adding people doesn't linearly scale
- [Accelerate (Forsgren et al.)](https://itrevolution.com/product/accelerate/) — DevOps metrics that matter

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-05 | Chris Norton, Claude | Initial version based on EPIC-008 retrospective |
