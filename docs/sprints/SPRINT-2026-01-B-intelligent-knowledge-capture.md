# SPRINT-2026-01-B: Intelligent Knowledge Capture

## Sprint Overview

**Sprint Goal**: Implement significance detection and intelligent nudging to suggest ADR/PRD creation for major decisions, plus charter drift detection.

**Epic**: [EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)

**Duration**: 1 week (TBD to TBD)

**Type**: Feature sprint (Knowledge capture automation)

**Philosophy**: AI should recognize significant moments and suggest documentation. Charter drift warnings keep projects aligned to vision.

**Success Criteria:**
- Significance detection working (high-impact events identified)
- ADR/PRD nudging implemented (contextual suggestions)
- 60%+ nudge acceptance rate
- Charter drift detection working (alignment warnings)
- Foundation for team accountability and traceability

**Progress:** 0% (0/3 tasks complete)

---

## Strategic Context

### The Problem

**Current State:**
- Events logged but no intelligence about significance
- No prompts to create ADRs/PRDs for major decisions
- Charter exists but no drift detection
- Missing traceability for team accountability

**Impact:**
- Architectural decisions undocumented
- Charter drift goes unnoticed
- Deprecations lack rationale
- Team loses institutional knowledge

### The Solution

**Intelligent Significance Detection:**
- Analyze logged events for high-impact signals
- Score significance (architectural keywords, impact level, file count)
- Track nudge history (accepted/dismissed per user)
- Suggest documentation at right moments

**Charter Drift Detection:**
- Compare recent work to charter goals
- Detect scope expansion (work outside charter)
- Detect goal abandonment (no progress on charter goals)
- Suggest charter updates when appropriate

---

## Sprint Tasks

### TASK-7: Significance Detection
**Status:** Not Started
**Effort:** 8-10 hours
**Priority:** CRITICAL

**Goal:** Identify decisions/changes worthy of documentation

**Acceptance Criteria:**
- [ ] `SignificanceDetector` service created
- [ ] Analyze logged events for signals:
  - category=decision + impact=high
  - Architectural keywords (database, framework, API, auth, architecture)
  - Multiple files affected (>3)
  - Breaking changes detected
- [ ] Score significance (0-100) with confidence
- [ ] Check if already documented (ADR/PRD exists with matching tags)
- [ ] Track nudge history (accepted/dismissed per user, per topic)
- [ ] Learn from patterns (reduce frequency if consistently dismissed)

**Significance Scoring:**
```typescript
const signals = [
  event.impact === 'high',                              // +30 points
  event.category === 'decision',                        // +20 points
  /\b(architecture|database|framework|API)\b/i.test(desc), // +30 points
  event.files.length > 3,                               // +10 points
  !recentADRs.some(adr => adr.tags.overlap(event.tags)) // +10 points
];
// Threshold: 60+ points = suggest ADR
```

**Unit Tests** (18 tests):
- Signal detection: each signal type
- Score calculation: various combinations
- Already documented check: matching tags
- Nudge history: track accepts/dismisses
- Learning: reduce frequency after 3 dismissals

**UAT Scenarios**:
- High-impact decision → Significance detected (score 80+)
- Low-impact fix → No nudge (score <60)
- Repeat topic → No re-nudge (already documented)
- Consistent dismissal → Reduce nudge frequency

**Files:**
- Create: `packages/cli/src/services/significance-detector.ts`
- Create: `packages/cli/test/unit/significance-detector.test.ts`

---

### TASK-8: ADR/PRD Nudging
**Status:** Not Started
**Effort:** 10-12 hours
**Priority:** HIGH

**Goal:** Suggest documentation at right moments

**Acceptance Criteria:**
- [ ] After high-significance event logged, show nudge
- [ ] Integrate with `ginko log` command (post-logging)
- [ ] Add `ginko adr create` command (AI-assisted, like charter)
- [ ] Add `ginko prd create` command (for feature planning)
- [ ] Nudge format: question + rationale + command + options
- [ ] Options: [Yes] [Not now] [Don't ask about this]
- [ ] Learn from dismissals (track per topic, reduce frequency)
- [ ] Respect mode (Hack & Ship nudges less, Full Planning nudges more)

**Nudge Display:**
```
💡 This looks like a significant architectural decision.
   Create ADR to capture rationale?

   Why ADRs matter:
   - Track charter drift over time
   - Explain deprecations and migrations
   - Enable team accountability

   Command: ginko adr create --title "Switch from Postgres to Neo4j"

   [Yes] [Not now] [Don't ask about this topic]
```

**Unit Tests** (20 tests):
- Nudge triggering: significance threshold
- Display formatting: all sections present
- Command generation: correct title/tags
- Option handling: Yes/No/Never
- Mode-aware frequency: Hack & Ship vs Full Planning
- Learning: adapt to user patterns

**UAT Scenarios**:
- Significant decision → Nudge appears
- User accepts → ADR creation flow starts
- User dismisses "Not now" → Tracked, may nudge again later
- User dismisses "Don't ask" → Tracked, never nudge this topic
- Mode: Hack & Ship → Fewer nudges, higher threshold

**Files:**
- Modify: `packages/cli/src/commands/log.ts`
- Create: `packages/cli/src/commands/adr.ts`
- Create: `packages/cli/src/commands/prd.ts`
- Create: `packages/cli/src/utils/nudging.ts`
- Create: `packages/cli/test/unit/nudging.test.ts`

---

### TASK-9: Charter Drift Detection
**Status:** Not Started
**Effort:** 8-10 hours
**Priority:** MEDIUM-HIGH

**Goal:** Warn when work diverges from charter

**Acceptance Criteria:**
- [ ] Analyze recent events vs charter goals
- [ ] Detect scope expansion (work outside charter scope)
- [ ] Detect goal abandonment (no progress on charter goals in 30d)
- [ ] Show drift warning in `ginko start`
- [ ] Suggest charter updates when appropriate
- [ ] Track charter versions (see evolution over time)

**Drift Detection Logic:**
```typescript
// Scope expansion: tags not in charter
const recentTags = getRecentEventTags(30days);
const charterTags = charter.goals.flatMap(g => g.tags);
const outOfScope = recentTags.filter(t => !charterTags.includes(t));

// Goal abandonment: no events matching goal tags
const goalProgress = charter.goals.map(goal => {
  const matchingEvents = events.filter(e =>
    e.tags.some(t => goal.tags.includes(t))
  );
  return { goal, events: matchingEvents, days: daysSinceLastEvent };
});
```

**Display Format:**
```
⚠️ Charter Drift Detected
   Recent work: Neo4j migration, GraphQL API, real-time sync
   Charter goals: Git-native context, <2s startup, team coordination

   Options:
   1. Update charter to reflect new direction: ginko charter --update
   2. Refocus on charter goals
   3. Create new milestone/phase

   [Update Charter] [Dismiss for 30d]
```

**Unit Tests** (16 tests):
- Scope detection: in-scope vs out-of-scope
- Goal progress: recent vs abandoned
- Drift threshold: minor vs significant
- Warning display: all sections
- Dismissal tracking: 30d cooldown

**UAT Scenarios**:
- Work aligned to charter → No drift warning
- Minor scope expansion → No warning (threshold not met)
- Major scope expansion → Drift warning with details
- Goal abandoned 45d → Warning suggests refocus or update
- User dismisses → No warning for 30d

**Files:**
- Create: `packages/cli/src/services/charter-drift-detector.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Create: `packages/cli/test/unit/charter-drift-detector.test.ts`

---

## Testing & Validation

### Unit Test Summary
**Total Tests**: 54 tests across 3 files
**Coverage Target**: >80%

### Human UAT Scenarios

#### UAT-11: Significant Decision Detection
- Log: "Switching from Postgres to Neo4j for graph queries"
- Category: decision, Impact: high, Files: 12
- Expected: Significance score 90+, nudge shown

#### UAT-12: ADR Nudge Acceptance
- Nudge shown → User selects [Yes]
- Expected: `ginko adr create` flow starts
- Expected: AI-assisted conversation
- Expected: ADR created with proper format
- Expected: Acceptance tracked (future nudges appropriate)

#### UAT-13: Nudge Dismissal Learning
- User dismisses "Neo4j" topic 3 times
- Expected: Future Neo4j decisions don't nudge
- Expected: Other architectural decisions still nudge
- Expected: User can re-enable via config

#### UAT-14: Charter Drift Warning
- Charter: Focus on git-native, <2s startup
- Recent work: Real-time sync, GraphQL, cloud-first
- Expected: Drift warning shown
- Expected: Suggestions clear (update or refocus)

#### UAT-15: Drift Dismissal
- User dismisses drift warning
- Expected: No warning for 30d
- Expected: After 30d, re-check and warn if still drifting
- Expected: Dismissal doesn't block work

---

## Milestones

### Milestone 1: Significance Detection (Day 3)
- ✓ SignificanceDetector working
- ✓ Scoring algorithm validated
- ✓ Nudge history tracking
- ✓ Unit tests passing (18/18)

### Milestone 2: ADR/PRD Nudging (Day 5)
- ✓ Nudging integrated with `ginko log`
- ✓ ADR/PRD creation commands working
- ✓ Learning from dismissals
- ✓ Unit tests passing (20/20)

### Milestone 3: Sprint Complete (Day 7)
- ✓ Charter drift detection working
- ✓ All tests passing (54/54)
- ✓ All UAT scenarios validated
- ✓ Nudge acceptance 60%+
- ✓ Foundation for team traceability

---

## Success Metrics

1. **Significance Accuracy**: 80%+ of high-score events are truly significant (UAT validation)
2. **Nudge Acceptance**: 60%+ acceptance rate
3. **Learning Effectiveness**: Dismissal rate decreases over time (adaptive)
4. **Charter Drift Accuracy**: 75%+ of drift warnings are valid
5. **Test Coverage**: >80% for all new code

---

## Related Documents

- **Epic**: [EPIC-001](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)
- **Previous**: [SPRINT-2026-01-A: Dynamic Adaptivity](./SPRINT-2026-01-A-dynamic-adaptivity.md)
- **Next**: [SPRINT-2026-02: Polish & Validation](./SPRINT-2026-02-polish-and-validation.md)

---

**Sprint Status**: Planning
**Last Updated**: 2025-11-19
**Progress**: 0% (0/3 tasks complete)
