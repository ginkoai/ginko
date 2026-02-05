---
epic_id: EPIC-018
status: proposed
created: 2026-02-05
updated: 2026-02-05
roadmap_lane: next
roadmap_status: not_started
tags: [flow-state, session-continuity, task-quality, inquiry, ai-ux, context]
---

# EPIC-018: Flow State Optimization

**Status:** Proposed
**Priority:** High
**Estimated Duration:** 3 sprints (4-5 weeks)
**Prerequisite:** None (can begin immediately)
**Related ADRs:** ADR-033, ADR-034, ADR-036, ADR-042, ADR-043

---

## Vision

Maximize developer flow state by eliminating friction at three critical points:
1. **Session start** - Instant resumption with rich context (not just status dashboards)
2. **Task start** - Clear intent without clarification cycles (3x5 story cards)
3. **Uncertainty moments** - Normalized inquiry at natural breakpoints (sprint-start investigation)

**North Star:** Back to productive work in 10 seconds, with zero ambiguity about what to do or why.

---

## Problem Statement

### Current State

Ginko has built sophisticated session continuity infrastructure (ADR-033, ADR-034, ADR-036, ADR-043), but gaps remain between design and experience:

1. **Session resumption is shallow** - `ginko start` shows status (sprint progress, task ID, branch) but not context (what was I doing? what decisions were made? where did I stop?)

2. **Tasks lack actionable content** - Task titles exist without problem statements, scope boundaries, approaches, or acceptance criteria. Human and AI partners must guess at intent or conduct clarification cycles.

3. **Inquiry feels like weakness** - Despite Manifesto Principle 10 ("Honest uncertainty, graceful recovery"), asking questions often feels like admitting incompetence rather than demonstrating thoughtfulness.

### The Flow State Tax

Every session currently pays a "flow state tax":

| Friction Point | Current Cost | Target |
|----------------|--------------|--------|
| Session start | 2-5 min context reconstruction | <10 seconds |
| Task start | 5-15 min clarification cycles | <1 minute |
| Uncertainty moments | Avoided (leading to wrong work) | Welcomed at sprint start |

**Combined:** 10-25 minutes of friction per session, repeated daily.

### User Stories

**As a developer resuming work**, I want to see exactly where I stopped and what decisions were made, so I can continue immediately without reconstructing context.

**As an AI partner starting a task**, I want to understand the problem, scope, approach, and done criteria, so I can work autonomously without repeated clarification.

**As a human or AI partner with uncertainty**, I want inquiry to be normalized and timed appropriately (sprint start), so asking questions is a strength, not a weakness.

---

## Solution: Three-Layer Flow Optimization

### Layer 1: Rich Session Resumption

Transform `ginko start` from status dashboard to resumption brief.

**Current output:**
```
Ready | Hot (10/10) | Think & Build
Sprint: Active Sprint 0%
Next up: adhoc_260204_s01_t01 - Dashboard settings (continue)
Branch: feature/dashboard-settings-projects (6 uncommitted files)
```

**Target output:**
```
Ready | Hot (10/10) | Think & Build

RESUMING: Dashboard settings - Teams to Projects rename
  Last session: Renamed settings panel, investigating API implications
  Stopping point: Checking if "team" appears in API responses
  Open question: Should we update member management terminology too?
  Files touched: src/dashboard/settings.tsx, src/components/TeamPanel.tsx

Sprint: Active Sprint 0% | Next: adhoc_260204_s01_t01
Branch: feature/dashboard-settings-projects (6 uncommitted)
```

### Layer 2: Rich Task Content (3x5 Story Cards)

Ensure every task has actionable content, not just a title.

**Current task:**
```
adhoc_260204_s01_t01 - Dashboard settings: rename Teams to Projects
```

**Target task:**
```
adhoc_260204_s01_t01 - Dashboard settings: rename Teams to Projects

PROBLEM: "Teams" terminology confuses users who expect projects, not
         collaborative groups. Causes onboarding friction.

SCOPE:
  Includes: Dashboard UI labels, settings panel, member management
  Excludes: Database schema, API endpoint names (just display)

APPROACH: Find/replace "team" with "project" in dashboard components,
          verify no breaking changes to data layer.

DONE WHEN:
  [ ] No "Teams" visible in dashboard settings
  [ ] Existing data displays correctly as "Projects"
  [ ] Tests pass, no API breaking changes
```

### Layer 3: Sprint-Start Investigation (Normalized Inquiry)

Establish sprint start as the natural time for inquiry and clarification.

**Pattern:**
1. Epic creation uses best-effort task descriptions (acceptable ambiguity)
2. Sprint START triggers investigation phase (1-2 hours)
3. AI and human collaborate to resolve ambiguities, make choices, update tasks
4. Work proceeds with clarity

**Culture shift:**
- Inquiry at sprint start = thoughtfulness
- Inquiry mid-task = acceptable but less efficient
- Avoiding inquiry = risk of wasted work

---

## Success Criteria

### Sprint 1: Session Resumption
- [ ] `ginko start` displays resumption brief (last session summary, stopping point, open questions)
- [ ] Recent events (last 25) fetched from graph and synthesized
- [ ] Files touched in last session visible
- [ ] Context load time <2 seconds

### Sprint 2: Task Content Quality
- [ ] Task creation prompts for problem/scope/approach/done criteria
- [ ] Existing thin tasks flagged for enrichment at sprint start
- [ ] `ginko task show <id>` displays full 3x5 card format
- [ ] AI partner can work from task alone without clarification

### Sprint 3: Sprint-Start Investigation
- [ ] `ginko sprint start` includes investigation prompt
- [ ] CLAUDE.md updated with sprint-start inquiry protocol
- [ ] Uncertainty indicator added to AI responses (confidence level)
- [ ] Documentation reflects inquiry-as-strength culture

---

## Sprint Plan

### Sprint 1: Session Resumption Brief (1.5 weeks)

**Goal:** Transform `ginko start` from status dashboard to resumption context.

**Problem:** Developers see WHERE they are but not WHAT they were doing or WHY. Context reconstruction takes 2-5 minutes instead of 10 seconds.

**Tasks:**

| ID | Task | Problem | Scope | Done When |
|----|------|---------|-------|-----------|
| e018_s01_t01 | Implement resumption brief synthesis | `ginko start` shows status but not context | Fetch last 25 events, synthesize into brief | Brief displays: last session summary, stopping point, open questions |
| e018_s01_t02 | Add files-touched tracking | No visibility into what files were edited last session | Track file references from events | Files touched list visible in resumption brief |
| e018_s01_t03 | Surface open questions from events | Questions/decisions from last session aren't visible | Parse decision/insight events for open items | Open questions displayed prominently |
| e018_s01_t04 | Optimize context load performance | Context loading must be fast to preserve flow | Cache, parallelize, limit depth | Context loads in <2 seconds |
| e018_s01_t05 | Clarify ADR architecture status | ADR-043 (event stream) vs current reality unclear | Review ADRs, mark deprecated/superseded | ADR status clear, CLAUDE.md updated |

### Sprint 2: Task Content Quality (1.5 weeks)

**Goal:** Every task has enough content for autonomous work.

**Problem:** Task titles alone require clarification cycles. Human and AI partners guess at intent, leading to wrong work or wasted time.

**Tasks:**

| ID | Task | Problem | Scope | Done When |
|----|------|---------|-------|-----------|
| e018_s02_t01 | Define task content schema | No standard for what tasks should contain | Create TypeScript interface, document in ADR | Schema defined: problem, scope, approach, done criteria |
| e018_s02_t02 | Update task creation flow | Tasks created without content prompts | Modify `ginko task create` and sprint planning | Creator prompted for problem/scope/approach/done |
| e018_s02_t03 | Add task content validation | Thin tasks slip through | Warn on thin tasks, flag for enrichment | Thin tasks flagged, warnings displayed |
| e018_s02_t04 | Implement `ginko task show` rich view | No way to see full task context | Create detailed task display | Full 3x5 card format visible |
| e018_s02_t05 | AI task creation protocol | AI creates thin tasks during planning | Update CLAUDE.md with task content requirements | AI creates rich tasks by default |

### Sprint 3: Sprint-Start Investigation (1 week)

**Goal:** Normalize inquiry at sprint start as a strength.

**Problem:** Questions feel like weakness. Uncertainty avoided rather than surfaced. Results in wrong work, rework, frustration.

**Tasks:**

| ID | Task | Problem | Scope | Done When |
|----|------|---------|-------|-----------|
| e018_s03_t01 | Add investigation phase to sprint start | No structured time for clarification | Modify `ginko sprint start` workflow | Investigation prompt shown, time allocated |
| e018_s03_t02 | Update CLAUDE.md inquiry protocol | No explicit permission for AI to express uncertainty | Add confidence indicators, inquiry norms | AI states confidence, asks questions freely |
| e018_s03_t03 | Add confidence indicator to responses | Uncertainty hidden rather than surfaced | Define confidence levels, display format | AI responses include confidence level when <80% |
| e018_s03_t04 | Document inquiry culture | Culture not explicitly defined | Update AI-UX-MANIFESTO, CLAUDE.md | Inquiry-as-strength documented, examples provided |
| e018_s03_t05 | Thin task enrichment at sprint start | Existing thin tasks not addressed | Flag thin tasks, prompt for enrichment | Sprint start surfaces thin tasks for enrichment |

---

## Technical Architecture

### Resumption Brief Synthesis

```typescript
interface ResumptionBrief {
  lastSession: {
    summary: string;           // "Renamed settings panel, investigating API"
    stoppingPoint: string;     // "Checking if 'team' appears in API responses"
    openQuestions: string[];   // ["Should we update member management too?"]
    filesModified: string[];   // ["src/dashboard/settings.tsx"]
    duration: string;          // "2h 15m"
  };
  decisions: Array<{
    description: string;
    timestamp: Date;
  }>;
  insights: Array<{
    description: string;
    timestamp: Date;
  }>;
  synthesizedAt: Date;
  eventCount: number;
}

async function synthesizeResumptionBrief(
  events: Event[],
  limit: number = 25
): Promise<ResumptionBrief> {
  // Extract stopping point from most recent non-git event
  // Collect open questions from decision events marked uncertain
  // Gather files from event file references
  // Summarize session arc
}
```

### Task Content Schema

```typescript
interface TaskContent {
  id: string;
  title: string;                    // One-line summary

  // Required for rich tasks (3x5 card)
  problem: string;                  // WHY this task exists
  scope: {
    includes: string[];             // What's in scope
    excludes: string[];             // What's explicitly out
  };
  approach: string;                 // HOW we'll solve it
  acceptanceCriteria: string[];     // Definition of done

  // Metadata
  complexity: 'small' | 'medium' | 'large';
  contentQuality: 'thin' | 'adequate' | 'rich';

  // Enrichment tracking
  enrichedAt?: Date;
  enrichedBy?: string;
}

function assessTaskQuality(task: TaskContent): 'thin' | 'adequate' | 'rich' {
  const hasContent = (s: string) => s && s.length > 20;

  if (!hasContent(task.problem)) return 'thin';
  if (task.scope.includes.length === 0) return 'thin';
  if (task.acceptanceCriteria.length === 0) return 'thin';

  if (!hasContent(task.approach)) return 'adequate';
  if (task.scope.excludes.length === 0) return 'adequate';

  return 'rich';
}
```

### Sprint-Start Investigation Flow

```typescript
async function startSprint(sprintId: string): Promise<void> {
  const sprint = await getSprint(sprintId);
  const thinTasks = sprint.tasks.filter(
    t => assessTaskQuality(t) === 'thin'
  );

  if (thinTasks.length > 0) {
    console.log(`
Sprint has ${thinTasks.length} tasks that need enrichment:
${thinTasks.map(t => `  - ${t.id}: ${t.title}`).join('\n')}

INVESTIGATION PHASE
This is the time to clarify ambiguities and make choices.
Questions now = thoughtfulness, not weakness.

Would you like to:
[1] Enrich tasks now (recommended)
[2] Proceed with thin tasks (will need clarification later)
[3] Review sprint goals first
    `);
  }
}
```

### Confidence Indicator Protocol

```markdown
## CLAUDE.md Addition: Confidence Indicators

When responding, include confidence level for non-trivial decisions:

**High confidence (80%+):** Proceed without indicator
**Medium confidence (50-80%):** State explicitly
**Low confidence (<50%):** Ask before proceeding

Example format:
> **Approach** (confidence: medium)
> I'll rename "Teams" to "Projects" in the dashboard.
>
> **Uncertainties:**
> - Not sure if "team" appears in API responses
> - Should member management terminology change too?
>
> **Before proceeding, can you clarify:**
> - Are there external integrations referencing "team"?

This surfaces uncertainty as a strength, enabling correction before work.
```

---

## Dependencies

- **None blocking** - Can begin immediately
- **Benefits from:** EPIC-015 (Graph-Authoritative State) - ensures events are in graph
- **Enhances:** EPIC-016 (Personal Workstreams) - richer task context for personal view

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event stream not fully implemented | Can't synthesize from events | Fallback to local session logs, prioritize ADR-043 implementation |
| Task enrichment slows planning | Resistance to adding content | Make enrichment fast (AI-assisted), defer to sprint start |
| Confidence indicators feel bureaucratic | Developers disable feature | Make optional, show value through better outcomes |
| Culture change takes time | Inquiry still feels like weakness | Lead by example, celebrate good questions |

---

## Out of Scope

- Full ADR-043 event stream implementation (that's infrastructure work)
- Cross-team visibility of uncertainty/questions
- Automated task enrichment from codebase analysis
- Historical session replay (future feature)

---

## Connection to AI-UX Manifesto

This epic directly implements several manifesto principles:

| Principle | Implementation |
|-----------|----------------|
| **1. Purpose before features** | Task content includes WHY (problem statement) |
| **4. Strategic context, surfaced automatically** | Resumption brief surfaces context at start |
| **9. Continuous learning capture** | Events captured in flow, synthesized at start |
| **10. Honest uncertainty, graceful recovery** | Confidence indicators, sprint-start investigation |
| **11. Flow state for both partners** | 10-second resumption, zero clarification cycles |

---

## References

- [ADR-033: Context Pressure Mitigation](../adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-034: Event-Based Defensive Logging](../adr/ADR-034-event-based-defensive-logging-architecture.md)
- [ADR-036: Session Synthesis Architecture](../adr/ADR-036-session-synthesis-architecture.md)
- [ADR-042: AI-Assisted Knowledge Graph Quality](../adr/ADR-042-ai-assisted-knowledge-graph-quality.md)
- [ADR-043: Event Stream Session Model](../adr/ADR-043-event-stream-session-model.md)
- [AI-UX Manifesto](../AI-UX-MANIFESTO.md)

---

## Key Insight

**Inquiry timing matters as much as inquiry permission.**

Epic creation can use best-effort descriptions (acceptable ambiguity). Sprint start is the natural moment for investigation - when context is fresh, stakes are clear, and questions lead to better work rather than blocked progress.

The shift: From "ask questions when stuck" to "investigate at sprint start by design."

This transforms inquiry from reactive (problem) to proactive (strength).

---

## Addendum: Implementation Insights (2026-02-05)

Based on codebase exploration and AI partner feedback, the following implementation details were identified:

### 1. Auto-Logging Gap

**Finding:** The event logging infrastructure exists (`event-logger.ts`, `event-queue.ts`) but CLAUDE.md lacks reflexes that prompt the AI to log events.

**Current reflexes** (none trigger logging):
- "Why Am I Doing This?" - traces purpose, no logging
- "Have We Done This Before?" - recalls patterns, no logging
- "Something Feels Off" - seeks clarification, no logging
- "Update My Understanding" - notes learnings, **should log insights**
- "Track This Work" - creates ad-hoc tasks, no event logging

**Required addition to CLAUDE.md:**

```markdown
### 6. "Log This For Next Session" Reflex 📝 (ADR-043)
**Trigger**: After decisions, gotchas, task completions, or blockers
**Action**: Run `ginko log "<description>" --category=<type>`

| Moment | Category | Example |
|--------|----------|---------|
| Decision made | decision | `ginko log "Chose batch size 10 for payload limits" --category=decision` |
| Gotcha found | insight | `ginko log "Vercel has 4.5MB body limit" --category=insight --impact=high` |
| Task complete | achievement | `ginko log "Dashboard rename complete" --category=achievement` |
| Blocker hit | insight | `ginko log "Auth token expired" --category=insight` |

**Quality bar:** Would this help my successor avoid confusion?
```

### 2. Output Format: Clean Slate

**Finding:** Current `ginko start` uses box-drawing tables that are hard to scan quickly.

**Proposed format** (simple label: value, <15 lines):

```
ginko | Hot (10/10) | Think & Build | feature/dashboard-settings

RESUME: Dashboard settings - Teams to Projects rename
  Stopped at: Checking if "team" appears in API responses
  Open: Should member management terminology change?
  Files: src/dashboard/settings.tsx, src/components/TeamPanel.tsx

Sprint: adhoc_260204_s01 | 0% | 6 tasks
  Next: t01 - Dashboard settings: rename Teams to Projects (continue)

Branch: 6 uncommitted | Tests: passing
```

### 3. GraphQL Optimization

**Finding:** CLI makes 4-5 sequential REST calls. Dashboard has GraphQL API but CLI doesn't use it.

**Opportunity:** Single GraphQL query for session start:

```graphql
query SessionStart($userId: String!, $graphId: String!) {
  activeSprint(graphId: $graphId) {
    id, name, progress
    currentTask { id, title, patterns, gotchas, constraints }
    tasks { id, title, status }
  }
  recentEvents(userId: $userId, limit: 25) {
    id, category, description, timestamp, files
  }
  charter { purpose, goals }
  teamActivity(days: 7) { category, description, user }
}
```

**Expected improvement:** 4-5 calls (~3s) → 1 call (<1s)

### 4. Context Scoring Feedback Loop

**Finding:** The AI that ingests context can score its quality, creating a feedback loop for synthesis improvement.

**Proposed reflex:**

```markdown
### 7. "Score My Context" Reflex 📊 (Feedback Loop)
**Trigger**: Within 60 seconds of session start
**Behavior**: Self-assess readiness to work

| Dimension | Question | Score |
|-----------|----------|-------|
| Direction | "Do I know what to do next?" | 0-10 |
| Intent | "Do I understand WHY?" | 0-10 |
| Location | "Do I know WHERE to start?" | 0-10 |
| History | "Do I know WHAT was decided?" | 0-10 |

**Action**: Log score to graph for aggregation
```

**Closing the loop:**
| Low Score Area | Synthesis Improvement |
|----------------|----------------------|
| Direction low | Add explicit "Next action" to brief |
| Intent low | Improve task problem statements |
| Location low | Always include files touched |
| History low | Auto-surface last 3 decisions |

---

## Updated Sprint Plan

### Sprint 1 Additional Tasks

| ID | Task | Done When |
|----|------|-----------|
| e018_s01_t06 | Add "Log This" reflex to CLAUDE.md | Reflex documented with trigger/action/examples |
| e018_s01_t07 | Implement clean slate output format | `ginko start` uses label:value format, <15 lines |
| e018_s01_t08 | Add GraphQL session-start endpoint | Single query returns all context data |
| e018_s01_t09 | Add context quality scoring | AI logs direction/intent/location/history scores |

### ADR Status Clarification

| ADR | Current Status | Recommendation |
|-----|----------------|----------------|
| ADR-033 | Partially superseded | Mark: core insight valid, pressure measurement removed |
| ADR-034 | Active | Event-based triggers still valid |
| ADR-036 | Active | Synthesis at start, handoff retired |
| ADR-042 | Active | Typed relationships, AI-assisted quality |
| ADR-043 | Proposed/Partial | Mark as target architecture, note partial implementation |
